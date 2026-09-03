import { getCampaign, mapCampaign } from "../../_lib/data.js";
import { apiError, cacheHeaders, json, unavailable } from "../../_lib/http.js";
import { MIN_RANKING_COMPLETE_PRIZES, MIN_RANKING_COMPLETE_REPORTS, rankPrizeReports } from "../../../lib/stats.js";

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const campaign = await getCampaign(env.DB, url.searchParams.get("campaign"));
    if (!campaign) return apiError("キャンペーンが見つかりません。", 404);
    const figure = await env.DB.prepare(`
      SELECT id, name FROM prize_categories
      WHERE campaign_id = ? AND active = 1 AND name = 'フィギュア'
      LIMIT 1
    `).bind(campaign.id).first();
    if (!figure) return json({ campaign: mapCampaign(campaign), category: null, minimums: { completeReports: MIN_RANKING_COMPLETE_REPORTS, completePrizes: MIN_RANKING_COMPLETE_PRIZES }, items: [] }, { headers: cacheHeaders(60) });
    const rows = (await env.DB.prepare(`
      SELECT stores.id AS store_id, stores.name AS store_name, stores.prefecture, stores.city,
        complete.complete_report_count,
        SUM(stats.reported_quantity) AS complete_prize_count,
        SUM(CASE WHEN stats.prize_category_id = ? THEN stats.reported_quantity ELSE 0 END) AS target_prize_count
      FROM store_campaign_prize_stats stats
      JOIN stores ON stores.id = stats.store_id AND stores.active = 1
      JOIN (
        SELECT store_id, COUNT(*) AS complete_report_count
        FROM active_draw_prize_reports
        WHERE campaign_id = ?
        GROUP BY store_id
      ) complete ON complete.store_id = stats.store_id
      WHERE stats.campaign_id = ?
      GROUP BY stores.id, stores.name, stores.prefecture, stores.city, complete.complete_report_count
    `).bind(figure.id, campaign.id, campaign.id).all()).results;
    const rankings = rankPrizeReports(rows.map((row) => ({
      storeId: row.store_id,
      storeName: row.store_name,
      prefecture: row.prefecture,
      city: row.city,
      completeReportCount: row.complete_report_count,
      completePrizeCount: row.complete_prize_count,
      targetPrizeCount: row.target_prize_count,
    })));
    return json({
      campaign: mapCampaign(campaign),
      category: { id: figure.id, name: figure.name },
      minimums: { completeReports: MIN_RANKING_COMPLETE_REPORTS, completePrizes: MIN_RANKING_COMPLETE_PRIZES },
      items: rankings,
    }, { headers: cacheHeaders(60) });
  } catch (error) { return unavailable(error); }
}
