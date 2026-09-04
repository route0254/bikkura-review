import { getCampaign, mapCampaign } from "../_lib/data.js";
import { apiError, boundedLimit, cacheHeaders, json, unavailable } from "../_lib/http.js";
import { periodCondition, resolvePeriod } from "../../lib/periods.js";

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const campaign = await getCampaign(env.DB, url.searchParams.get("campaign"));
    if (!campaign) return apiError("キャンペーンが見つかりません。", 404);
    const period = resolvePeriod(campaign.id, url.searchParams.get("period") ?? "all");
    if (!period) return apiError("集計期間が不正です。", 400);
    const dates = periodCondition(period, "report.visit_date");
    const limit = boundedLimit(url.searchParams.get("limit"), 10, 30);
    const reports = (await env.DB.prepare(`
      SELECT report.id, report.store_id, store.name AS store_name, store.prefecture,
        report.visit_date, report.created_at, report.panel_draws, report.panel_wins,
        report.mobile_draws, report.mobile_wins, report.result_input_mode, report.goods_input,
        report.spend_amount_yen, report.reported_total_draws, report.reported_prize_count, report.simple_guaranteed_prize_count
      FROM active_user_reports report
      JOIN stores store ON store.id = report.store_id AND store.active = 1
      WHERE report.campaign_id = ? ${dates.sql}
      ORDER BY report.created_at DESC, report.id DESC
      LIMIT ?
    `).bind(campaign.id, ...dates.bindings, limit).all()).results;
    return json({
      campaign: mapCampaign(campaign),
      items: reports.map((report) => ({
        id: report.id,
        storeId: report.store_id,
        storeName: report.store_name,
        prefecture: report.prefecture,
        visitDate: report.visit_date,
        createdAt: report.created_at,
        panelDraws: Number(report.panel_draws),
        panelWins: Number(report.panel_wins),
        mobileDraws: Number(report.mobile_draws),
        mobileWins: Number(report.mobile_wins),
        resultInputMode: report.result_input_mode,
        goodsInput: Boolean(report.goods_input),
        simpleGuaranteedPrizeCount: report.simple_guaranteed_prize_count ?? null,
        spendAmountYen: report.spend_amount_yen === null ? null : Number(report.spend_amount_yen),
        reportedTotalDraws: report.reported_total_draws === null ? null : Number(report.reported_total_draws),
        reportedPrizeCount: report.reported_prize_count === null ? null : Number(report.reported_prize_count),
      })),
    }, { headers: cacheHeaders(30) });
  } catch (error) { return unavailable(error); }
}
