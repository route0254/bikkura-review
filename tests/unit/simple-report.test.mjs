import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createReportFingerprint } from "../../lib/duplicate.js";
import { assessReportRisk } from "../../lib/risk.js";
import { summarizeReports } from "../../lib/stats.js";
import { validateReportPayload } from "../../lib/validation.js";

const campaign = { id: "campaign-1", startsOn: "2026-08-21", endsOn: "2026-09-30" };
const context = {
  storeIds: new Set(["store-1"]),
  campaign,
  prizeCategoryIds: new Set(["prize-1", "prize-2"]),
  prizeItems: new Map(),
  today: "2026-09-03",
};

const simple = {
  storeId: "store-1",
  campaignId: "campaign-1",
  visitDate: "2026-09-03",
  resultInputMode: "simple",
  usageType: "unknown",
  prizeInputMode: "total",
  guaranteedPrizeCount: 0,
  spendAmountYen: 5000,
  reportedTotalDraws: null,
  reportedPrizeCount: 3,
  panelDraws: 0,
  panelWins: 0,
  mobileDraws: 0,
  mobileWins: 0,
  prizeBreakdownStatus: "partial",
  unknownPrizeCount: 1,
  prizes: [{ acquisitionType: "total", prizeCategoryId: "prize-1", quantity: 2 }],
  itemBreakdowns: [],
};

test("simple input validates spend and prize totals while draw count stays optional", () => {
  assert.deepEqual(validateReportPayload(simple, context), []);
  assert.deepEqual(validateReportPayload({ ...simple, reportedTotalDraws: 10 }, context), []);
  assert.notDeepEqual(validateReportPayload({ ...simple, spendAmountYen: null }, context), []);
  assert.notDeepEqual(validateReportPayload({ ...simple, reportedPrizeCount: 1, unknownPrizeCount: 0 }, context), []);
});

test("simple input is isolated from draw rate, usage, and draw-prize summaries", () => {
  const summary = summarizeReports([{ ...simple, status: "active", sourceType: "user", reportedTotalDraws: 12 }]);
  assert.equal(summary.reportCount, 1);
  assert.deepEqual(summary.simple, {
    reportCount: 1,
    spendAmountYen: 5000,
    reportedPrizeCount: 3,
    reportedDrawCount: 12,
    drawCountReportCount: 1,
  });
  assert.equal(summary.totalPanelDraws, 0);
  assert.equal(summary.totalPrizeCount, 0);
  assert.equal(summary.completeReportCount, 0);
  assert.deepEqual(summary.completePrizes, {});
  assert.equal(summary.usage.unknown.reportCount, 0);
});

test("simple totals participate in duplicate detection", async () => {
  const original = await createReportFingerprint("visitor-hash", simple);
  assert.notEqual(original, await createReportFingerprint("visitor-hash", { ...simple, spendAmountYen: 6000 }));
  assert.notEqual(original, await createReportFingerprint("visitor-hash", { ...simple, reportedTotalDraws: 10 }));
  assert.notEqual(original, await createReportFingerprint("visitor-hash", { ...simple, reportedPrizeCount: 4 }));
  assert.notEqual(original, await createReportFingerprint("visitor-hash", { ...simple, simpleGuaranteedPrizeCount: 0 }));
});

test("simple guaranteed count is nullable and cannot exceed total prizes", () => {
  for (const value of [null, 0, 1, 3]) assert.deepEqual(validateReportPayload({ ...simple, simpleGuaranteedPrizeCount: value }, context), []);
  for (const value of [-1, 4, 0.5, "1"]) assert.notDeepEqual(validateReportPayload({ ...simple, simpleGuaranteedPrizeCount: value }, context), []);
});

test("simple input does not infer zero wins for risk scoring", () => {
  const risk = assessReportRisk({ ...simple, reportedTotalDraws: 100 });
  assert.equal(risk.status, "active");
  assert.equal(risk.reasons.includes("large_zero_win_report"), false);
});

test("0009 keeps old reports detailed and only adds backward-compatible fields", async () => {
  const sql = await readFile(new URL("../../migrations/0009_simple_report_input.sql", import.meta.url), "utf8");
  assert.doesNotMatch(sql, /DROP\s+(?:TABLE|COLUMN)|DELETE\s+FROM\s+(?:reports|report_prizes)|CREATE\s+TABLE\s+reports\b/i);
  assert.match(sql, /ADD COLUMN result_input_mode[\s\S]*DEFAULT 'detailed'/i);
  assert.match(sql, /ADD COLUMN spend_amount_yen/i);
  assert.match(sql, /ADD COLUMN reported_total_draws/i);
  assert.match(sql, /ADD COLUMN reported_prize_count/i);
  assert.match(sql, /CREATE VIEW active_simple_reports[\s\S]*result_input_mode = 'simple'/i);
  assert.match(sql, /CREATE VIEW active_draw_prize_reports[\s\S]*result_input_mode = 'detailed'/i);
});
