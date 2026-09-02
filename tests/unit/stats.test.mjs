import test from "node:test";
import assert from "node:assert/strict";
import { summarizeReports } from "../../lib/stats.js";

test("公開中の投稿だけを集計する", () => {
  const summary = summarizeReports([
    { panelDraws: 18, panelWins: 6, mobileDraws: 3, mobileWins: 1, unknownPrizeCount: 1, prizes: [{ quantity: 6 }], status: "active" },
    { panelDraws: 100, panelWins: 100, mobileDraws: 0, mobileWins: 0, unknownPrizeCount: 0, prizes: [], status: "hidden" },
  ]);
  assert.deepEqual(summary, { reportCount: 1, totalPanelDraws: 18, totalPanelWins: 6, totalMobileDraws: 3, totalMobileWins: 1, totalPrizeCount: 6, totalUnknownPrizes: 1 });
});
