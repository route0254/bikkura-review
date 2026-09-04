import { apiError, json, unavailable } from "../_lib/http.js";
import { resolveIdentity } from "../_lib/report-submission.js";
import { isSameOrigin } from "../_lib/security.js";
import { verifyTurnstile } from "../_lib/turnstile.js";
import { postingDecision } from "../../lib/posting.js";
import { benefitFingerprint, validateBenefit } from "../../lib/benefits.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!isSameOrigin(request)) return apiError("このサイトから投稿してください。", 403);
    if (!request.headers.get("Content-Type")?.includes("application/json")) return apiError("JSONで送信してください。", 415);
    if (Number(request.headers.get("Content-Length")) > 4096) return apiError("投稿が大きすぎます。", 413);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 4096) return apiError("投稿が大きすぎます。", 413);
    let payload;
    try { payload = JSON.parse(raw); } catch { return apiError("投稿データが不正です。"); }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return apiError("投稿データが不正です。");
    const now = new Date();
    const [store, benefit] = await Promise.all([
      env.DB.prepare("SELECT id FROM stores WHERE id = ? AND active = 1").bind(typeof payload.storeId === "string" ? payload.storeId : "").first(),
      env.DB.prepare(`SELECT b.id, b.starts_on, COALESCE(b.ends_on, c.ends_on) AS ends_on
        FROM benefit_campaigns b JOIN campaigns c ON c.id = b.campaign_id AND c.published = 1
        WHERE b.id = ? AND b.active = 1`).bind(typeof payload.benefitId === "string" ? payload.benefitId : "").first(),
    ]);
    const errors = validateBenefit(payload, benefit && { id: benefit.id, startsOn: benefit.starts_on, endsOn: benefit.ends_on }, now);
    if (!store) errors.push("店舗を選択してください。");
    if (errors.length) return apiError(errors.join(" "));
    const turnstile = await verifyTurnstile(payload.turnstileToken, env.TURNSTILE_SECRET_KEY, request.headers.get("CF-Connecting-IP"));
    if (!turnstile.success || (turnstile.action && turnstile.action !== "benefit_submit")) return json({ code: "turnstile_failed", error: "投稿確認を更新しました。確認後にもう一度お試しください。" }, { status: 403, headers: { "Cache-Control": "no-store" } });
    const identity = await resolveIdentity(request, env, now);
    if (identity.error) return identity.error;
    const actor = `benefit:${identity.actorHash}`;
    const seconds = Math.floor(now.getTime() / 1000);
    const fingerprint = await benefitFingerprint(identity.userId ?? identity.abuseHash, payload);
    const retentionDate = new Date(now.getTime() - 35 * 86400_000).toISOString().slice(0, 10);
    const hashRetention = new Date(now.getTime() - 30 * 86400_000).toISOString();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM benefit_fingerprints WHERE expires_at <= ?").bind(seconds),
      env.DB.prepare("DELETE FROM benefit_submission_slots WHERE local_date < ?").bind(retentionDate),
      env.DB.prepare("UPDATE benefit_reports SET daily_rate_hash = NULL, abuse_hash = NULL WHERE created_at < ? AND (daily_rate_hash IS NOT NULL OR abuse_hash IS NOT NULL)").bind(hashRetention),
    ]);
    for (let attempt = 0; attempt < 2; attempt++) {
      const user = identity.userId ? await env.DB.prepare("SELECT status FROM users WHERE id = ?").bind(identity.userId).first() : null;
      const count = await env.DB.prepare("SELECT COUNT(*) AS used, COALESCE(MAX(slot), 0) AS last FROM benefit_submission_slots WHERE actor_hash = ? AND local_date = ?").bind(actor, identity.localDate).first();
      const decision = postingDecision({ authenticated: identity.authenticated, userStatus: user?.status ?? "active", usedToday: Number(count?.used ?? 0) });
      if (!decision.allowed) return apiError(decision.message, decision.status);
      const id = crypto.randomUUID();
      const statements = [];
      if (identity.userId) statements.push(env.DB.prepare(`INSERT INTO users(id,status,created_at,last_seen_at) VALUES(?,'active',?,?) ON CONFLICT(id) DO UPDATE SET last_seen_at=excluded.last_seen_at`).bind(identity.userId, now.toISOString(), now.toISOString()));
      // restrictedユーザーは通常投稿と同様に公開前の確認へ回す。
      const status = user?.status === "restricted" ? "pending" : "active";
      statements.push(
        env.DB.prepare(`INSERT INTO benefit_reports(id,store_id,benefit_id,observed_at,availability,status,user_id,daily_rate_hash,abuse_hash,created_at,received_quantity) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(id, store.id, benefit.id, payload.observedAt, payload.availability, status, identity.userId, identity.dailyRateHash, identity.abuseHash, now.toISOString(), payload.receivedQuantity ?? null),
        env.DB.prepare("INSERT INTO benefit_fingerprints(fingerprint,report_id,expires_at) VALUES(?,?,?)").bind(fingerprint, id, seconds + 3600),
        env.DB.prepare("INSERT INTO benefit_submission_slots(actor_hash,local_date,slot,report_id,created_at) VALUES(?,?,?,?,?)").bind(actor, identity.localDate, Number(count?.last ?? 0) + 1, id, now.toISOString()),
      );
      try {
        await env.DB.batch(statements);
        return json({ id, status, remainingToday: decision.remainingToday - 1 }, { status: 201, headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        const message = String(error?.message ?? error);
        if (message.includes("banned-user")) return apiError("このアカウントからは投稿できません。", 403);
        if (message.includes("benefit_fingerprints")) return apiError("同じ店舗・特典には1時間に1件まで投稿できます。", 409);
        if (message.includes("benefit_submission_slots") && attempt === 0) continue;
        if (message.includes("benefit_submission_slots")) return apiError("投稿が重なりました。少し待ってお試しください。", 409);
        throw error;
      }
    }
  } catch (error) { return unavailable(error); }
}
