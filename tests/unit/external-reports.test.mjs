import test from "node:test";
import assert from "node:assert/strict";
import {
  EXTERNAL_PLATFORM_LABELS,
  filterPublicExternalReports,
  formatExternalQuantity,
  validateExternalReports,
} from "../../lib/external-reports.js";

const context = {
  storeIds: new Set(["store-1", "store-2"]),
  campaigns: new Map([["campaign-1", { id: "campaign-1", startsOn: "2026-08-21", endsOn: "2026-09-30" }]]),
  categories: new Map([["figure", { id: "figure", campaignId: "campaign-1" }]]),
  prizeItems: new Map([["figure-chiikawa", { id: "figure-chiikawa", campaignId: "campaign-1", prizeCategoryId: "figure" }]]),
};

const valid = {
  id: "external-1",
  storeId: "store-1",
  campaignId: "campaign-1",
  visitDate: "2026-08-21",
  visitDateLabel: null,
  externalPlatform: "x",
  externalUrl: "https://example.com/post/1",
  externalObservedAt: "2026-09-03",
  evidenceQuality: "A",
  resultPrecision: "complete",
  usageType: "unknown",
  panelDraws: null,
  panelWins: null,
  mobileDraws: null,
  mobileWins: null,
  totalPrizes: 1,
  totalPrizesKind: "exact",
  prizes: [{ prizeCategoryId: "figure", quantity: 1, quantityKind: "exact" }],
  items: [{ prizeCategoryId: "figure", prizeItemId: "figure-chiikawa", quantity: 1, quantityKind: "exact" }],
  noteInternal: "構造化した短い確認メモ",
  status: "active",
};

test("external platformとA/B/C、complete/partial/mention_onlyを保存できる", () => {
  const platforms = Object.keys(EXTERNAL_PLATFORM_LABELS);
  const reports = platforms.map((externalPlatform, index) => ({
    ...valid,
    id: `external-${index}`,
    externalPlatform,
    externalUrl: `https://example.com/post/${index}`,
    evidenceQuality: ["A", "B", "C"][index % 3],
    resultPrecision: ["complete", "partial", "mention_only"][index % 3],
  }));
  assert.deepEqual(validateExternalReports(reports, context), []);
  assert.deepEqual(Object.values(EXTERNAL_PLATFORM_LABELS), ["X", "Google Maps", "食べログ", "ブログ", "その他"]);
});

test("出典URL確認中でもactiveな構造化情報は公開対象にできる", () => {
  const noSource = { ...valid, externalUrl: null };
  assert.deepEqual(validateExternalReports([noSource], context), []);
  assert.deepEqual(filterPublicExternalReports([noSource]).map((report) => report.id), ["external-1"]);
});

test("店舗不明のexternal reportを保存できるが店舗表示から除外する", () => {
  const unlinked = { ...valid, storeId: null };
  const hidden = { ...valid, id: "external-hidden", externalUrl: null, status: "hidden" };
  assert.deepEqual(validateExternalReports([unlinked, hidden], context), []);
  assert.deepEqual(filterPublicExternalReports([unlinked, hidden, valid]).map((report) => report.id), ["external-1"]);
});

test("0個と不明、1個以上を区別する", () => {
  assert.equal(formatExternalQuantity(0, "exact"), "0個");
  assert.equal(formatExternalQuantity(null, "unknown"), "不明");
  assert.equal(formatExternalQuantity(1, "at_least"), "1個以上");
});

test("external URLの同一店舗での重複を拒否し、別店舗は許容する", () => {
  const duplicate = { ...valid, id: "external-duplicate" };
  assert.ok(validateExternalReports([valid, duplicate], context).some((error) => error.includes("重複")));
  const anotherStore = { ...duplicate, storeId: "store-2" };
  assert.deepEqual(validateExternalReports([valid, anotherStore], context), []);
});

test("景品カテゴリと個別景品の所属不一致を拒否する", () => {
  const wrong = {
    ...valid,
    items: [{ prizeCategoryId: "missing", prizeItemId: "figure-chiikawa", quantity: 1, quantityKind: "exact" }],
  };
  const errors = validateExternalReports([wrong], context);
  assert.ok(errors.some((error) => error.includes("カテゴリまたはキャンペーン")));
  assert.ok(errors.some((error) => error.includes("対応するカテゴリ")));
});

test("不明数量へ0を入れることとcompleteの不足内訳を拒否する", () => {
  const unknownAsZero = { ...valid, resultPrecision: "partial", totalPrizes: 0, totalPrizesKind: "unknown" };
  const incomplete = { ...valid, prizes: [], items: [] };
  assert.ok(validateExternalReports([unknownAsZero], context).some((error) => error.includes("null")));
  assert.ok(validateExternalReports([incomplete], context).some((error) => error.includes("全カテゴリ")));
});
