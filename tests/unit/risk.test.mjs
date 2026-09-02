import test from "node:test";
import assert from "node:assert/strict";
import { assessReportRisk } from "../../lib/risk.js";

const normal = { panelDraws: 20, panelWins: 4, mobileDraws: 0, mobileWins: 0 };

test("通常範囲の投稿は自動公開", () => {
  assert.deepEqual(assessReportRisk(normal), { score: 0, reasons: [], status: "active" });
});

test("低い当選率だけでは保留にしない", () => {
  assert.equal(assessReportRisk({ ...normal, panelDraws: 100, panelWins: 0 }).status, "active");
});

test("極端な回数と集中投稿は保守的に審査待ちにする", () => {
  const risk = assessReportRisk({ ...normal, panelDraws: 220, panelWins: 0 }, { sameStoreRecentCount: 8 });
  assert.equal(risk.status, "pending");
  assert.ok(risk.score >= 70);
  assert.ok(risk.reasons.includes("rapid_same_store_volume"));
});
