import test from "node:test";
import assert from "node:assert/strict";
import { hasEnoughPrizeData, hasEnoughRateData, periodStartDate, summarizeReports } from "../../lib/stats.js";

test("公開中の投稿だけを集計する", () => {
  const summary = summarizeReports([
    { panelDraws: 18, panelWins: 6, mobileDraws: 3, mobileWins: 1, usageType: "normal", prizeBreakdownStatus: "partial", unknownPrizeCount: 1, prizes: [{ prizeCategoryId: "prize-1", quantity: 6 }], status: "active" },
    { panelDraws: 100, panelWins: 100, mobileDraws: 0, mobileWins: 0, usageType: "plus", prizeBreakdownStatus: "complete", unknownPrizeCount: 0, prizes: [], status: "hidden" },
    { panelDraws: 80, panelWins: 80, mobileDraws: 0, mobileWins: 0, usageType: "plus", prizeBreakdownStatus: "complete", unknownPrizeCount: 0, prizes: [], status: "pending" },
  ]);
  assert.equal(summary.reportCount, 1);
  assert.equal(summary.totalPrizeCount, 7);
  assert.equal(summary.totalUnknownPrizes, 1);
  assert.equal(summary.completeReportCount, 0);
  assert.equal(summary.usage.normal.reportCount, 1);
  assert.equal(summary.usage.plus.reportCount, 0);
});

test("通常とプラスを分離し、完全入力の景品だけを景品別集計に使う", () => {
  const summary = summarizeReports([
    { panelDraws: 20, panelWins: 5, mobileDraws: 0, mobileWins: 0, usageType: "normal", prizeBreakdownStatus: "complete", unknownPrizeCount: 0, prizes: [{ prizeCategoryId: "prize-1", quantity: 5 }], status: "active" },
    { panelDraws: 0, panelWins: 0, mobileDraws: 30, mobileWins: 6, usageType: "plus", prizeBreakdownStatus: "partial", unknownPrizeCount: 2, prizes: [{ prizeCategoryId: "prize-1", quantity: 2 }], status: "active" },
  ]);
  assert.equal(summary.usage.normal.totalPanelDraws, 20);
  assert.equal(summary.usage.plus.totalMobileDraws, 30);
  assert.equal(summary.completeReportCount, 1);
  assert.equal(summary.completePrizeCount, 5);
  assert.deepEqual(summary.completePrizes, { "prize-1": 5 });
});

test("十分なデータの判定は投稿数と抽選数、完全入力数を併用する", () => {
  assert.equal(hasEnoughRateData({ reportCount: 5, totalDraws: 50 }), true);
  assert.equal(hasEnoughRateData({ reportCount: 4, totalDraws: 100 }), false);
  assert.equal(hasEnoughPrizeData({ completeReportCount: 3, completePrizeCount: 10 }), true);
  assert.equal(hasEnoughPrizeData({ completeReportCount: 2, completePrizeCount: 20 }), false);
});

test("直近7日は今日を含む7日間にする", () => {
  assert.equal(periodStartDate("2026-09-02", "7d"), "2026-08-27");
  assert.equal(periodStartDate("2026-09-02", "all"), null);
});
