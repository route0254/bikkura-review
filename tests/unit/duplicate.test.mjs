import test from "node:test";
import assert from "node:assert/strict";
import { createReportFingerprint, duplicatePayloadSource } from "../../lib/duplicate.js";

const report = {
  storeId: "store-1",
  campaignId: "campaign-1",
  visitDate: "2026-09-02",
  usageType: "normal",
  prizeBreakdownStatus: "complete",
  panelDraws: 10,
  panelWins: 2,
  mobileDraws: 0,
  mobileWins: 0,
  unknownPrizeCount: 0,
  prizes: [
    { prizeCategoryId: "prize-2", quantity: 1 },
    { prizeCategoryId: "prize-1", quantity: 1 },
  ],
  itemBreakdowns: [{ prizeCategoryId: "prize-1", status: "complete", items: [{ prizeItemId: "item-2", quantity: 1 }, { prizeItemId: "item-1", quantity: 1 }] }],
};

test("景品の入力順が違っても同一内容として正規化する", () => {
  const reordered = { ...report, prizes: [...report.prizes].reverse(), itemBreakdowns: [{ ...report.itemBreakdowns[0], items: [...report.itemBreakdowns[0].items].reverse() }] };
  assert.equal(duplicatePayloadSource(report), duplicatePayloadSource(reordered));
});

test("同じ利用者と内容は同じ指紋、内容が違えば異なる指紋になる", async () => {
  const original = await createReportFingerprint("visitor-hash", report);
  const same = await createReportFingerprint("visitor-hash", { ...report, prizes: [...report.prizes].reverse() });
  const changed = await createReportFingerprint("visitor-hash", { ...report, panelDraws: 11 });
  const changedItem = await createReportFingerprint("visitor-hash", { ...report, itemBreakdowns: [{ ...report.itemBreakdowns[0], items: [{ prizeItemId: "item-1", quantity: 2 }] }] });
  assert.equal(original, same);
  assert.notEqual(original, changed);
  assert.notEqual(original, changedItem);
});
