export function summarizeReports(reports) {
  return reports.filter((report) => report.status !== "hidden").reduce((summary, report) => {
    summary.reportCount += 1;
    summary.totalPanelDraws += report.panelDraws;
    summary.totalPanelWins += report.panelWins;
    summary.totalMobileDraws += report.mobileDraws;
    summary.totalMobileWins += report.mobileWins;
    summary.totalUnknownPrizes += report.unknownPrizeCount;
    for (const prize of report.prizes ?? []) summary.totalPrizeCount += prize.quantity;
    return summary;
  }, { reportCount: 0, totalPanelDraws: 0, totalPanelWins: 0, totalMobileDraws: 0, totalMobileWins: 0, totalPrizeCount: 0, totalUnknownPrizes: 0 });
}
