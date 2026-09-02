import { getCampaign, mapCampaign } from "../_lib/data.js";
import { apiError, cacheHeaders, json, unavailable } from "../_lib/http.js";

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const campaign = await getCampaign(env.DB, url.searchParams.get("campaign"));
    if (!campaign) return apiError("キャンペーンが見つかりません。", 404);
    const totals = await env.DB.prepare(`
      SELECT
        COALESCE(SUM(report_count), 0) AS report_count,
        COALESCE(SUM(total_panel_draws + total_mobile_draws), 0) AS total_draws,
        COALESCE(SUM(total_panel_wins + total_mobile_wins), 0) AS total_wins,
        COALESCE(SUM(total_prize_count), 0) AS total_prize_count
      FROM store_campaign_stats WHERE campaign_id = ?
    `).bind(campaign.id).first();
    const prizes = (await env.DB.prepare(`
      SELECT pc.id, pc.name, COALESCE(SUM(scps.reported_quantity), 0) AS quantity
      FROM prize_categories pc
      LEFT JOIN store_campaign_prize_stats scps ON scps.prize_category_id = pc.id AND scps.campaign_id = pc.campaign_id
      WHERE pc.campaign_id = ? AND pc.active = 1
      GROUP BY pc.id, pc.name, pc.sort_order
      ORDER BY pc.sort_order, pc.id
    `).bind(campaign.id).all()).results;
    return json({
      campaign: mapCampaign(campaign),
      reportCount: Number(totals.report_count),
      totalDraws: Number(totals.total_draws),
      totalWins: Number(totals.total_wins),
      totalPrizeCount: Number(totals.total_prize_count),
      prizes: prizes.map((prize) => ({ id: prize.id, name: prize.name, quantity: Number(prize.quantity) })),
    }, { headers: cacheHeaders(60) });
  } catch (error) { return unavailable(error); }
}
