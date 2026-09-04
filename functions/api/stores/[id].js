import { getCampaign, mapCampaign, mapSimpleSummary, mapStore, mapUsageStats } from "../../_lib/data.js";
import { apiError, cacheHeaders, json, unavailable } from "../../_lib/http.js";
import { resolvePeriod } from "../../../lib/periods.js";
import { readPeriodComparison, readSpendStats } from "../../_lib/period-stats.js";

async function allPeriodStats(db, storeId, campaignId) {
  const [totals, completeReports, usageResult, prizeResult] = await Promise.all([
    db.prepare(`
      SELECT report_count, total_panel_draws, total_panel_wins,
        total_mobile_draws, total_mobile_wins, total_prize_count
      FROM store_campaign_stats WHERE store_id = ? AND campaign_id = ?
    `).bind(storeId, campaignId).first(),
    db.prepare(`
      SELECT COUNT(*) AS complete_report_count
      FROM active_draw_prize_reports
      WHERE store_id = ? AND campaign_id = ?
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

async function simpleReportStats(db, storeId, campaignId, startDate, endDate) {
  const dateClause = startDate ? "AND visit_date BETWEEN ? AND ?" : "";
  const bindings = startDate ? [storeId, campaignId, startDate, endDate] : [storeId, campaignId];
  return db.prepare(`
    SELECT COUNT(*) AS report_count,
      COALESCE(SUM(spend_amount_yen), 0) AS spend_amount_yen,
      COALESCE(SUM(reported_prize_count), 0) AS reported_prize_count,
      COALESCE(SUM(reported_total_draws), 0) AS reported_draw_count,
      COUNT(reported_total_draws) AS draw_count_report_count
    FROM active_simple_reports
    WHERE store_id = ? AND campaign_id = ? ${dateClause}
  `).bind(...bindings).first();
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
        COALESCE(SUM(CASE
          WHEN result_input_mode = 'simple' THEN 0
          WHEN prize_input_mode = 'total' THEN panel_wins + mobile_wins
          ELSE unknown_prize_count + COALESCE((SELECT SUM(quantity) FROM report_prizes WHERE report_id = reports.id), 0)
        END), 0) AS total_prize_count,
        COALESCE(SUM(CASE WHEN prize_breakdown_status = 'complete'
          AND result_input_mode = 'detailed'
          AND (prize_input_mode = 'by_acquisition' OR guaranteed_prize_count = 0)
          THEN 1 ELSE 0 END), 0) AS complete_report_count
      FROM active_user_reports AS reports
      WHERE store_id = ? AND campaign_id = ? AND visit_date BETWEEN ? AND ?
    `).bind(...bindings).first(),
    db.prepare(`
      SELECT usage_type, COUNT(*) AS report_count,
        COALESCE(SUM(panel_draws), 0) AS total_panel_draws,
        COALESCE(SUM(panel_wins), 0) AS total_panel_wins,
        COALESCE(SUM(mobile_draws), 0) AS total_mobile_draws,
        COALESCE(SUM(mobile_wins), 0) AS total_mobile_wins
      FROM active_user_reports
      WHERE store_id = ? AND campaign_id = ? AND visit_date BETWEEN ? AND ?
        AND result_input_mode = 'detailed'
      GROUP BY usage_type
    `).bind(...bindings).all(),
    db.prepare(`
      SELECT pc.id, pc.name, COALESCE(SUM(CASE WHEN r.id IS NOT NULL THEN rp.quantity ELSE 0 END), 0) AS quantity
      FROM prize_categories pc
      LEFT JOIN active_draw_prizes rp ON rp.prize_category_id = pc.id
      LEFT JOIN active_draw_prize_reports r ON r.id = rp.report_id AND r.store_id = ? AND r.campaign_id = ?
        AND r.visit_date BETWEEN ? AND ?
      WHERE pc.campaign_id = ? AND pc.active = 1
      GROUP BY pc.id, pc.name, pc.sort_order
      ORDER BY pc.sort_order, pc.id
    `).bind(...bindings, campaignId).all(),
  ]);
  return { totals: totals ?? {}, completeReports: Number(totals?.complete_report_count ?? 0), usage: usageResult.results, prizes: prizeResult.results };
}

async function nationalPrizeStats(db, campaignId, startDate, endDate) {
  if (!startDate) {
    const [reportRow, prizeResult] = await Promise.all([
      db.prepare(`
        SELECT COUNT(*) AS complete_report_count FROM active_draw_prize_reports
        WHERE campaign_id = ?
      `).bind(campaignId).first(),
      db.prepare(`
        SELECT pc.id, pc.name, COALESCE(SUM(scps.reported_quantity), 0) AS quantity
        FROM prize_categories pc
        LEFT JOIN store_campaign_prize_stats scps
          ON scps.prize_category_id = pc.id AND scps.campaign_id = pc.campaign_id
        WHERE pc.campaign_id = ? AND pc.active = 1
        GROUP BY pc.id, pc.name, pc.sort_order
        ORDER BY pc.sort_order, pc.id
      `).bind(campaignId).all(),
    ]);
    const prizes = prizeResult.results.map((row) => ({ id: row.id, name: row.name, quantity: Number(row.quantity ?? 0) }));
    return { completeReportCount: Number(reportRow?.complete_report_count ?? 0), completePrizeCount: prizes.reduce((sum, prize) => sum + prize.quantity, 0), prizes };
  }
  const [reportRow, prizeResult] = await Promise.all([
    db.prepare(`
      SELECT COUNT(*) AS complete_report_count FROM active_draw_prize_reports
      WHERE campaign_id = ? AND visit_date BETWEEN ? AND ?
    `).bind(campaignId, startDate, endDate).first(),
    db.prepare(`
      SELECT pc.id, pc.name, COALESCE(SUM(CASE WHEN r.id IS NOT NULL THEN rp.quantity ELSE 0 END), 0) AS quantity
      FROM prize_categories pc
      LEFT JOIN active_draw_prizes rp ON rp.prize_category_id = pc.id
      LEFT JOIN active_draw_prize_reports r ON r.id = rp.report_id AND r.campaign_id = ?
        AND r.visit_date BETWEEN ? AND ?
      WHERE pc.campaign_id = ? AND pc.active = 1
      GROUP BY pc.id, pc.name, pc.sort_order
      ORDER BY pc.sort_order, pc.id
    `).bind(campaignId, startDate, endDate, campaignId).all(),
  ]);
  const prizes = prizeResult.results.map((row) => ({ id: row.id, name: row.name, quantity: Number(row.quantity ?? 0) }));
  return { completeReportCount: Number(reportRow?.complete_report_count ?? 0), completePrizeCount: prizes.reduce((sum, prize) => sum + prize.quantity, 0), prizes };
}

async function itemPrizeStats(db, storeId, campaignId, startDate, endDate) {
  const dateClause = startDate ? "AND r.visit_date BETWEEN ? AND ?" : "";
  const summaryBindings = startDate ? [storeId, campaignId, startDate, endDate] : [storeId, campaignId];
  const itemBindings = startDate ? [storeId, campaignId, startDate, endDate, campaignId] : [storeId, campaignId, campaignId];
  const [summaryResult, itemResult] = await Promise.all([
    db.prepare(`
      SELECT breakdown.prize_category_id, COUNT(*) AS complete_report_count,
        COALESCE(SUM(category_prize.quantity), 0) AS complete_item_count
      FROM active_draw_item_breakdowns breakdown
      JOIN active_draw_prize_reports r ON r.id = breakdown.report_id
      JOIN active_draw_prizes category_prize
        ON category_prize.report_id = breakdown.report_id
        AND category_prize.prize_category_id = breakdown.prize_category_id
      WHERE r.store_id = ? AND r.campaign_id = ?
        AND breakdown.status = 'complete' ${dateClause}
      GROUP BY breakdown.prize_category_id
    `).bind(...summaryBindings).all(),
    db.prepare(`
      SELECT item.id, item.prize_category_id, item.name, item.sort_order,
        COALESCE(SUM(CASE WHEN r.id IS NOT NULL AND breakdown.status = 'complete' THEN reported.quantity ELSE 0 END), 0) AS quantity
      FROM prize_items item
      LEFT JOIN active_draw_items reported ON reported.prize_item_id = item.id
      LEFT JOIN active_draw_item_breakdowns breakdown
        ON breakdown.report_id = reported.report_id AND breakdown.prize_category_id = item.prize_category_id
      LEFT JOIN active_draw_prize_reports r ON r.id = reported.report_id AND r.store_id = ? AND r.campaign_id = ?
        ${dateClause}
      WHERE item.campaign_id = ? AND item.active = 1
      GROUP BY item.id, item.prize_category_id, item.name, item.sort_order
      ORDER BY item.prize_category_id, item.sort_order, item.id
    `).bind(...itemBindings).all(),
  ]);
  const summaryByCategory = new Map(summaryResult.results.map((row) => [row.prize_category_id, row]));
  const byCategory = new Map();
  for (const row of itemResult.results) {
    if (!byCategory.has(row.prize_category_id)) {
      const summary = summaryByCategory.get(row.prize_category_id) ?? {};
      byCategory.set(row.prize_category_id, {
        prizeCategoryId: row.prize_category_id,
        completeReportCount: Number(summary.complete_report_count ?? 0),
        completeItemCount: Number(summary.complete_item_count ?? 0),
        items: [],
      });
    }
    byCategory.get(row.prize_category_id).items.push({ id: row.id, name: row.name, quantity: Number(row.quantity ?? 0) });
  }
  return [...byCategory.values()];
}

async function guaranteedPrizeStats(db, storeId, campaignId, startDate, endDate) {
  const dateClause = startDate ? "AND report.visit_date BETWEEN ? AND ?" : "";
  const bindings = startDate ? [storeId, campaignId, startDate, endDate] : [storeId, campaignId];
  const rows = (await db.prepare(`
    SELECT category.id, category.name, COALESCE(SUM(prize.quantity), 0) AS quantity
    FROM report_guaranteed_prizes prize
    JOIN active_user_reports report ON report.id = prize.report_id
    JOIN prize_categories category ON category.id = prize.prize_category_id
    WHERE report.store_id = ? AND report.campaign_id = ? ${dateClause}
    GROUP BY category.id, category.name, category.sort_order
    ORDER BY category.sort_order, category.id
  `).bind(...bindings).all()).results;
  return rows.map((row) => ({ id: row.id, name: row.name, quantity: Number(row.quantity) }));
}

async function guaranteedPrizeCount(db, storeId, campaignId, startDate, endDate) {
  const dateClause = startDate ? "AND report.visit_date BETWEEN ? AND ?" : "";
  const bindings = startDate ? [storeId, campaignId, startDate, endDate] : [storeId, campaignId];
  const row = await db.prepare(`
    SELECT COALESCE(SUM(CASE
      WHEN report.result_input_mode = 'simple' THEN report.simple_guaranteed_prize_count
      WHEN report.prize_input_mode = 'total' THEN report.guaranteed_prize_count
      ELSE COALESCE((SELECT SUM(quantity) FROM report_guaranteed_prizes WHERE report_id = report.id), 0)
    END), 0) AS quantity
    FROM active_user_reports report
    WHERE report.store_id = ? AND report.campaign_id = ? ${dateClause}
  `).bind(...bindings).first();
  return Number(row?.quantity ?? 0);
}

export async function onRequestGet({ request, env, params }) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get("period") ?? "all";
    const campaign = await getCampaign(env.DB, url.searchParams.get("campaign"));
    const store = await env.DB.prepare("SELECT * FROM stores WHERE id = ? AND active = 1").bind(params.id).first();
    if (!store) return apiError("店舗が見つかりません。", 404);
    if (!campaign) return json({ ...mapStore(store), campaign: null, period, periodStart: null, usage: [], prizes: [], itemPrizes: [], guaranteedPrizeCount: 0, guaranteedPrizes: [], simple: mapSimpleSummary(), national: null }, { headers: cacheHeaders(60) });

    const selectedPeriod = resolvePeriod(campaign.id, period);
    if (!selectedPeriod) return apiError("集計期間が不正です。", 400);
    const periodStart = selectedPeriod.startsOn;
    const periodEnd = selectedPeriod.endsOn;
    const [result, national, itemPrizes, guaranteedPrizes, guaranteedCount, simple, spend, comparison] = await Promise.all([
      periodStart
        ? recentPeriodStats(env.DB, store.id, campaign.id, periodStart, periodEnd)
        : allPeriodStats(env.DB, store.id, campaign.id),
      nationalPrizeStats(env.DB, campaign.id, periodStart, periodEnd),
      itemPrizeStats(env.DB, store.id, campaign.id, periodStart, periodEnd),
      guaranteedPrizeStats(env.DB, store.id, campaign.id, periodStart, periodEnd),
      guaranteedPrizeCount(env.DB, store.id, campaign.id, periodStart, periodEnd),
      simpleReportStats(env.DB, store.id, campaign.id, periodStart, periodEnd),
      readSpendStats(env.DB, campaign.id, selectedPeriod, store.id),
      readPeriodComparison(env.DB, store.id, campaign.id),
    ]);
    const completePrizeCount = result.prizes.reduce((sum, prize) => sum + Number(prize.quantity ?? 0), 0);
    const mappedStore = mapStore({ ...store, ...result.totals, complete_report_count: result.completeReports, complete_prize_count: completePrizeCount });
    return json({
      ...mappedStore,
      campaign: mapCampaign(campaign),
      period,
      periodStart,
      periodEnd,
      spend,
      comparison,
      usage: mapUsageStats(result.usage),
      prizes: result.prizes.map((prize) => ({ id: prize.id, name: prize.name, quantity: Number(prize.quantity ?? 0) })),
      itemPrizes,
      guaranteedPrizeCount: guaranteedCount,
      guaranteedPrizes,
      simple: mapSimpleSummary(simple),
      national: { stats: { completeReportCount: national.completeReportCount, completePrizeCount: national.completePrizeCount }, prizes: national.prizes },
    }, { headers: cacheHeaders(period === "7d" ? 30 : 60) });
  } catch (error) { return unavailable(error); }
}
