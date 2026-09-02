export const MIN_REPORTS_FOR_RATE = 5;
export const MIN_DRAWS_FOR_RATE = 50;
export const MIN_COMPLETE_REPORTS_FOR_PRIZES = 3;
export const MIN_COMPLETE_PRIZES_FOR_RATE = 10;

function emptyUsageSummary() {
  return { reportCount: 0, totalPanelDraws: 0, totalPanelWins: 0, totalMobileDraws: 0, totalMobileWins: 0 };
}

export function summarizeReports(reports) {
  return reports.filter((report) => report.status === "active").reduce((summary, report) => {
    summary.reportCount += 1;
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
    for (const prize of report.prizes ?? []) {
      summary.totalPrizeCount += prize.quantity;
      if (report.prizeBreakdownStatus === "complete") {
        summary.completePrizeCount += prize.quantity;
        summary.completePrizes[prize.prizeCategoryId] = (summary.completePrizes[prize.prizeCategoryId] ?? 0) + prize.quantity;
      }
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

export function periodStartDate(today, period) {
  if (period !== "7d") return null;
  const date = new Date(`${today}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new TypeError("日付の形式が正しくありません。");
  date.setUTCDate(date.getUTCDate() - 6);
  return date.toISOString().slice(0, 10);
}
