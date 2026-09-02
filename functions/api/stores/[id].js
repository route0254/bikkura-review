import { getCampaign, mapCampaign, mapStore, mapUsageStats } from "../../_lib/data.js";
import { apiError, cacheHeaders, json, unavailable } from "../../_lib/http.js";
import { periodStartDate } from "../../../lib/stats.js";
import { todayInJapan } from "../../../lib/validation.js";

async function allPeriodStats(db, storeId, campaignId) {
  const [totals, completeReports, usageResult, prizeResult] = await Promise.all([
    db.prepare(`
      SELECT report_count, total_panel_draws, total_panel_wins,
        total_mobile_draws, total_mobile_wins, total_prize_count
      FROM store_campaign_stats WHERE store_id = ? AND campaign_id = ?
    `).bind(storeId, campaignId).first(),
    db.prepare(`
      SELECT COUNT(*) AS complete_report_count
      FROM reports
      WHERE store_id = ? AND campaign_id = ? AND status = 'active' AND prize_breakdown_status = 'complete'
    `).bind(storeId, campaignId).first(),
    db.prepare(`
      SELECT usage_type, report_count, total_panel_draws, total_panel_wins,
        total_mobile_draws, total_mobile_wins
      FROM store_campaign_usage_stats WHERE store_id = ? AND campaign_id = ?
    `).bind(storeId, campaignId).all(),
    db.prepare(`
      SELECT pc.id, pc.name, COALESCE(scps.reported_quantity, 0) AS quantity
      FROM prize_categories pc
      LEFT JOIN store_campaign_prize_stats scps
        ON scps.prize_category_id = pc.id AND scps.store_id = ? AND scps.campaign_id = pc.campaign_id
      WHERE pc.campaign_id = ? AND pc.active = 1
      ORDER BY pc.sort_order, pc.id
    `).bind(storeId, campaignId).all(),
  ]);
  return { totals: totals ?? {}, completeReports: Number(completeReports?.complete_report_count ?? 0), usage: usageResult.results, prizes: prizeResult.results };
}

async function recentPeriodStats(db, storeId, campaignId, startDate, endDate) {
  const bindings = [storeId, campaignId, startDate, endDate];
  const [totals, usageResult, prizeResult] = await Promise.all([
    db.prepare(`
      SELECT COUNT(*) AS report_count,
        COALESCE(SUM(panel_draws), 0) AS total_panel_draws,
        COALESCE(SUM(panel_wins), 0) AS total_panel_wins,
        COALESCE(SUM(mobile_draws), 0) AS total_mobile_draws,
        COALESCE(SUM(mobile_wins), 0) AS total_mobile_wins,
        COALESCE(SUM(unknown_prize_count + COALESCE((SELECT SUM(quantity) FROM report_prizes WHERE report_id = reports.id), 0)), 0) AS total_prize_count,
        COALESCE(SUM(CASE WHEN prize_breakdown_status = 'complete' THEN 1 ELSE 0 END), 0) AS complete_report_count
      FROM reports
      WHERE store_id = ? AND campaign_id = ? AND visit_date BETWEEN ? AND ? AND status = 'active'
    `).bind(...bindings).first(),
    db.prepare(`
      SELECT usage_type, COUNT(*) AS report_count,
        COALESCE(SUM(panel_draws), 0) AS total_panel_draws,
        COALESCE(SUM(panel_wins), 0) AS total_panel_wins,
        COALESCE(SUM(mobile_draws), 0) AS total_mobile_draws,
        COALESCE(SUM(mobile_wins), 0) AS total_mobile_wins
      FROM reports
      WHERE store_id = ? AND campaign_id = ? AND visit_date BETWEEN ? AND ? AND status = 'active'
      GROUP BY usage_type
    `).bind(...bindings).all(),
    db.prepare(`
      SELECT pc.id, pc.name, COALESCE(SUM(CASE WHEN r.id IS NOT NULL THEN rp.quantity ELSE 0 END), 0) AS quantity
      FROM prize_categories pc
      LEFT JOIN report_prizes rp ON rp.prize_category_id = pc.id
      LEFT JOIN reports r ON r.id = rp.report_id AND r.store_id = ? AND r.campaign_id = ?
        AND r.visit_date BETWEEN ? AND ? AND r.status = 'active' AND r.prize_breakdown_status = 'complete'
      WHERE pc.campaign_id = ? AND pc.active = 1
      GROUP BY pc.id, pc.name, pc.sort_order
      ORDER BY pc.sort_order, pc.id
    `).bind(...bindings, campaignId).all(),
  ]);
  return { totals: totals ?? {}, completeReports: Number(totals?.complete_report_count ?? 0), usage: usageResult.results, prizes: prizeResult.results };
}

export async function onRequestGet({ request, env, params }) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get("period") ?? "all";
    if (!new Set(["all", "7d"]).has(period)) return apiError("集計期間が不正です。", 400);
    const campaign = await getCampaign(env.DB, url.searchParams.get("campaign"));
    const store = await env.DB.prepare("SELECT * FROM stores WHERE id = ? AND active = 1").bind(params.id).first();
    if (!store) return apiError("店舗が見つかりません。", 404);
    if (!campaign) return json({ ...mapStore(store), campaign: null, period, periodStart: null, usage: [], prizes: [] }, { headers: cacheHeaders(60) });

    const today = todayInJapan();
    const periodStart = periodStartDate(today, period);
    const result = period === "7d"
      ? await recentPeriodStats(env.DB, store.id, campaign.id, periodStart, today)
      : await allPeriodStats(env.DB, store.id, campaign.id);
    const completePrizeCount = result.prizes.reduce((sum, prize) => sum + Number(prize.quantity ?? 0), 0);
    const mappedStore = mapStore({ ...store, ...result.totals, complete_report_count: result.completeReports, complete_prize_count: completePrizeCount });
    return json({
      ...mappedStore,
      campaign: mapCampaign(campaign),
      period,
      periodStart,
      usage: mapUsageStats(result.usage),
      prizes: result.prizes.map((prize) => ({ id: prize.id, name: prize.name, quantity: Number(prize.quantity ?? 0) })),
    }, { headers: cacheHeaders(period === "7d" ? 30 : 60) });
  } catch (error) { return unavailable(error); }
}
