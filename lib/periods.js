// 先着特典の切替日を基準にしたサイト内比較期間。景品の公式な「弾」ではない。
const COMPARISON_PERIODS = {
  "chiikawa-kurasushi-2026-summer": [
    { id: "period1", label: "第1期間", startsOn: "2026-08-21", endsOn: "2026-09-03" },
    { id: "period2", label: "第2期間", startsOn: "2026-09-04", endsOn: "2026-09-17" },
    { id: "period3", label: "第3期間", startsOn: "2026-09-18", endsOn: "2026-09-30" },
  ],
};

export function comparisonPeriods(campaignId) { return COMPARISON_PERIODS[campaignId] ?? []; }

export function periodOptions(campaignId) {
  return [{ id: "all", label: "全期間" }, ...comparisonPeriods(campaignId), { id: "7d", label: "直近7日" }];
}

export function resolvePeriod(campaignId, id = "all", today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })) {
  const option = periodOptions(campaignId).find((period) => period.id === id);
  if (!option) return null;
  if (id !== "7d") return { ...option, startsOn: option.startsOn ?? null, endsOn: option.endsOn ?? null };
  const date = new Date(`${today}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new TypeError("日付の形式が正しくありません。");
  date.setUTCDate(date.getUTCDate() - 6);
  return { ...option, startsOn: date.toISOString().slice(0, 10), endsOn: today };
}

// columnはコード内の固定SQL識別子のみ渡す。ユーザー入力はbindingsに限定。
export function periodCondition(period, column = "visit_date") {
  return period?.startsOn ? { sql: ` AND ${column} BETWEEN ? AND ?`, bindings: [period.startsOn, period.endsOn] } : { sql: "", bindings: [] };
}
