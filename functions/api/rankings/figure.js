import { getCampaign, mapCampaign } from "../../_lib/data.js";
import { apiError, cacheHeaders, json, unavailable } from "../../_lib/http.js";
import { MIN_RANKING_COMPLETE_PRIZES, MIN_RANKING_COMPLETE_REPORTS, rankPrizeReports } from "../../../lib/stats.js";
import { periodCondition, resolvePeriod } from "../../../lib/periods.js";

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const campaign = await getCampaign(env.DB, url.searchParams.get("campaign"));
    if (!campaign) return apiError("キャンペーンが見つかりません。", 404);
    const period = resolvePeriod(campaign.id, url.searchParams.get("period") ?? "all");
    if (!period) return apiError("集計期間が不正です。", 400);
    const dates = periodCondition(period, "report.visit_date");
    const figure = await env.DB.prepare(`
      SELECT id, name FROM prize_categories
      WHERE campaign_id = ? AND active = 1 AND name = 'フィギュア'
      LIMIT 1
    `).bind(campaign.id).first();
    if (!figure) return json({ campaign: mapCampaign(campaign), category: null, minimums: { completeReports: MIN_RANKING_COMPLETE_REPORTS, completePrizes: MIN_RANKING_COMPLETE_PRIZES }, items: [] }, { headers: cacheHeaders(60) });
    const rows = (await env.DB.prepare(`
      SELECT stores.id AS store_id, stores.name AS store_name, stores.prefecture, stores.city,
        COUNT(DISTINCT report.id) AS complete_report_count,
        COALESCE(SUM(prize.quantity), 0) AS complete_prize_count,
        SUM(CASE WHEN prize.prize_category_id = ? THEN prize.quantity ELSE 0 END) AS target_prize_count
      FROM active_draw_prize_reports report
      JOIN stores ON stores.id = report.store_id AND stores.active = 1
      LEFT JOIN active_draw_prizes prize ON prize.report_id = report.id
      WHERE report.campaign_id = ? ${dates.sql}
      GROUP BY stores.id, stores.name, stores.prefecture, stores.city
    `).bind(figure.id, campaign.id, ...dates.bindings).all()).results;
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
      period,
      ordering: "wilson_lower_95",
      category: { id: figure.id, name: figure.name },
      minimums: { completeReports: MIN_RANKING_COMPLETE_REPORTS, completePrizes: MIN_RANKING_COMPLETE_PRIZES },
      items: rankings,
    }, { headers: cacheHeaders(60) });
  } catch (error) { return unavailable(error); }
}
