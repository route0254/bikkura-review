import { getCampaign, mapCampaign, mapSummary, mapUsageStats } from "../_lib/data.js";
import { apiError, cacheHeaders, json, unavailable } from "../_lib/http.js";

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const campaign = await getCampaign(env.DB, url.searchParams.get("campaign"));
    if (!campaign) return apiError("キャンペーンが見つかりません。", 404);
    const [totals, prizes, breakdown, usageRows, storeRows] = await Promise.all([
      env.DB.prepare(`
        SELECT
          COALESCE(SUM(report_count), 0) AS report_count,
          COALESCE(SUM(total_panel_draws + total_mobile_draws), 0) AS total_draws,
          COALESCE(SUM(total_panel_wins + total_mobile_wins), 0) AS total_wins,
          COALESCE(SUM(total_prize_count), 0) AS total_prize_count
        FROM store_campaign_stats WHERE campaign_id = ?
      `).bind(campaign.id).first(),
      env.DB.prepare(`
        SELECT pc.id, pc.name, COALESCE(SUM(scps.reported_quantity), 0) AS quantity
        FROM prize_categories pc
        LEFT JOIN store_campaign_prize_stats scps ON scps.prize_category_id = pc.id AND scps.campaign_id = pc.campaign_id
        WHERE pc.campaign_id = ? AND pc.active = 1
        GROUP BY pc.id, pc.name, pc.sort_order
        ORDER BY pc.sort_order, pc.id
      `).bind(campaign.id).all(),
      env.DB.prepare(`
        SELECT COUNT(*) AS complete_report_count
        FROM reports
        WHERE campaign_id = ? AND status = 'active' AND prize_breakdown_status = 'complete'
      `).bind(campaign.id).first(),
      env.DB.prepare(`
        SELECT
          usage_type,
          SUM(report_count) AS report_count,
          SUM(total_panel_draws) AS total_panel_draws,
          SUM(total_panel_wins) AS total_panel_wins,
          SUM(total_mobile_draws) AS total_mobile_draws,
          SUM(total_mobile_wins) AS total_mobile_wins
        FROM store_campaign_usage_stats
        WHERE campaign_id = ?
        GROUP BY usage_type
      `).bind(campaign.id).all(),
      env.DB.prepare(`
        SELECT
          store_id,
          report_count,
          total_panel_draws + total_mobile_draws AS total_draws,
          total_panel_wins + total_mobile_wins AS total_wins,
          total_prize_count
        FROM store_campaign_stats
        WHERE campaign_id = ? AND report_count > 0
      `).bind(campaign.id).all(),
    ]);
    const prizeItems = prizes.results.map((prize) => ({ id: prize.id, name: prize.name, quantity: Number(prize.quantity) }));
    const completePrizeCount = prizeItems.reduce((sum, prize) => sum + prize.quantity, 0);
    return json({
      campaign: mapCampaign(campaign),
      ...mapSummary({ ...totals, ...breakdown, complete_prize_count: completePrizeCount }),
      prizes: prizeItems,
      usage: mapUsageStats(usageRows.results),
      stores: storeRows.results.map((row) => ({ storeId: row.store_id, ...mapSummary(row) })),
    }, { headers: cacheHeaders(60) });
  } catch (error) { return unavailable(error); }
}
