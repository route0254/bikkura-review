import { getCampaign } from "../../../_lib/data.js";
import { apiError, boundedLimit, cacheHeaders, json, unavailable } from "../../../_lib/http.js";
import { periodCondition, resolvePeriod } from "../../../../lib/periods.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const url = new URL(request.url);
    const campaign = await getCampaign(env.DB, url.searchParams.get("campaign"));
    if (!campaign) return apiError("キャンペーンが見つかりません。", 404);
    const period = resolvePeriod(campaign.id, url.searchParams.get("period") ?? "all");
    if (!period) return apiError("集計期間が不正です。", 400);
    const dates = periodCondition(period);
    const limit = boundedLimit(url.searchParams.get("limit"), 10, 50);
    const reports = (await env.DB.prepare(`
      SELECT id, visit_date, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
        unknown_prize_count, prize_breakdown_status, prize_input_mode, result_input_mode,
        spend_amount_yen, reported_total_draws, reported_prize_count, simple_guaranteed_prize_count,
        CASE WHEN prize_input_mode = 'total' THEN guaranteed_prize_count
          ELSE COALESCE((SELECT SUM(quantity) FROM report_guaranteed_prizes WHERE report_id = active_user_reports.id), 0)
        END AS guaranteed_prize_count,
        created_at
      FROM active_user_reports
      WHERE store_id = ? AND campaign_id = ? ${dates.sql}
      ORDER BY created_at DESC, id DESC LIMIT ?
    `).bind(params.id, campaign.id, ...dates.bindings, limit).all()).results;
    let prizes = [];
    if (reports.length) {
      const placeholders = reports.map(() => "?").join(",");
      prizes = (await env.DB.prepare(`
        SELECT observed.report_id, observed.quantity, pc.id, pc.name
        FROM report_observed_prizes observed
        JOIN prize_categories pc ON pc.id = observed.prize_category_id
        WHERE observed.report_id IN (${placeholders}) AND observed.quantity > 0
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
      prizeBreakdownStatus: report.prize_breakdown_status,
      guaranteedPrizeCount: Number(report.guaranteed_prize_count),
      prizeInputMode: report.prize_input_mode,
      resultInputMode: report.result_input_mode,
      simpleGuaranteedPrizeCount: report.simple_guaranteed_prize_count ?? null,
      spendAmountYen: report.spend_amount_yen === null ? null : Number(report.spend_amount_yen),
      reportedTotalDraws: report.reported_total_draws === null ? null : Number(report.reported_total_draws),
      reportedPrizeCount: report.reported_prize_count === null ? null : Number(report.reported_prize_count),
      prizes: prizes.filter((prize) => prize.report_id === report.id).map((prize) => ({ id: prize.id, name: prize.name, quantity: Number(prize.quantity), acquisitionType: "total" })),
      guaranteedPrizes: [],
    })) }, { headers: cacheHeaders(30) });
  } catch (error) { return unavailable(error); }
}
