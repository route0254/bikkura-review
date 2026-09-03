import test from "node:test";
import assert from "node:assert/strict";
import { validateReportPayload } from "../../lib/validation.js";

const campaign = { id: "campaign-1", startsOn: "2026-08-21", endsOn: "2026-09-30" };
const context = {
  storeIds: new Set(["store-1"]), campaign, prizeCategoryIds: new Set(["prize-1", "prize-2"]), today: "2026-09-02",
  prizeItems: new Map([["item-1", { prizeCategoryId: "prize-1" }], ["item-2", { prizeCategoryId: "prize-1" }], ["item-3", { prizeCategoryId: "prize-2" }]]),
};
const valid = {
  storeId: "store-1", campaignId: "campaign-1", visitDate: "2026-09-02", usageType: "normal",
  prizeBreakdownStatus: "complete",
  panelDraws: 18, panelWins: 6, mobileDraws: 3, mobileWins: 1, unknownPrizeCount: 0,
  prizes: [{ prizeCategoryId: "prize-1", quantity: 4 }, { prizeCategoryId: "prize-2", quantity: 3 }],
};

test("正しい投稿データを受け付ける", () => {
  assert.deepEqual(validateReportPayload(valid, context), []);
});

test("負数と上限超過を拒否する", () => {
  const errors = validateReportPayload({ ...valid, panelDraws: -1, mobileWins: 501 }, context);
  assert.ok(errors.some((error) => error.includes("タッチパネル")));
  assert.ok(errors.some((error) => error.includes("スマホ注文")));
});

test("当たり回数が抽選回数を超える投稿を拒否する", () => {
  const errors = validateReportPayload({ ...valid, panelDraws: 2, panelWins: 3, prizes: [] }, context);
  assert.ok(errors.some((error) => error.includes("抽選回数以下")));
});

test("景品数が当たり数を超える投稿を拒否する", () => {
  const errors = validateReportPayload({ ...valid, panelWins: 1, mobileWins: 0, prizeBreakdownStatus: "partial" }, context);
  assert.ok(errors.some((error) => error.includes("景品個数の合計")));
});

test("内訳をすべて入力した投稿は景品数と当たり数の一致を必須にする", () => {
  const mismatch = validateReportPayload({ ...valid, prizes: [{ prizeCategoryId: "prize-1", quantity: 6 }] }, context);
  assert.ok(mismatch.some((error) => error.includes("一致")));

  const unknown = validateReportPayload({ ...valid, unknownPrizeCount: 1 }, context);
  assert.ok(unknown.some((error) => error.includes("内訳不明")));
});

test("一部不明または未入力なら景品数が当たり数以下の投稿を受け付ける", () => {
  const partial = validateReportPayload({ ...valid, prizeBreakdownStatus: "partial", prizes: [{ prizeCategoryId: "prize-1", quantity: 2 }] }, context);
  const unknown = validateReportPayload({ ...valid, prizeBreakdownStatus: "unknown", prizes: [], unknownPrizeCount: 0 }, context);
  assert.deepEqual(partial, []);
  assert.deepEqual(unknown, []);
});

test("景品内訳の入力状況が未選択なら拒否する", () => {
  const errors = validateReportPayload({ ...valid, prizeBreakdownStatus: "" }, context);
  assert.ok(errors.some((error) => error.includes("入力状況")));
});

test("存在しない店舗・キャンペーン・景品IDを拒否する", () => {
  const errors = validateReportPayload({ ...valid, storeId: "missing", campaignId: "missing", prizes: [{ prizeCategoryId: "missing", quantity: 1 }] }, context);
  assert.ok(errors.some((error) => error.includes("店舗")));
  assert.ok(errors.some((error) => error.includes("キャンペーン")));
  assert.ok(errors.some((error) => error.includes("景品の種類")));
});

test("未来日とキャンペーン期間外を拒否する", () => {
  const future = validateReportPayload({ ...valid, visitDate: "2026-09-03" }, context);
  const before = validateReportPayload({ ...valid, visitDate: "2026-08-20" }, context);
  assert.ok(future.some((error) => error.includes("今日以前")));
  assert.ok(before.some((error) => error.includes("キャンペーン期間内")));
});

test("1件の抽選回数は合計300回まで", () => {
  const errors = validateReportPayload({ ...valid, panelDraws: 200, panelWins: 6, mobileDraws: 101, mobileWins: 1 }, context);
  assert.ok(errors.some((error) => error.includes("合計300回")));
});

test("個別景品のcomplete・partial・unknownをカテゴリ個数と照合する", () => {
  const complete = { ...valid, itemBreakdowns: [{ prizeCategoryId: "prize-1", status: "complete", items: [{ prizeItemId: "item-1", quantity: 1 }, { prizeItemId: "item-2", quantity: 3 }] }] };
  const partial = { ...valid, itemBreakdowns: [{ prizeCategoryId: "prize-1", status: "partial", items: [{ prizeItemId: "item-1", quantity: 2 }] }] };
  const unknown = { ...valid, itemBreakdowns: [{ prizeCategoryId: "prize-1", status: "unknown", items: [] }] };
  assert.deepEqual(validateReportPayload(complete, context), []);
  assert.deepEqual(validateReportPayload(partial, context), []);
  assert.deepEqual(validateReportPayload(unknown, context), []);
});

test("個別景品の整数・重複・所属・カテゴリ上限を検証する", () => {
  const errors = validateReportPayload({ ...valid, itemBreakdowns: [{
    prizeCategoryId: "prize-1", status: "complete", items: [
      { prizeItemId: "item-1", quantity: 3.5 },
      { prizeItemId: "item-1", quantity: 3 },
      { prizeItemId: "item-3", quantity: 2 },
    ],
  }] }, context);
  assert.ok(errors.some((error) => error.includes("整数")));
  assert.ok(errors.some((error) => error.includes("重複")));
  assert.ok(errors.some((error) => error.includes("一致しません")));
  const overLimit = validateReportPayload({ ...valid, itemBreakdowns: [{ prizeCategoryId: "prize-1", status: "complete", items: [{ prizeItemId: "item-1", quantity: 3 }, { prizeItemId: "item-2", quantity: 3 }] }] }, context);
  assert.ok(overLimit.some((error) => error.includes("カテゴリ個数以下")));
});

test("completeとpartialの個別景品合計ルールを検証する", () => {
  const incomplete = validateReportPayload({ ...valid, itemBreakdowns: [{ prizeCategoryId: "prize-1", status: "complete", items: [{ prizeItemId: "item-1", quantity: 2 }] }] }, context);
  const falselyPartial = validateReportPayload({ ...valid, itemBreakdowns: [{ prizeCategoryId: "prize-1", status: "partial", items: [{ prizeItemId: "item-1", quantity: 4 }] }] }, context);
  assert.ok(incomplete.some((error) => error.includes("カテゴリ個数と一致")));
  assert.ok(falselyPartial.some((error) => error.includes("すべて入力した状態")));
});

test("抽選景品と確約景品を分離し、確約景品は当たり数との一致判定に含めない", () => {
  const payload = {
    ...valid,
    prizes: [
      { acquisitionType: "draw", prizeCategoryId: "prize-1", quantity: 4 },
      { acquisitionType: "draw", prizeCategoryId: "prize-2", quantity: 3 },
      { acquisitionType: "guaranteed", prizeCategoryId: "prize-1", quantity: 20 },
    ],
  };
  assert.deepEqual(validateReportPayload(payload, context), []);
  const invalid = validateReportPayload({ ...payload, prizes: [{ acquisitionType: "unknown", prizeCategoryId: "prize-1", quantity: 1 }] }, context);
  assert.ok(invalid.some((error) => error.includes("取得経路")));
});

test("新しい入力では確定セット等を回数として持ち、景品カテゴリは取得経路共通の合計にする", () => {
  const payload = {
    ...valid,
    prizeInputMode: "total",
    guaranteedPrizeCount: 2,
    prizes: [
      { acquisitionType: "total", prizeCategoryId: "prize-1", quantity: 5 },
      { acquisitionType: "total", prizeCategoryId: "prize-2", quantity: 4 },
    ],
    itemBreakdowns: [{
      acquisitionType: "total", prizeCategoryId: "prize-1", status: "partial",
      items: [{ prizeItemId: "item-1", quantity: 2 }],
    }],
  };
  assert.deepEqual(validateReportPayload(payload, context), []);
  const wrongTotal = validateReportPayload({ ...payload, guaranteedPrizeCount: 1 }, context);
  assert.ok(wrongTotal.some((error) => error.includes("確定セット等")));
  const mixed = validateReportPayload({ ...payload, prizes: [{ acquisitionType: "draw", prizeCategoryId: "prize-1", quantity: 8 }] }, context);
  assert.ok(mixed.some((error) => error.includes("入力方法と一致")));
});

test("終了済みキャンペーンへの新規投稿を拒否する", () => {
  const errors = validateReportPayload(valid, { ...context, today: "2026-10-01" });
  assert.ok(errors.some((error) => error.includes("終了したキャンペーン")));
});
