import test from "node:test";
import assert from "node:assert/strict";
import { filterStoresByPrefecture, PREFECTURES, sortPrefectures } from "../../lib/prefectures.js";

test("都道府県は北海道から沖縄県まで一般的な順序で定義する", () => {
  assert.equal(PREFECTURES.length, 47);
  assert.equal(PREFECTURES[0], "北海道");
  assert.equal(PREFECTURES.at(-1), "沖縄県");
  assert.deepEqual(sortPrefectures(["大阪府", "北海道", "東京都", "沖縄県"]), ["北海道", "東京都", "大阪府", "沖縄県"]);
});

test("都道府県で店舗を絞り込み、既存の検索正規化も利用する", () => {
  const stores = [
    { id: "1", name: "アイモール店", prefecture: "東京都", city: "新宿区", address: "東京都新宿区" },
    { id: "2", name: "なんば店", prefecture: "大阪府", city: "大阪市", address: "大阪府大阪市" },
  ];
  assert.deepEqual(filterStoresByPrefecture(stores, "東京都").map((store) => store.id), ["1"]);
  assert.deepEqual(filterStoresByPrefecture(stores, "東京都", "ｱｲﾓｰﾙ").map((store) => store.id), ["1"]);
  assert.deepEqual(filterStoresByPrefecture(stores, "", "大阪府").map((store) => store.id), ["2"]);
});
