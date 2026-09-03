import { getCampaign } from "../../../_lib/data.js";
import { apiError, boundedLimit, cacheHeaders, json, unavailable } from "../../../_lib/http.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const url = new URL(request.url);
    const campaign = await getCampaign(env.DB, url.searchParams.get("campaign"));
    if (!campaign) return apiError("キャンペーンが見つかりません。", 404);
    const limit = boundedLimit(url.searchParams.get("limit"), 10, 50);
    const reports = (await env.DB.prepare(`
      SELECT id, visit_date, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins, unknown_prize_count, prize_breakdown_status, created_at
      FROM active_user_reports
      WHERE store_id = ? AND campaign_id = ?
      ORDER BY created_at DESC, id DESC LIMIT ?
    `).bind(params.id, campaign.id, limit).all()).results;
    let prizes = [];
    if (reports.length) {
      const placeholders = reports.map(() => "?").join(",");
      prizes = (await env.DB.prepare(`
        SELECT acquisition.report_id, acquisition.acquisition_type,
          acquisition.quantity, pc.id, pc.name
        FROM report_prize_acquisitions acquisition
        JOIN prize_categories pc ON pc.id = acquisition.prize_category_id
        WHERE acquisition.report_id IN (${placeholders}) AND acquisition.quantity > 0
        ORDER BY acquisition.acquisition_type, pc.sort_order, pc.id
      `).bind(...reports.map((report) => report.id)).all()).results;
    }
    return json({ items: reports.map((report) => ({
      id: report.id,
      visitDate: report.visit_date,
      usageType: report.usage_type,
      panelDraws: report.panel_draws,
      panelWins: report.panel_wins,
      mobileDraws: report.mobile_draws,
      mobileWins: report.mobile_wins,
      unknownPrizeCount: report.unknown_prize_count,
      prizeBreakdownStatus: report.prize_breakdown_status,
      prizes: prizes.filter((prize) => prize.report_id === report.id && prize.acquisition_type === "draw").map((prize) => ({ id: prize.id, name: prize.name, quantity: Number(prize.quantity), acquisitionType: "draw" })),
      guaranteedPrizes: prizes.filter((prize) => prize.report_id === report.id && prize.acquisition_type === "guaranteed").map((prize) => ({ id: prize.id, name: prize.name, quantity: Number(prize.quantity), acquisitionType: "guaranteed" })),
    })) }, { headers: cacheHeaders(30) });
  } catch (error) { return unavailable(error); }
}
