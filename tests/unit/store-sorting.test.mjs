import test from "node:test";
import assert from "node:assert/strict";
import { distanceKm, sortStores } from "../../lib/store-sorting.js";

const stores = [
  { name: "B店", latitude: 35.7, longitude: 139.7, stats: { reportCount: 2, externalCollectionCount: 4, totalDraws: 20, latestReportAt: "2026-09-01T00:00:00Z" } },
  { name: "A店", latitude: 35.0, longitude: 135.0, stats: { reportCount: 5, totalDraws: 10, latestReportAt: "2026-09-02T00:00:00Z" } },
];

test("店舗を名称・投稿・抽選・新着で安定して並べ替える", () => {
  assert.deepEqual(sortStores(stores, "default").map((store) => store.name), ["B店", "A店"]);
  assert.deepEqual(sortStores(stores, "name").map((store) => store.name), ["A店", "B店"]);
  assert.deepEqual(sortStores(stores, "reports").map((store) => store.name), ["A店", "B店"]);
  assert.deepEqual(sortStores(stores, "draws").map((store) => store.name), ["B店", "A店"]);
  assert.deepEqual(sortStores(stores, "recent").map((store) => store.name), ["A店", "B店"]);
});

test("現在地は端末内の距離計算だけに使用して近い順に並べる", () => {
  const origin = { latitude: 35.69, longitude: 139.69 };
  assert.ok(distanceKm(origin, stores[0]) < distanceKm(origin, stores[1]));
  assert.deepEqual(sortStores(stores, "nearest", origin).map((store) => store.name), ["B店", "A店"]);
});
