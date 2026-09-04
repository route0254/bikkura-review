import { getCampaign, mapCampaign } from "../../_lib/data.js";
import { apiError, cacheHeaders, json, unavailable } from "../../_lib/http.js";
import { periodCondition, resolvePeriod } from "../../../lib/periods.js";

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const campaign = await getCampaign(env.DB, url.searchParams.get("campaign"));
    if (!campaign) return apiError("キャンペーンが見つかりません。", 404);
    const period = resolvePeriod(campaign.id, url.searchParams.get("period") ?? "all");
    if (!period) return apiError("集計期間が不正です。", 400);
    const dates = periodCondition(period, "report.visit_date");
    const rows = (await env.DB.prepare(`
      SELECT store.prefecture,
        COUNT(report.id) AS report_count,
        COUNT(DISTINCT report.store_id) AS reporting_store_count,
        SUM(report.panel_draws + report.mobile_draws) AS total_draws,
        SUM(report.panel_wins + report.mobile_wins) AS total_wins
      FROM active_user_reports report
      JOIN stores store ON store.id = report.store_id AND store.active = 1
      WHERE report.campaign_id = ? ${dates.sql}
      GROUP BY store.prefecture
      ORDER BY report_count DESC, store.prefecture
    `).bind(campaign.id, ...dates.bindings).all()).results;
    return json({
      campaign: mapCampaign(campaign),
      period,
      items: rows.map((row) => ({
        prefecture: row.prefecture,
        reportCount: Number(row.report_count),
        reportingStoreCount: Number(row.reporting_store_count),
        totalDraws: Number(row.total_draws),
        totalWins: Number(row.total_wins),
      })),
    }, { headers: cacheHeaders(60) });
  } catch (error) { return unavailable(error); }
}
