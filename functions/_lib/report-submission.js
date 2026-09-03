import { createReportFingerprint } from "../../lib/duplicate.js";
import { postingDecision } from "../../lib/posting.js";
import { acquisitionTypeOf } from "../../lib/report-policy.js";
import { assessReportRisk } from "../../lib/risk.js";
import { REPORT_LIMITS, todayInJapan, validateReportPayload } from "../../lib/validation.js";
import { optionalFirebaseUser } from "./firebase-auth.js";
import { apiError, json, unavailable } from "./http.js";
import { abuseHashPeriod, createInternalUserId, createNetworkHash, isSameOrigin } from "./security.js";
import { verifyTurnstile } from "./turnstile.js";

const RETENTION_DAYS = 30;

function activeAggregateStatements(env, payload, createdAt, totalPrizeCount) {
  const statements = [
    env.DB.prepare(`
      INSERT INTO store_campaign_stats (store_id, campaign_id, report_count, total_panel_draws, total_panel_wins, total_mobile_draws, total_mobile_wins, total_prize_count, total_unknown_prizes, updated_at)
      VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(store_id, campaign_id) DO UPDATE SET
        report_count = report_count + 1,
        total_panel_draws = total_panel_draws + excluded.total_panel_draws,
        total_panel_wins = total_panel_wins + excluded.total_panel_wins,
        total_mobile_draws = total_mobile_draws + excluded.total_mobile_draws,
        total_mobile_wins = total_mobile_wins + excluded.total_mobile_wins,
        total_prize_count = total_prize_count + excluded.total_prize_count,
        total_unknown_prizes = total_unknown_prizes + excluded.total_unknown_prizes,
        updated_at = excluded.updated_at
    `).bind(payload.storeId, payload.campaignId, payload.panelDraws, payload.panelWins, payload.mobileDraws, payload.mobileWins, totalPrizeCount, payload.unknownPrizeCount, createdAt),
    env.DB.prepare(`
      INSERT INTO store_campaign_usage_stats (store_id, campaign_id, usage_type, report_count, total_panel_draws, total_panel_wins, total_mobile_draws, total_mobile_wins, updated_at)
      VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)
      ON CONFLICT(store_id, campaign_id, usage_type) DO UPDATE SET
        report_count = report_count + 1,
        total_panel_draws = total_panel_draws + excluded.total_panel_draws,
        total_panel_wins = total_panel_wins + excluded.total_panel_wins,
        total_mobile_draws = total_mobile_draws + excluded.total_mobile_draws,
        total_mobile_wins = total_mobile_wins + excluded.total_mobile_wins,
        updated_at = excluded.updated_at
    `).bind(payload.storeId, payload.campaignId, payload.usageType, payload.panelDraws, payload.panelWins, payload.mobileDraws, payload.mobileWins, createdAt),
  ];
  if (payload.prizeBreakdownStatus === "complete") {
    for (const prize of payload.prizes.filter((item) => item.quantity > 0 && acquisitionTypeOf(item) === "draw")) {
      statements.push(env.DB.prepare(`
        INSERT INTO store_campaign_prize_stats (store_id, campaign_id, prize_category_id, reported_quantity, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(store_id, campaign_id, prize_category_id) DO UPDATE SET
          reported_quantity = reported_quantity + excluded.reported_quantity,
          updated_at = excluded.updated_at
      `).bind(payload.storeId, payload.campaignId, prize.prizeCategoryId, prize.quantity, createdAt));
    }
  }
  return statements;
}

function reportInsertStatements({ env, payload, identity, risk, reportId, createdAt, nowSeconds, fingerprint, slot }) {
  const totalPrizeCount = payload.prizes.filter((prize) => acquisitionTypeOf(prize) === "draw").reduce((sum, prize) => sum + prize.quantity, payload.unknownPrizeCount);
  const statements = [];
  if (identity.userId) {
    statements.push(env.DB.prepare(`
      INSERT INTO users (id, status, created_at, last_seen_at)
      VALUES (?, 'active', ?, ?)
      ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at
    `).bind(identity.userId, createdAt, createdAt));
  }
  statements.push(env.DB.prepare(`
    INSERT INTO reports (
      id, source_type, store_id, campaign_id, visit_date, usage_type, panel_draws, panel_wins,
      mobile_draws, mobile_wins, unknown_prize_count, status, created_at,
      prize_breakdown_status, user_id, daily_rate_hash, abuse_hash, risk_score, risk_reasons
    ) VALUES (?, 'user', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    reportId, payload.storeId, payload.campaignId, payload.visitDate, payload.usageType,
    payload.panelDraws, payload.panelWins, payload.mobileDraws, payload.mobileWins,
    payload.unknownPrizeCount, risk.status, createdAt, payload.prizeBreakdownStatus,
    identity.userId, identity.dailyRateHash, identity.abuseHash, risk.score, JSON.stringify(risk.reasons),
  ));
  for (const prize of payload.prizes.filter((item) => item.quantity > 0)) {
    const acquisitionType = acquisitionTypeOf(prize);
    statements.push(acquisitionType === "draw"
      ? env.DB.prepare("INSERT INTO report_prizes (report_id, prize_category_id, quantity) VALUES (?, ?, ?)").bind(reportId, prize.prizeCategoryId, prize.quantity)
      : env.DB.prepare("INSERT INTO report_guaranteed_prizes (report_id, prize_category_id, quantity) VALUES (?, ?, ?)").bind(reportId, prize.prizeCategoryId, prize.quantity));
  }
  for (const breakdown of payload.itemBreakdowns ?? []) {
    if (breakdown.status === "unknown") continue;
    const acquisitionType = acquisitionTypeOf(breakdown);
    statements.push(acquisitionType === "draw"
      ? env.DB.prepare("INSERT INTO report_prize_item_breakdowns (report_id, prize_category_id, status) VALUES (?, ?, ?)").bind(reportId, breakdown.prizeCategoryId, breakdown.status)
      : env.DB.prepare("INSERT INTO report_guaranteed_item_breakdowns (report_id, prize_category_id, status) VALUES (?, ?, ?)").bind(reportId, breakdown.prizeCategoryId, breakdown.status));
    for (const item of breakdown.items.filter((entry) => entry.quantity > 0)) {
      statements.push(acquisitionType === "draw"
        ? env.DB.prepare("INSERT INTO report_prize_items (report_id, prize_category_id, prize_item_id, quantity) VALUES (?, ?, ?, ?)").bind(reportId, breakdown.prizeCategoryId, item.prizeItemId, item.quantity)
        : env.DB.prepare("INSERT INTO report_guaranteed_items (report_id, prize_category_id, prize_item_id, quantity) VALUES (?, ?, ?, ?)").bind(reportId, breakdown.prizeCategoryId, item.prizeItemId, item.quantity));
    }
  }
  statements.push(
    env.DB.prepare("INSERT INTO report_fingerprints (fingerprint, report_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .bind(fingerprint, reportId, nowSeconds + REPORT_LIMITS.duplicateWindowSeconds, createdAt),
    env.DB.prepare("INSERT INTO daily_submission_slots (actor_hash, local_date, slot, report_id, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(identity.actorHash, identity.localDate, slot, reportId, createdAt),
  );
  if (risk.status === "active") statements.push(...activeAggregateStatements(env, payload, createdAt, totalPrizeCount));
  return statements;
}

export async function resolveIdentity(request, env, now) {
  let firebaseUser;
  try { firebaseUser = await optionalFirebaseUser(request, env); }
  catch (error) {
    if (error.status === 401) return { error: apiError(error.message, 401) };
    throw error;
  }
  if (firebaseUser && !env.USER_ID_SECRET) return { error: apiError("ログイン投稿の設定が完了していません。匿名投稿をご利用ください。", 503) };
  const localDate = todayInJapan(now);
  const abuseSalt = env.ABUSE_HASH_SALT ?? env.RATE_LIMIT_SALT;
  if (!abuseSalt) return { error: apiError("投稿機能の設定が完了していません。", 503) };
  const [userId, dailyNetworkHash, abuseHash] = await Promise.all([
    firebaseUser ? createInternalUserId(firebaseUser.uid, env.USER_ID_SECRET) : null,
    createNetworkHash(request, abuseSalt, `daily:${localDate}`),
    createNetworkHash(request, abuseSalt, `abuse:${abuseHashPeriod(now)}`),
  ]);
  return {
    authenticated: Boolean(userId),
    userId,
    localDate,
    dailyRateHash: userId ? `user:${userId}` : dailyNetworkHash,
    actorHash: userId ? `user:${userId}` : `anonymous:${dailyNetworkHash}`,
    abuseHash,
  };
}

async function reportContext(env, payload) {
  const [store, campaign, prizeRows, itemRows] = await Promise.all([
    env.DB.prepare("SELECT id FROM stores WHERE id = ? AND active = 1").bind(payload.storeId ?? "").first(),
    env.DB.prepare("SELECT id, starts_on, ends_on FROM campaigns WHERE id = ? AND published = 1").bind(payload.campaignId ?? "").first(),
    env.DB.prepare("SELECT id FROM prize_categories WHERE campaign_id = ? AND active = 1").bind(payload.campaignId ?? "").all(),
    env.DB.prepare("SELECT id, prize_category_id FROM prize_items WHERE campaign_id = ? AND active = 1").bind(payload.campaignId ?? "").all(),
  ]);
  return {
    storeIds: new Set(store ? [store.id] : []),
    campaign: campaign ? { id: campaign.id, startsOn: campaign.starts_on, endsOn: campaign.ends_on } : null,
    prizeCategoryIds: new Set(prizeRows.results.map((row) => row.id)),
    prizeItems: new Map(itemRows.results.map((row) => [row.id, { prizeCategoryId: row.prize_category_id }])),
    today: todayInJapan(),
  };
}

export async function handleReportPost({ request, env }) {
  try {
    if (!isSameOrigin(request)) return apiError("送信元を確認できませんでした。", 403);
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return apiError("JSON形式で送信してください。", 415);
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > REPORT_LIMITS.maxBodyBytes) return apiError("送信データが大きすぎます。", 413);
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > REPORT_LIMITS.maxBodyBytes) return apiError("送信データが大きすぎます。", 413);
    let payload;
    try { payload = JSON.parse(rawBody); } catch { return apiError("投稿データの形式が正しくありません。", 400); }

    const validationErrors = validateReportPayload(payload, await reportContext(env, payload));
    if (validationErrors.length) return json({ error: "入力内容を確認してください。", errors: validationErrors }, { status: 422, headers: { "Cache-Control": "no-store" } });
    const turnstile = await verifyTurnstile(payload.turnstileToken, env.TURNSTILE_SECRET_KEY, request.headers.get("CF-Connecting-IP"));
    if (!turnstile.success) return apiError("投稿確認に失敗しました。ページを再読み込みしてお試しください。", 403);

    const now = new Date();
    const nowSeconds = Math.floor(now.getTime() / 1000);
    const createdAt = now.toISOString();
    const identity = await resolveIdentity(request, env, now);
    if (identity.error) return identity.error;
    const user = identity.userId ? await env.DB.prepare("SELECT status FROM users WHERE id = ?").bind(identity.userId).first() : null;
    const userStatus = user?.status ?? "active";
    const retentionCutoff = new Date(now.getTime() - RETENTION_DAYS * 86_400_000).toISOString();
    const slotCutoff = todayInJapan(new Date(now.getTime() - 35 * 86_400_000));
    await env.DB.batch([
      env.DB.prepare("DELETE FROM report_fingerprints WHERE expires_at <= ?").bind(nowSeconds),
      env.DB.prepare("DELETE FROM daily_submission_slots WHERE local_date < ?").bind(slotCutoff),
      env.DB.prepare("UPDATE reports SET daily_rate_hash = NULL, abuse_hash = NULL WHERE created_at < ? AND (daily_rate_hash IS NOT NULL OR abuse_hash IS NOT NULL)").bind(retentionCutoff),
    ]);

    const fingerprint = await createReportFingerprint(identity.userId ?? identity.abuseHash, payload);
    const oneHourAgo = new Date(now.getTime() - 3_600_000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
    const [duplicate, sameStoreRecent, recentAbuse] = await Promise.all([
      env.DB.prepare("SELECT report_id FROM report_fingerprints WHERE fingerprint = ? AND expires_at > ?").bind(fingerprint, nowSeconds).first(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM reports WHERE abuse_hash = ? AND store_id = ? AND created_at >= ?").bind(identity.abuseHash, payload.storeId, oneHourAgo).first(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM reports WHERE abuse_hash = ? AND created_at >= ?").bind(identity.abuseHash, sevenDaysAgo).first(),
    ]);
    if (duplicate) return apiError("同じ内容の投稿がすでに送信されています。時間を空けてお試しください。", 409);
    const risk = assessReportRisk(payload, { sameStoreRecentCount: sameStoreRecent?.count, recentAbuseCount: recentAbuse?.count });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const usage = await env.DB.prepare("SELECT COUNT(*) AS count, COALESCE(MAX(slot), 0) AS max_slot FROM daily_submission_slots WHERE actor_hash = ? AND local_date = ?")
        .bind(identity.actorHash, identity.localDate).first();
      const usedToday = Number(usage?.count ?? 0);
      const decision = postingDecision({ authenticated: identity.authenticated, userStatus, usedToday });
      if (!decision.allowed) return json({ error: decision.message, posting: decision }, { status: decision.status, headers: { "Cache-Control": "no-store" } });
      const reportId = crypto.randomUUID();
      try {
        await env.DB.batch(reportInsertStatements({ env, payload, identity, risk, reportId, createdAt, nowSeconds, fingerprint, slot: Number(usage?.max_slot ?? 0) + 1 }));
        return json({
          id: reportId,
          status: risk.status,
          posting: { authenticated: identity.authenticated, dailyLimit: decision.dailyLimit, usedToday: usedToday + 1, remainingToday: decision.remainingToday - 1 },
        }, { status: 201, headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        const message = String(error);
        if (message.includes("banned-user")) return apiError("このアカウントからは現在投稿できません。", 403);
        if (message.includes("report_fingerprints")) return apiError("同じ内容の投稿がすでに送信されています。時間を空けてお試しください。", 409);
        if (message.includes("daily_submission_slots") && attempt === 0) continue;
        if (message.includes("daily_submission_slots")) return apiError("同時に投稿が行われました。もう一度お試しください。", 409);
        throw error;
      }
    }
    return apiError("投稿を受け付けられませんでした。", 409);
  } catch (error) { return unavailable(error); }
}
