import { getCampaign } from "../../../_lib/data.js";
import { apiError, boundedLimit, cacheHeaders, json, unavailable } from "../../../_lib/http.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const url = new URL(request.url);
    const campaign = await getCampaign(env.DB, url.searchParams.get("campaign"));
    if (!campaign) return apiError("キャンペーンが見つかりません。", 404);
    const limit = boundedLimit(url.searchParams.get("limit"), 10, 50);
    const reports = (await env.DB.prepare(`
      SELECT id, visit_date, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins, unknown_prize_count, created_at
      FROM reports
      WHERE store_id = ? AND campaign_id = ? AND status = 'active'
      ORDER BY created_at DESC, id DESC LIMIT ?
    `).bind(params.id, campaign.id, limit).all()).results;
    let prizes = [];
    if (reports.length) {
      const placeholders = reports.map(() => "?").join(",");
      prizes = (await env.DB.prepare(`
        SELECT rp.report_id, rp.quantity, pc.id, pc.name
        FROM report_prizes rp JOIN prize_categories pc ON pc.id = rp.prize_category_id
        WHERE rp.report_id IN (${placeholders}) AND rp.quantity > 0
        ORDER BY pc.sort_order, pc.id
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
      prizes: prizes.filter((prize) => prize.report_id === report.id).map((prize) => ({ id: prize.id, name: prize.name, quantity: prize.quantity })),
    })) }, { headers: cacheHeaders(30) });
  } catch (error) { return unavailable(error); }
}
