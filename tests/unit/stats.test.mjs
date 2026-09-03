import test from "node:test";
import assert from "node:assert/strict";
import { hasEnoughItemData, hasEnoughPrizeData, hasEnoughRateData, periodStartDate, prizeShares, rankPrizeReports, summarizeReports } from "../../lib/stats.js";

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

test("外部参考情報を100件渡しても利用者投稿統計とランキングを変えない", () => {
  const user = { sourceType: "user", panelDraws: 10, panelWins: 1, mobileDraws: 0, mobileWins: 0, usageType: "normal", prizeBreakdownStatus: "complete", unknownPrizeCount: 0, prizes: [{ prizeCategoryId: "figure", quantity: 1 }], status: "active" };
  const external = Array.from({ length: 100 }, (_, index) => ({ ...user, id: `external-${index}`, sourceType: "external", panelDraws: 300, panelWins: 300, prizes: [{ prizeCategoryId: "figure", quantity: 300 }] }));
  const summary = summarizeReports([user, ...external]);
  assert.equal(summary.reportCount, 1);
  assert.equal(summary.totalPanelDraws, 10);
  assert.equal(summary.completePrizeCount, 1);

  const ranked = rankPrizeReports([
    { sourceType: "user", storeId: "user-store", storeName: "利用者投稿店", completeReportCount: 5, completePrizeCount: 50, targetPrizeCount: 10 },
    { sourceType: "external", storeId: "external-store", storeName: "外部情報店", completeReportCount: 100, completePrizeCount: 100, targetPrizeCount: 100 },
  ]);
  assert.deepEqual(ranked.map((row) => row.storeId), ["user-store"]);
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
  assert.equal(hasEnoughPrizeData({ completeReportCount: 5, completePrizeCount: 20 }), true);
  assert.equal(hasEnoughPrizeData({ completeReportCount: 4, completePrizeCount: 40 }), false);
});

test("直近7日は今日を含む7日間にする", () => {
  assert.equal(periodStartDate("2026-09-02", "7d"), "2026-08-27");
  assert.equal(periodStartDate("2026-09-02", "all"), null);
});

test("カテゴリ割合と全国割合は完全入力の集計値から計算する", () => {
  const store = prizeShares([{ id: "figure", quantity: 6 }, { id: "badge", quantity: 4 }], 10);
  const national = prizeShares([{ id: "figure", quantity: 20 }, { id: "badge", quantity: 30 }], 50);
  assert.equal(store[0].share, 0.6);
  assert.equal(national[0].share, 0.4);
});

test("個別景品はactiveかつカテゴリ内訳completeの投稿だけを集計する", () => {
  const summary = summarizeReports([
    { status: "active", usageType: "normal", panelDraws: 5, panelWins: 2, mobileDraws: 0, mobileWins: 0, unknownPrizeCount: 0, prizes: [], itemBreakdowns: [{ prizeCategoryId: "figure", status: "complete", items: [{ prizeItemId: "chiikawa", quantity: 2 }] }] },
    { status: "active", usageType: "normal", panelDraws: 5, panelWins: 1, mobileDraws: 0, mobileWins: 0, unknownPrizeCount: 0, prizes: [], itemBreakdowns: [{ prizeCategoryId: "figure", status: "partial", items: [{ prizeItemId: "chiikawa", quantity: 1 }] }] },
    { status: "pending", usageType: "normal", panelDraws: 5, panelWins: 3, mobileDraws: 0, mobileWins: 0, unknownPrizeCount: 0, prizes: [], itemBreakdowns: [{ prizeCategoryId: "figure", status: "complete", items: [{ prizeItemId: "chiikawa", quantity: 3 }] }] },
    { status: "hidden", usageType: "normal", panelDraws: 5, panelWins: 4, mobileDraws: 0, mobileWins: 0, unknownPrizeCount: 0, prizes: [], itemBreakdowns: [{ prizeCategoryId: "figure", status: "complete", items: [{ prizeItemId: "chiikawa", quantity: 4 }] }] },
  ]);
  assert.deepEqual(summary.completeItemBreakdowns.figure, { reportCount: 1, totalQuantity: 2, items: { chiikawa: 2 } });
  assert.equal(hasEnoughItemData({ completeReportCount: 2, completeItemCount: 100 }), false);
  assert.equal(hasEnoughItemData({ completeReportCount: 3, completeItemCount: 10 }), true);
});

test("ランキングは最低サンプル条件・順序・同率順位を守る", () => {
  const ranked = rankPrizeReports([
    { storeId: "small", storeName: "少数店", completeReportCount: 1, completePrizeCount: 1, targetPrizeCount: 1 },
    { storeId: "a", storeName: "A店", completeReportCount: 8, completePrizeCount: 100, targetPrizeCount: 30 },
    { storeId: "b", storeName: "B店", completeReportCount: 7, completePrizeCount: 50, targetPrizeCount: 15 },
    { storeId: "c", storeName: "C店", completeReportCount: 9, completePrizeCount: 100, targetPrizeCount: 20 },
  ]);
  assert.deepEqual(ranked.map((row) => [row.storeId, row.rank]), [["a", 1], ["b", 1], ["c", 3]]);
  assert.equal(ranked.some((row) => row.storeId === "small"), false);
});

test("確約景品は抽選景品集計に含めず、取り下げ済み投稿は全体から除外する", () => {
  const active = {
    status: "active", sourceType: "user", usageType: "normal",
    panelDraws: 5, panelWins: 1, mobileDraws: 0, mobileWins: 0,
    prizeBreakdownStatus: "complete", unknownPrizeCount: 0,
    prizes: [
      { acquisitionType: "draw", prizeCategoryId: "figure", quantity: 1 },
      { acquisitionType: "guaranteed", prizeCategoryId: "figure", quantity: 10 },
    ],
  };
  const summary = summarizeReports([active, { ...active, withdrawn: true, panelDraws: 100 }]);
  assert.equal(summary.reportCount, 1);
  assert.equal(summary.totalPanelDraws, 5);
  assert.equal(summary.totalPrizeCount, 1);
  assert.equal(summary.completePrizeCount, 1);
  assert.deepEqual(summary.completePrizes, { figure: 1 });
});
