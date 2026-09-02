import test from "node:test";
import assert from "node:assert/strict";
import { validateReportPayload } from "../../lib/validation.js";

const campaign = { id: "campaign-1", startsOn: "2026-08-21", endsOn: "2026-09-30" };
const context = { storeIds: new Set(["store-1"]), campaign, prizeCategoryIds: new Set(["prize-1", "prize-2"]), today: "2026-09-02" };
const valid = {
  storeId: "store-1", campaignId: "campaign-1", visitDate: "2026-09-02", usageType: "normal",
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
  const errors = validateReportPayload({ ...valid, panelWins: 1, mobileWins: 0 }, context);
  assert.ok(errors.some((error) => error.includes("景品個数の合計")));
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
