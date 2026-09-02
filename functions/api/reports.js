import { REPORT_LIMITS, todayInJapan, validateReportPayload } from "../../lib/validation.js";
import { apiError, json, unavailable } from "../_lib/http.js";
import { createVisitorHash, isSameOrigin } from "../_lib/security.js";
import { verifyTurnstile } from "../_lib/turnstile.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!isSameOrigin(request)) return apiError("送信元を確認できませんでした。", 403);
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return apiError("JSON形式で送信してください。", 415);
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > REPORT_LIMITS.maxBodyBytes) return apiError("送信データが大きすぎます。", 413);
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > REPORT_LIMITS.maxBodyBytes) return apiError("送信データが大きすぎます。", 413);
    let payload;
    try { payload = JSON.parse(rawBody); } catch { return apiError("投稿データの形式が正しくありません。", 400); }

    const [store, campaign, prizeRows] = await Promise.all([
      env.DB.prepare("SELECT id FROM stores WHERE id = ? AND active = 1").bind(payload.storeId ?? "").first(),
      env.DB.prepare("SELECT id, starts_on, ends_on FROM campaigns WHERE id = ? AND published = 1").bind(payload.campaignId ?? "").first(),
      env.DB.prepare("SELECT id FROM prize_categories WHERE campaign_id = ? AND active = 1").bind(payload.campaignId ?? "").all(),
    ]);
    const errors = validateReportPayload(payload, {
      storeIds: new Set(store ? [store.id] : []),
      campaign: campaign ? { id: campaign.id, startsOn: campaign.starts_on, endsOn: campaign.ends_on } : null,
      prizeCategoryIds: new Set(prizeRows.results.map((row) => row.id)),
      today: todayInJapan(),
    });
    if (errors.length) return json({ error: "入力内容をご確認ください。", errors }, { status: 422, headers: { "Cache-Control": "no-store" } });

    const turnstile = await verifyTurnstile(payload.turnstileToken, env.TURNSTILE_SECRET_KEY, request.headers.get("CF-Connecting-IP"));
    if (!turnstile.success) return apiError("投稿確認に失敗しました。ページを再読み込みしてお試しください。", 403);
    if (!env.RATE_LIMIT_SALT) return apiError("投稿機能の設定が完了していません。", 503);

    const now = new Date();
    const nowSeconds = Math.floor(now.getTime() / 1000);
    const windowStartedAt = Math.floor(nowSeconds / REPORT_LIMITS.rateWindowSeconds) * REPORT_LIMITS.rateWindowSeconds;
    const visitorHash = await createVisitorHash(request, env.RATE_LIMIT_SALT, windowStartedAt);
    await env.DB.prepare("DELETE FROM rate_limits WHERE window_started_at < ?").bind(windowStartedAt - REPORT_LIMITS.rateWindowSeconds).run();
    const rate = await env.DB.prepare("SELECT submission_count FROM rate_limits WHERE visitor_hash = ? AND window_started_at = ?").bind(visitorHash, windowStartedAt).first();
    if (Number(rate?.submission_count ?? 0) >= REPORT_LIMITS.maxReportsPerWindow) return apiError("短時間に多くの投稿が送信されました。しばらく待ってからお試しください。", 429);

    const reportId = crypto.randomUUID();
    const createdAt = now.toISOString();
    const knownPrizeCount = payload.prizes.reduce((sum, prize) => sum + prize.quantity, 0);
    const totalPrizeCount = knownPrizeCount + payload.unknownPrizeCount;
    const statements = [
      env.DB.prepare(`INSERT INTO reports (id, store_id, campaign_id, visit_date, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins, unknown_prize_count, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`)
        .bind(reportId, payload.storeId, payload.campaignId, payload.visitDate, payload.usageType, payload.panelDraws, payload.panelWins, payload.mobileDraws, payload.mobileWins, payload.unknownPrizeCount, createdAt),
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
      env.DB.prepare("INSERT INTO rate_limits (visitor_hash, window_started_at, submission_count) VALUES (?, ?, 1) ON CONFLICT(visitor_hash) DO UPDATE SET window_started_at = excluded.window_started_at, submission_count = submission_count + 1").bind(visitorHash, windowStartedAt),
    ];
    for (const prize of payload.prizes.filter((item) => item.quantity > 0)) {
      statements.push(env.DB.prepare("INSERT INTO report_prizes (report_id, prize_category_id, quantity) VALUES (?, ?, ?)").bind(reportId, prize.prizeCategoryId, prize.quantity));
      statements.push(env.DB.prepare(`
        INSERT INTO store_campaign_prize_stats (store_id, campaign_id, prize_category_id, reported_quantity, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(store_id, campaign_id, prize_category_id) DO UPDATE SET reported_quantity = reported_quantity + excluded.reported_quantity, updated_at = excluded.updated_at
      `).bind(payload.storeId, payload.campaignId, prize.prizeCategoryId, prize.quantity, createdAt));
    }
    await env.DB.batch(statements);
    return json({ id: reportId, status: "accepted" }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return unavailable(error); }
}
