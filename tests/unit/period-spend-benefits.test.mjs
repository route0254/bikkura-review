import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sqliteFixture, addReport, campaignId, storeId, categoryId } from "../helpers/sqlite.mjs";
import { comparisonPeriods, periodCondition, resolvePeriod } from "../../lib/periods.js";
import { readSpendStats, readPeriodComparison } from "../../functions/_lib/period-stats.js";
import { rankingScore, rankPrizeReports } from "../../lib/stats.js";
import { confirmationRows, postedShareData } from "../../lib/report-confirmation.js";
import { benefitFreshness, validateBenefit, benefitFingerprint } from "../../lib/benefits.js";
import { onRequestGet as statsGet } from "../../functions/api/stats.js";
import { onRequestGet as storeGet } from "../../functions/api/stores/[id].js";
import { onRequestGet as prefectureGet } from "../../functions/api/stats/prefectures.js";
import { onRequestGet as rankingGet } from "../../functions/api/rankings/figure.js";
import { onRequestGet as benefitsGet } from "../../functions/api/stores/[id]/benefits.js";
import { onRequestPost as benefitPost } from "../../functions/api/benefit-reports.js";
import { handleReportPost } from "../../functions/_lib/report-submission.js";
import { rebuildStoreCampaignStatements } from "../../functions/_lib/aggregate-rebuild.js";

const callGet = async (handler, db, period = "all") => {
  const response = await handler({ request: new Request(`https://example.test/api?campaign=${campaignId}&period=${period}`), env: { DB: db }, params: { id: storeId } });
  assert.equal(response.status, 200);
  return response.json();
};

test("共通期間の境界・第1/2/3・今日を含む7日", () => {
  const periods = comparisonPeriods(campaignId);
  for (const [date, expected] of [["2026-08-20", []], ["2026-08-21", ["period1"]], ["2026-09-03", ["period1"]], ["2026-09-04", ["period2"]], ["2026-09-17", ["period2"]], ["2026-09-18", ["period3"]], ["2026-09-30", ["period3"]], ["2026-10-01", []]]) assert.deepEqual(periods.filter((p) => p.startsOn <= date && p.endsOn >= date).map((p) => p.id), expected);
  assert.equal(resolvePeriod(campaignId, "7d", "2026-09-04").startsOn, "2026-08-29");
  assert.equal(resolvePeriod(campaignId, "7d", "2026-09-04").endsOn, "2026-09-04");
  assert.equal(resolvePeriod(campaignId, "injected"), null);
  assert.equal(resolvePeriod("other", "period1"), null);
  assert.deepEqual(periodCondition(resolvePeriod(campaignId)), { sql: "", bindings: [] });
});

test("0010は無損失・NULL維持の追加migration、抽選景品VIEWも後方互換", () => {
  const f = sqliteFixture({ beforeLatest: true });
  try {
    addReport(f.sqlite, { id: "legacy" }); addReport(f.sqlite, { id: "old-simple", simple: true });
    const snapshot = () => ["reports", "report_prizes", "report_total_prizes"].map((table) => f.sqlite.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n);
    const before = snapshot();
    const migration = readFileSync(new URL("../../migrations/0010_period_spend_benefits.sql", import.meta.url), "utf8");
    assert.doesNotMatch(migration, /DROP\s+(TABLE|COLUMN)|DELETE\s+FROM|CREATE\s+TABLE\s+reports\b/i);
    f.sqlite.exec(migration);
    assert.deepEqual(snapshot(), before);
    assert.equal(f.sqlite.prepare("SELECT simple_guaranteed_prize_count AS n FROM reports WHERE id='old-simple'").get().n, null);
    assert.equal(f.sqlite.prepare("SELECT SUM(quantity) n FROM active_draw_prizes").get().n, 5);
    assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM benefit_reports").get().n, 0);
  } finally { f.close(); }
});

test("D1同等SQLで中央値・金額帯・0除算・NULL/0と抽選/確定を区別", async () => {
  const f = sqliteFixture();
  try {
    for (const [i, spend, prizes, guaranteed] of [[1, 3000, 3, 1], [2, 4000, 4, 0], [3, 5200, 5, 1], [4, 6000, 6, 2], [5, 1000000, 100, null], [6, 2000, 0, 0]]) addReport(f.sqlite, { id: `spend-${i}`, simple: true, spend, prizes, guaranteed });
    const stats = await readSpendStats(f.db, campaignId, resolvePeriod(campaignId), storeId);
    assert.equal(stats.metrics.spend.median, 4600); assert.equal(stats.metrics.prizes.median, 4.5);
    assert.equal(stats.metrics.perPrize.count, 5); assert.equal(stats.metrics.perPrize.median, 1000);
    assert.equal(stats.metrics.per1000.count, 6); assert.ok(Math.abs(stats.metrics.per1000.median - (5000 / 5200 + 1) / 2) < 1e-9);
    assert.equal(stats.metrics.guaranteed.count, 5); assert.equal(stats.metrics.guaranteed.median, 1);
    assert.equal(stats.metrics.drawn.median, 4); assert.equal(stats.bands.length, 0);
    for (let i = 0; i < 5; i++) addReport(f.sqlite, { id: `band-${i}`, simple: true, spend: 4000, prizes: 4 });
    assert.equal((await readSpendStats(f.db, campaignId, resolvePeriod(campaignId))).bands[0].count, 8);
    assert.equal((await readSpendStats(f.db, campaignId, resolvePeriod(campaignId, "period2"))).reportCount, 0);
    assert.throws(() => addReport(f.sqlite, { id: "bad-count", simple: true, prizes: 1, guaranteed: 2 }), /CHECK/);
  } finally { f.close(); }
});

test("期間API・比較・個別景品・withdrawal復元。外部100件と特典100件は統計に混入しない", async () => {
  const f = sqliteFixture();
  try {
    for (let i = 0; i < 5; i++) addReport(f.sqlite, { id: `p1-${i}`, prizes: 10 });
    addReport(f.sqlite, { id: "p2", visitDate: "2026-09-04", prizes: 3 });
    addReport(f.sqlite, { id: "p3", visitDate: "2026-09-18", prizes: 4 });
    f.sqlite.exec(`INSERT INTO report_prize_item_breakdowns VALUES('p2','${categoryId}','complete'); INSERT INTO report_prize_items VALUES('p2','${categoryId}','chiikawa-2026-figure-chiikawa',3)`);
    await f.db.batch(rebuildStoreCampaignStatements({ DB: f.db }, storeId, campaignId));
    const before = await callGet(statsGet, f.db); const rankBefore = await callGet(rankingGet, f.db);
    assert.equal(rankBefore.items.length, 1);
    assert.deepEqual((await readPeriodComparison(f.db, storeId, campaignId)).map((p) => [p.reportCount, p.figureCount]), [[5, 50], [1, 3], [1, 4]]);
    const detail = await callGet(storeGet, f.db, "period2");
    assert.equal(detail.stats.reportCount, 1);
    assert.equal(detail.itemPrizes.find((p) => p.prizeCategoryId === categoryId).completeItemCount, 3);
    assert.equal((await callGet(prefectureGet, f.db, "period2")).items[0].reportCount, 1);
    for (let i = 0; i < 100; i++) {
      f.sqlite.prepare(`INSERT INTO external_reports(id,store_id,campaign_id,external_platform,external_observed_at,evidence_quality,result_precision) VALUES(?,?,?,'x','2026-09-04','B','partial')`).run(`external-${i}`, storeId, campaignId);
      f.sqlite.prepare(`INSERT INTO benefit_reports(id,store_id,benefit_id,observed_at,availability,created_at) VALUES(?,?,'chiikawa-2026-benefit-2','2026-09-04T00:00:00.000Z','available','2026-09-04T00:00:00.000Z')`).run(`benefit-${i}`, storeId);
    }
    const after = await callGet(statsGet, f.db);
    for (const key of ["reportCount", "totalDraws", "totalWins", "totalPrizeCount", "prizes", "spend"]) assert.deepEqual(after[key], before[key]);
    assert.deepEqual((await callGet(rankingGet, f.db)).items, rankBefore.items);
    const period = await callGet(statsGet, f.db, "period2");
    assert.equal(period.reportCount, 1); assert.equal(period.stores.find((s) => s.storeId === storeId).externalCollectionCount, 100);
    addReport(f.sqlite, { id: "simple-guaranteed", simple: true, prizes: 200, guaranteed: 199 });
    f.sqlite.prepare("INSERT INTO report_guaranteed_prizes VALUES(?,?,?)").run("p1-0", categoryId, 99);
    assert.deepEqual((await callGet(rankingGet, f.db)).items, rankBefore.items);
    f.sqlite.exec("INSERT INTO report_withdrawals(report_id,withdrawn_at) VALUES('p2','2026-09-04')");
    await f.db.batch(rebuildStoreCampaignStatements({ DB: f.db }, storeId, campaignId));
    assert.equal((await callGet(statsGet, f.db, "period2")).reportCount, 0);
    assert.equal((await callGet(storeGet, f.db, "period2")).stats.totalDraws, 0);
    assert.equal((await callGet(prefectureGet, f.db, "period2")).items.length, 0);
    f.sqlite.exec("DELETE FROM report_withdrawals WHERE report_id='p2'");
    await f.db.batch(rebuildStoreCampaignStatements({ DB: f.db }, storeId, campaignId));
    assert.equal((await callGet(statsGet, f.db, "period2")).reportCount, 1);
  } finally { f.close(); }
});

test("順位だけをWilson補正し、小サンプル・表示割合・閾値を保つ", () => {
  assert.ok(rankingScore(30, 100) > rankingScore(15, 50)); assert.equal(rankingScore(0, 0), 0);
  const rows = rankPrizeReports([
    { storeId: "small", completeReportCount: 4, completePrizeCount: 49, targetPrizeCount: 49 },
    { storeId: "50", completeReportCount: 5, completePrizeCount: 50, targetPrizeCount: 20 },
    { storeId: "500", completeReportCount: 30, completePrizeCount: 500, targetPrizeCount: 190 },
  ]);
  assert.deepEqual(rows.map((r) => r.storeId), ["500", "50"]); assert.equal(rows[1].share, 0.4);
});

test("確認と共有は許可項目だけ、NULLと0を区別して金額を共有しない", () => {
  const p = { resultInputMode: "simple", visitDate: "2026-09-04", panelWins: 0, mobileWins: 0, spendAmountYen: 5200, reportedTotalDraws: null, reportedPrizeCount: 5, simpleGuaranteedPrizeCount: 1, prizes: [], email: "secret@example.test", user_id: "private", turnstileToken: "private-token" };
  assert.equal(Object.fromEntries(confirmationRows(p, { name: "テスト店" }))["抽選由来の景品"], "4個");
  assert.equal(Object.fromEntries(confirmationRows({ ...p, simpleGuaranteedPrizeCount: null }, {}))["うち確定セット等"], "不明");
  assert.equal(Object.fromEntries(confirmationRows({ ...p, simpleGuaranteedPrizeCount: 0 }, {}))["うち確定セット等"], "0個");
  assert.doesNotMatch(JSON.stringify(confirmationRows(p, {})), /private|secret|token/);
  assert.doesNotMatch(JSON.stringify(postedShareData({ id: "store", name: "テスト店" }, campaignId)), /5200|5,200|private|secret/);
});

test("特典状態と24/48時間境界、未来日時拒否、重複キー", async () => {
  const now = new Date("2026-09-06T00:00:00.000Z");
  assert.equal(benefitFreshness("2026-09-05T00:00:00.000Z", now), "24h");
  assert.equal(benefitFreshness("2026-09-04T00:00:00.000Z", now), "48h");
  assert.equal(benefitFreshness("2026-09-03T23:59:59.999Z", now), "stale");
  const b = { id: "b", startsOn: "2026-09-04", endsOn: "2026-09-30" };
  const p = { storeId, benefitId: "b", observedAt: now.toISOString(), availability: "available" };
  for (const availability of ["available", "unavailable", "unknown"]) assert.deepEqual(validateBenefit({ ...p, availability }, b, now), []);
  assert.ok(validateBenefit({ ...p, observedAt: "2026-09-07T00:00:00.000Z" }, b, now).length);
  assert.ok(validateBenefit({ ...p, availability: "invalid" }, b, now).length);
  assert.equal(await benefitFingerprint("actor", p), await benefitFingerprint("actor", { ...p, availability: "unknown" }));
});

test("特典GETはactiveだけ・最新/24hを集約し個人識別情報を返さない", async () => {
  const f = sqliteFixture();
  try {
    for (const [id, hours, availability, status] of [["old", 50, "available", "active"], ["new", 1, "unavailable", "active"], ["hidden", 0, "available", "hidden"], ["pending", 0, "available", "pending"]]) {
      const date = new Date(Date.now() - hours * 3600_000).toISOString();
      f.sqlite.prepare("INSERT INTO benefit_reports(id,store_id,benefit_id,observed_at,availability,status,abuse_hash,created_at) VALUES(?,?,'chiikawa-2026-benefit-2',?,?,?,'private-hash',?)").run(id, storeId, date, availability, status, date);
    }
    const result = await callGet(benefitsGet, f.db); const second = result.items.find((i) => i.id.endsWith("-2"));
    assert.equal(second.latest.availability, "unavailable");
    assert.deepEqual(second.last24h, { available: 0, unavailable: 1, unknown: 0 });
    assert.doesNotMatch(JSON.stringify(result), /private-hash|user_id|abuse_hash/);
  } finally { f.close(); }
});

test("通常POST新フィールド保存と特典POSTの別枠・重複・日次上限・BAN制約", async (t) => {
  const f = sqliteFixture(); t.after(() => f.close());
  const nativeFetch = globalThis.fetch; t.after(() => { globalThis.fetch = nativeFetch; });
  let action = "report_submit"; globalThis.fetch = async () => Response.json({ success: true, action });
  const now = new Date(); const day = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  f.sqlite.prepare("UPDATE campaigns SET ends_on='2999-12-31' WHERE id=?").run(campaignId);
  f.sqlite.exec("UPDATE benefit_campaigns SET starts_on='2000-01-01', ends_on='2999-12-31'");
  const env = { DB: f.db, TURNSTILE_SECRET_KEY: "test", RATE_LIMIT_SALT: "test-salt" };
  const post = (handler, payload) => handler({ env, request: new Request("https://example.test/api", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://example.test" }, body: JSON.stringify(payload) }) });
  const result = await post(handleReportPost, { storeId, campaignId, visitDate: day, usageType: "unknown", resultInputMode: "simple", spendAmountYen: 5200, reportedTotalDraws: null, reportedPrizeCount: 5, simpleGuaranteedPrizeCount: 1, guaranteedPrizeCount: 0, prizeInputMode: "total", prizeBreakdownStatus: "unknown", panelDraws: 0, panelWins: 0, mobileDraws: 0, mobileWins: 0, unknownPrizeCount: 5, prizes: [], itemBreakdowns: [], turnstileToken: "token" });
  assert.equal(result.status, 201, await result.clone().text());
  assert.equal(f.sqlite.prepare("SELECT simple_guaranteed_prize_count AS n FROM reports").get().n, 1);
  action = "benefit_submit";
  const p = { storeId, benefitId: "chiikawa-2026-benefit-2", observedAt: now.toISOString(), availability: "available", turnstileToken: "token" };
  assert.equal((await post(benefitPost, p)).status, 201); assert.equal((await post(benefitPost, p)).status, 409);
  const stores = f.sqlite.prepare("SELECT id FROM stores WHERE active=1 AND id<>? LIMIT 5").all(storeId);
  for (const store of stores.slice(0, 4)) assert.equal((await post(benefitPost, { ...p, storeId: store.id })).status, 201);
  assert.equal((await post(benefitPost, { ...p, storeId: stores[4].id })).status, 429);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM daily_submission_slots").get().n, 1);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM benefit_submission_slots").get().n, 5);
  f.sqlite.exec("INSERT INTO users VALUES('banned','banned','2026-09-04','2026-09-04',NULL,NULL)");
  assert.throws(() => f.sqlite.prepare("INSERT INTO benefit_reports(id,store_id,benefit_id,observed_at,availability,user_id,created_at) VALUES('ban',?,'chiikawa-2026-benefit-2',?,'available','banned',?)").run(storeId, now.toISOString(), now.toISOString()), /banned-user/);
});
