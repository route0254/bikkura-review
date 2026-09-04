import { isActiveUserReport, isDrawEntry, resultInputModeOf } from "./report-policy.js";
import { resolvePeriod } from "./periods.js";

export const MIN_REPORTS_FOR_RATE = 5;
export const MIN_DRAWS_FOR_RATE = 50;
export const MIN_COMPLETE_REPORTS_FOR_PRIZES = 5;
export const MIN_COMPLETE_PRIZES_FOR_RATE = 20;
export const MIN_ITEM_REPORTS_FOR_RATE = 3;
export const MIN_ITEM_QUANTITY_FOR_RATE = 10;
export const MIN_RANKING_COMPLETE_REPORTS = 5;
export const MIN_RANKING_COMPLETE_PRIZES = 50;

function emptyUsageSummary() {
  return { reportCount: 0, totalPanelDraws: 0, totalPanelWins: 0, totalMobileDraws: 0, totalMobileWins: 0 };
}

export function summarizeReports(reports) {
  return reports.filter(isActiveUserReport).reduce((summary, report) => {
    summary.reportCount += 1;
    if (resultInputModeOf(report) === "simple") {
      summary.simple.reportCount += 1;
      summary.simple.spendAmountYen += Number(report.spendAmountYen ?? 0);
      summary.simple.reportedPrizeCount += Number(report.reportedPrizeCount ?? 0);
      if (report.reportedTotalDraws !== null && report.reportedTotalDraws !== undefined) {
        summary.simple.reportedDrawCount += Number(report.reportedTotalDraws);
        summary.simple.drawCountReportCount += 1;
      }
      return summary;
    }
    summary.totalPanelDraws += report.panelDraws;
    summary.totalPanelWins += report.panelWins;
    summary.totalMobileDraws += report.mobileDraws;
    summary.totalMobileWins += report.mobileWins;
    summary.totalUnknownPrizes += report.unknownPrizeCount;
    summary.totalPrizeCount += report.unknownPrizeCount;
    const usage = summary.usage[report.usageType] ?? summary.usage.unknown;
    usage.reportCount += 1;
    usage.totalPanelDraws += report.panelDraws;
    usage.totalPanelWins += report.panelWins;
    usage.totalMobileDraws += report.mobileDraws;
    usage.totalMobileWins += report.mobileWins;
    for (const prize of (report.prizes ?? []).filter(isDrawEntry)) {
      summary.totalPrizeCount += prize.quantity;
      if (report.prizeBreakdownStatus === "complete") {
        summary.completePrizeCount += prize.quantity;
        summary.completePrizes[prize.prizeCategoryId] = (summary.completePrizes[prize.prizeCategoryId] ?? 0) + prize.quantity;
      }
    }
    for (const breakdown of report.itemBreakdowns ?? []) {
      if (!isDrawEntry(breakdown) || breakdown.status !== "complete") continue;
      const itemSummary = summary.completeItemBreakdowns[breakdown.prizeCategoryId] ?? { reportCount: 0, totalQuantity: 0, items: {} };
      itemSummary.reportCount += 1;
      for (const item of breakdown.items ?? []) {
        itemSummary.totalQuantity += item.quantity;
        itemSummary.items[item.prizeItemId] = (itemSummary.items[item.prizeItemId] ?? 0) + item.quantity;
      }
      summary.completeItemBreakdowns[breakdown.prizeCategoryId] = itemSummary;
    }
    if (report.prizeBreakdownStatus === "complete") summary.completeReportCount += 1;
    return summary;
  }, {
    reportCount: 0,
    totalPanelDraws: 0,
    totalPanelWins: 0,
    totalMobileDraws: 0,
    totalMobileWins: 0,
    totalPrizeCount: 0,
    totalUnknownPrizes: 0,
    completeReportCount: 0,
    completePrizeCount: 0,
    completePrizes: {},
    completeItemBreakdowns: {},
    simple: { reportCount: 0, spendAmountYen: 0, reportedPrizeCount: 0, reportedDrawCount: 0, drawCountReportCount: 0 },
    usage: { normal: emptyUsageSummary(), plus: emptyUsageSummary(), unknown: emptyUsageSummary() },
  });
}

export function hasEnoughRateData(stats = {}) {
  return Number(stats.reportCount ?? 0) >= MIN_REPORTS_FOR_RATE
    && Number(stats.totalDraws ?? 0) >= MIN_DRAWS_FOR_RATE;
}

export function hasEnoughPrizeData(stats = {}) {
  return Number(stats.completeReportCount ?? 0) >= MIN_COMPLETE_REPORTS_FOR_PRIZES
    && Number(stats.completePrizeCount ?? 0) >= MIN_COMPLETE_PRIZES_FOR_RATE;
}

export function hasEnoughItemData(stats = {}) {
  return Number(stats.completeReportCount ?? 0) >= MIN_ITEM_REPORTS_FOR_RATE
    && Number(stats.completeItemCount ?? stats.completePrizeCount ?? 0) >= MIN_ITEM_QUANTITY_FOR_RATE;
}

export function prizeShares(prizes = [], total = 0) {
  const denominator = Number(total);
  return prizes.map((prize) => ({
    ...prize,
    share: denominator > 0 ? Number(prize.quantity ?? 0) / denominator : null,
  }));
}

// 順位だけに利用する95% Wilson下限。表示は従来の生の割合。
export function rankingScore(successes, total) {
  if (!Number.isFinite(total) || total <= 0 || successes < 0 || successes > total) return 0;
  const z = 1.96;
  const p = successes / total;
  return (p + z * z / (2 * total) - z * Math.sqrt((p * (1 - p) + z * z / (4 * total)) / total)) / (1 + z * z / total);
}

export function rankPrizeReports(rows = [], options = {}) {
  const minReports = options.minReports ?? MIN_RANKING_COMPLETE_REPORTS;
  const minPrizes = options.minPrizes ?? MIN_RANKING_COMPLETE_PRIZES;
  const eligible = rows
    .filter((row) => (row.sourceType ?? "user") === "user")
    .map((row) => ({
      ...row,
      completeReportCount: Number(row.completeReportCount ?? 0),
      completePrizeCount: Number(row.completePrizeCount ?? 0),
      targetPrizeCount: Number(row.targetPrizeCount ?? 0),
    }))
    .filter((row) => row.completeReportCount >= minReports && row.completePrizeCount >= minPrizes && row.targetPrizeCount >= 0 && row.targetPrizeCount <= row.completePrizeCount)
    .map((row) => ({ ...row, score: rankingScore(row.targetPrizeCount, row.completePrizeCount) }))
    .sort((left, right) => {
      const shareOrder = right.score - left.score;
      return shareOrder || right.completePrizeCount - left.completePrizeCount || String(left.storeName).localeCompare(String(right.storeName), "ja");
    });
  let previous = null;
  return eligible.map((row, index) => {
    const tied = previous && row.score === previous.score;
    const rank = tied ? previous.rank : index + 1;
    const ranked = { ...row, rank, share: row.completePrizeCount ? row.targetPrizeCount / row.completePrizeCount : 0 };
    previous = ranked;
    return ranked;
  });
}

export function periodStartDate(today, period) {
  return resolvePeriod(null, period, today)?.startsOn ?? null;
}
