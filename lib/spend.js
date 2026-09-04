export const MIN_SPEND_REPORTS = 5;
export const MIN_SPEND_BAND_REPORTS = 5;
export const SPEND_BANDS = [
  { id: "under3000", label: "〜2,999円" },
  { id: "3000to5999", label: "3,000〜5,999円" },
  { id: "6000to9999", label: "6,000〜9,999円" },
  { id: "10000plus", label: "10,000円〜" },
];

// SQLiteのwindow関数で計算するため、APIから個々の金額データは出さない。
export function spendStatsSql(where) {
  return `WITH base AS (
    SELECT spend_amount_yen AS spend, reported_prize_count AS total,
      simple_guaranteed_prize_count AS guaranteed,
      reported_prize_count - simple_guaranteed_prize_count AS drawn,
      CASE WHEN spend_amount_yen < 3000 THEN 'under3000'
        WHEN spend_amount_yen < 6000 THEN '3000to5999'
        WHEN spend_amount_yen < 10000 THEN '6000to9999' ELSE '10000plus' END AS band
    FROM active_simple_reports WHERE ${where} AND spend_amount_yen > 0 AND reported_prize_count IS NOT NULL
  ), metrics AS (
    -- D1のcompound SELECT制限を避け、1走査から指標を展開する。
    SELECT metric.key AS metric, metric.value AS value FROM base,
      json_each(json_object('spend', spend, 'prizes', total,
        'perPrize', CASE WHEN total > 0 THEN spend * 1.0 / total END,
        'per1000', total * 1000.0 / spend, 'drawn', drawn, 'guaranteed', guaranteed, band, total)) metric
    WHERE metric.value IS NOT NULL
  ), ordered AS (
    SELECT metric, value, ROW_NUMBER() OVER (PARTITION BY metric ORDER BY value) AS position,
      COUNT(*) OVER (PARTITION BY metric) AS n FROM metrics
  ) SELECT metric, MAX(n) AS count, AVG(value) AS median FROM ordered
    WHERE position IN ((n + 1) / 2, (n + 2) / 2) GROUP BY metric`;
}

export function mapSpendStats(rows) {
  const metrics = Object.fromEntries(rows.map((row) => [row.metric, { count: Number(row.count), median: Number(row.median) }]));
  return { reportCount: metrics.spend?.count ?? 0, minimum: MIN_SPEND_REPORTS, bandMinimum: MIN_SPEND_BAND_REPORTS, metrics, bands: SPEND_BANDS.map((band) => ({ ...band, ...metrics[band.id] })).filter((band) => band.count >= MIN_SPEND_BAND_REPORTS) };
}
