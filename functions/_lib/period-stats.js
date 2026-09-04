import { comparisonPeriods, periodCondition } from "../../lib/periods.js";
import { mapSpendStats, spendStatsSql } from "../../lib/spend.js";
import { mapSimpleSummary, mapSummary, mapUsageStats } from "./data.js";

export async function readSpendStats(db, campaignId, period, storeId = null) {
  const dates = periodCondition(period);
  const where = `campaign_id = ?${storeId ? " AND store_id = ?" : ""}${dates.sql}`;
  const bindings = [campaignId, ...(storeId ? [storeId] : []), ...dates.bindings];
  return mapSpendStats((await db.prepare(spendStatsSql(where)).bind(...bindings).all()).results);
}

export async function readPeriodComparison(db, storeId, campaignId) {
  const periods = comparisonPeriods(campaignId);
  if (!periods.length) return [];
  const values = periods.map(() => "(?, ?, ?)").join(",");
  const rows = (await db.prepare(`WITH periods(id, starts, ends) AS (VALUES ${values}),
    totals AS (
      SELECT p.id, COUNT(r.id) AS report_count, COALESCE(SUM(r.draw_prize_count), 0) AS draw_prize_count
      FROM periods p LEFT JOIN active_result_metrics r ON r.store_id = ? AND r.campaign_id = ? AND r.visit_date BETWEEN p.starts AND p.ends
      GROUP BY p.id
    ), figures AS (
      SELECT p.id, COALESCE(SUM(prize.quantity), 0) AS figure_count FROM periods p
      LEFT JOIN active_draw_prize_reports r ON r.store_id = ? AND r.campaign_id = ? AND r.visit_date BETWEEN p.starts AND p.ends
      LEFT JOIN active_draw_prizes prize ON prize.report_id = r.id AND prize.prize_category_id IN
        (SELECT id FROM prize_categories WHERE campaign_id = ? AND name = 'フィギュア')
      GROUP BY p.id
    ) SELECT totals.*, figures.figure_count FROM totals JOIN figures USING(id) ORDER BY id
  `).bind(...periods.flatMap((p) => [p.id, p.startsOn, p.endsOn]), storeId, campaignId, storeId, campaignId, campaignId).all()).results;
  return rows.map((r) => ({ ...periods.find((p) => p.id === r.id), reportCount: Number(r.report_count), drawPrizeCount: Number(r.draw_prize_count), figureCount: Number(r.figure_count) }));
}

// 期間指定時のみ実行。各行は店舗/カテゴリ単位の集計であり、生のreportsを取得しない。
export async function readPeriodNationalStats(db, campaignId, period) {
  const date = periodCondition(period, "r.visit_date");
  const bindings = [campaignId, ...date.bindings];
  const [storeResult, prizeResult, usageResult, simple, externalResult, master, categories] = await Promise.all([
    db.prepare(`SELECT r.store_id, COUNT(*) AS report_count,
      SUM(r.panel_draws + r.mobile_draws) AS total_draws, SUM(r.panel_wins + r.mobile_wins) AS total_wins,
      SUM(r.draw_prize_count) AS total_prize_count, MAX(r.created_at) AS latest_report_at,
      SUM(CASE WHEN qualifying.id IS NOT NULL THEN 1 ELSE 0 END) AS complete_report_count
      FROM active_result_metrics r LEFT JOIN active_draw_prize_reports qualifying ON qualifying.id = r.id
      WHERE r.campaign_id = ? ${date.sql} GROUP BY r.store_id`).bind(...bindings).all(),
    db.prepare(`SELECT r.store_id, pc.id, pc.name, SUM(prize.quantity) AS quantity
      FROM active_draw_prizes prize JOIN active_draw_prize_reports r ON r.id = prize.report_id
      JOIN prize_categories pc ON pc.id = prize.prize_category_id AND pc.active = 1
      WHERE r.campaign_id = ? ${date.sql} GROUP BY r.store_id, pc.id ORDER BY pc.sort_order, pc.id`).bind(...bindings).all(),
    db.prepare(`SELECT usage_type, COUNT(*) AS report_count, SUM(panel_draws) AS total_panel_draws,
      SUM(panel_wins) AS total_panel_wins, SUM(mobile_draws) AS total_mobile_draws, SUM(mobile_wins) AS total_mobile_wins
      FROM active_user_reports r WHERE r.campaign_id = ? ${date.sql} AND r.result_input_mode = 'detailed' GROUP BY usage_type`).bind(...bindings).all(),
    db.prepare(`SELECT COUNT(*) AS report_count, SUM(spend_amount_yen) AS spend_amount_yen,
      SUM(reported_prize_count) AS reported_prize_count, SUM(reported_total_draws) AS reported_draw_count,
      COUNT(reported_total_draws) AS draw_count_report_count
      FROM active_simple_reports r WHERE r.campaign_id = ? ${date.sql}`).bind(...bindings).first(),
    // 外部件数は従来通り全期間。統計とは別で並び順・情報件数だけに使用。
    db.prepare(`SELECT store_id, COUNT(*) AS count FROM external_reports WHERE campaign_id = ?
      AND source_type = 'external' AND status IN ('active', 'pending') AND store_id IS NOT NULL GROUP BY store_id`).bind(campaignId).all(),
    db.prepare("SELECT id, prefecture FROM stores WHERE active = 1").all(),
    db.prepare("SELECT id, name FROM prize_categories WHERE campaign_id = ? AND active = 1 ORDER BY sort_order, id").bind(campaignId).all(),
  ]);
  const byStore = new Map(storeResult.results.map((r) => [r.store_id, r]));
  const external = new Map(externalResult.results.map((r) => [r.store_id, Number(r.count)]));
  const prizeByStore = new Map();
  const prizeTotals = new Map(categories.results.map((row) => [row.id, { id: row.id, name: row.name, quantity: 0 }]));
  for (const row of prizeResult.results) {
    const prize = { id: row.id, name: row.name, quantity: Number(row.quantity) };
    if (!prizeByStore.has(row.store_id)) prizeByStore.set(row.store_id, []);
    prizeByStore.get(row.store_id).push(prize);
    const total = prizeTotals.get(row.id) ?? { ...prize, quantity: 0 };
    total.quantity += prize.quantity;
    prizeTotals.set(row.id, total);
  }
  const totals = { report_count: 0, total_draws: 0, total_wins: 0, total_prize_count: 0, complete_report_count: 0, complete_prize_count: 0 };
  for (const row of storeResult.results) for (const key of Object.keys(totals)) totals[key] += Number(row[key] ?? 0);
  totals.complete_prize_count = [...prizeTotals.values()].reduce((sum, p) => sum + p.quantity, 0);
  const stores = master.results.filter((s) => byStore.has(s.id) || external.has(s.id)).map((s) => {
    const row = byStore.get(s.id) ?? {};
    const prizes = prizeByStore.get(s.id) ?? [];
    return { storeId: s.id, ...mapSummary({ ...row, complete_prize_count: prizes.reduce((sum, p) => sum + p.quantity, 0) }),
      externalCollectionCount: external.get(s.id) ?? 0, prizes, latestReportAt: row.latest_report_at ?? null };
  });
  return { ...mapSummary(totals), simple: mapSimpleSummary(simple), prizes: [...prizeTotals.values()], usage: mapUsageStats(usageResult.results), stores,
    coverage: { totalStoreCount: master.results.length, totalPrefectureCount: new Set(master.results.map((s) => s.prefecture)).size,
      reportingStoreCount: master.results.filter((s) => byStore.has(s.id)).length,
      reportingPrefectureCount: new Set(master.results.filter((s) => byStore.has(s.id)).map((s) => s.prefecture)).size } };
}
