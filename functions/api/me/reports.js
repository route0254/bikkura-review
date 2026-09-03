import { requireAuthenticatedUser } from "../../_lib/authenticated-user.js";
import { boundedLimit, json, unavailable } from "../../_lib/http.js";

export async function onRequestGet({ request, env }) {
  try {
    const identity = await requireAuthenticatedUser(request, env);
    if (identity.error) return identity.error;
    const url = new URL(request.url);
    const limit = boundedLimit(url.searchParams.get("limit"), 30, 100);
    const reports = (await env.DB.prepare(`
      SELECT report.id, report.store_id, store.name AS store_name,
        report.campaign_id, campaign.name AS campaign_name, report.visit_date,
        report.usage_type, report.panel_draws, report.panel_wins,
        report.mobile_draws, report.mobile_wins, report.unknown_prize_count,
        report.prize_breakdown_status, report.status AS moderation_status,
        report.created_at, withdrawal.withdrawn_at,
        CASE WHEN withdrawal.report_id IS NOT NULL THEN 'withdrawn' ELSE report.status END AS status
      FROM reports report
      JOIN stores store ON store.id = report.store_id
      JOIN campaigns campaign ON campaign.id = report.campaign_id
      LEFT JOIN report_withdrawals withdrawal ON withdrawal.report_id = report.id
      WHERE report.user_id = ? AND report.source_type = 'user'
      ORDER BY report.created_at DESC, report.id DESC
      LIMIT ?
    `).bind(identity.userId, limit).all()).results;
    let prizes = [];
    if (reports.length) {
      const placeholders = reports.map(() => "?").join(",");
      prizes = (await env.DB.prepare(`
        SELECT acquisition.report_id, acquisition.acquisition_type,
          acquisition.quantity, category.id, category.name
        FROM report_prize_acquisitions acquisition
        JOIN prize_categories category ON category.id = acquisition.prize_category_id
        WHERE acquisition.report_id IN (${placeholders}) AND acquisition.quantity > 0
        ORDER BY acquisition.acquisition_type, category.sort_order, category.id
      `).bind(...reports.map((report) => report.id)).all()).results;
    }
    return json({
      items: reports.map((report) => ({
        id: report.id,
        storeId: report.store_id,
        storeName: report.store_name,
        campaignId: report.campaign_id,
        campaignName: report.campaign_name,
        visitDate: report.visit_date,
        usageType: report.usage_type,
        panelDraws: Number(report.panel_draws),
        panelWins: Number(report.panel_wins),
        mobileDraws: Number(report.mobile_draws),
        mobileWins: Number(report.mobile_wins),
        unknownPrizeCount: Number(report.unknown_prize_count),
        prizeBreakdownStatus: report.prize_breakdown_status,
        status: report.status,
        moderationStatus: report.moderation_status,
        withdrawnAt: report.withdrawn_at,
        createdAt: report.created_at,
        prizes: prizes.filter((prize) => prize.report_id === report.id).map((prize) => ({
          id: prize.id,
          name: prize.name,
          quantity: Number(prize.quantity),
          acquisitionType: prize.acquisition_type,
        })),
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return unavailable(error); }
}
