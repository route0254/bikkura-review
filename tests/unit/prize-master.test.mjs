import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("景品マスターは公式内訳のフィギュア5・缶バッジ8・マグネット8を保持する", async () => {
  const campaigns = JSON.parse(await readFile(new URL("../../data/campaigns.json", import.meta.url), "utf8"));
  const campaign = campaigns.find((item) => item.id === "chiikawa-kurasushi-2026-summer");
  const expected = new Map([
    ["chiikawa-2026-figure", ["ちいかわ", "ハチワレ", "うさぎ", "モモンガ", "くりまんじゅう"]],
    ["chiikawa-2026-can-badge", ["ちいかわ", "ハチワレ", "うさぎ", "モモンガ", "くりまんじゅう", "ラッコ", "シーサー", "あのこ"]],
    ["chiikawa-2026-acrylic-magnet", ["ちいかわ", "ハチワレ", "うさぎ", "モモンガ", "くりまんじゅう", "ラッコ", "シーサー", "あのこ"]],
  ]);
  assert.equal(campaign.prizeItems.length, 21);
  for (const [categoryId, names] of expected) {
    assert.deepEqual(campaign.prizeItems.filter((item) => item.prizeCategoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder).map((item) => item.name), names);
  }
});


test("照合済み素材21点を既存stable ID・日本語名・カテゴリへ明示対応する", async () => {
  const campaigns = JSON.parse(await readFile(new URL("../../data/campaigns.json", import.meta.url), "utf8"));
  const items = campaigns.flatMap(c => c.prizeItems ?? []);
  const expected = [
  [
    "chiikawa-2026-figure-chiikawa",
    "chiikawa-2026-figure",
    "ちいかわ",
    "figure/chiikawa.png"
  ],
  [
    "chiikawa-2026-figure-hachiware",
    "chiikawa-2026-figure",
    "ハチワレ",
    "figure/hachiware.png"
  ],
  [
    "chiikawa-2026-figure-usagi",
    "chiikawa-2026-figure",
    "うさぎ",
    "figure/usagi.png"
  ],
  [
    "chiikawa-2026-figure-momonga",
    "chiikawa-2026-figure",
    "モモンガ",
    "figure/momonga.png"
  ],
  [
    "chiikawa-2026-figure-kurimanju",
    "chiikawa-2026-figure",
    "くりまんじゅう",
    "figure/kurimanju.png"
  ],
  [
    "chiikawa-2026-can-badge-chiikawa",
    "chiikawa-2026-can-badge",
    "ちいかわ",
    "badge/chiikawa.png"
  ],
  [
    "chiikawa-2026-can-badge-hachiware",
    "chiikawa-2026-can-badge",
    "ハチワレ",
    "badge/hachiware.png"
  ],
  [
    "chiikawa-2026-can-badge-usagi",
    "chiikawa-2026-can-badge",
    "うさぎ",
    "badge/usagi.png"
  ],
  [
    "chiikawa-2026-can-badge-momonga",
    "chiikawa-2026-can-badge",
    "モモンガ",
    "badge/momonga.png"
  ],
  [
    "chiikawa-2026-can-badge-kurimanju",
    "chiikawa-2026-can-badge",
    "くりまんじゅう",
    "badge/kurimanju.png"
  ],
  [
    "chiikawa-2026-can-badge-rakko",
    "chiikawa-2026-can-badge",
    "ラッコ",
    "badge/rakko.png"
  ],
  [
    "chiikawa-2026-can-badge-shisa",
    "chiikawa-2026-can-badge",
    "シーサー",
    "badge/shisa.png"
  ],
  [
    "chiikawa-2026-can-badge-anoko",
    "chiikawa-2026-can-badge",
    "あのこ",
    "badge/anoko.png"
  ],
  [
    "chiikawa-2026-acrylic-magnet-chiikawa",
    "chiikawa-2026-acrylic-magnet",
    "ちいかわ",
    "magnet/chiikawa.png"
  ],
  [
    "chiikawa-2026-acrylic-magnet-hachiware",
    "chiikawa-2026-acrylic-magnet",
    "ハチワレ",
    "magnet/hachiware.png"
  ],
  [
    "chiikawa-2026-acrylic-magnet-usagi",
    "chiikawa-2026-acrylic-magnet",
    "うさぎ",
    "magnet/usagi.png"
  ],
  [
    "chiikawa-2026-acrylic-magnet-momonga",
    "chiikawa-2026-acrylic-magnet",
    "モモンガ",
    "magnet/momonga.png"
  ],
  [
    "chiikawa-2026-acrylic-magnet-kurimanju",
    "chiikawa-2026-acrylic-magnet",
    "くりまんじゅう",
    "magnet/kurimanju.png"
  ],
  [
    "chiikawa-2026-acrylic-magnet-rakko",
    "chiikawa-2026-acrylic-magnet",
    "ラッコ",
    "magnet/rakko.png"
  ],
  [
    "chiikawa-2026-acrylic-magnet-shisa",
    "chiikawa-2026-acrylic-magnet",
    "シーサー",
    "magnet/shisa.png"
  ],
  [
    "chiikawa-2026-acrylic-magnet-anoko",
    "chiikawa-2026-acrylic-magnet",
    "あのこ",
    "magnet/anoko.png"
  ]
];
  assert.equal(new Set(expected.map(row => row[3])).size, 21);
  for (const [id, category, name, path] of expected) {
    const item = items.find(item => item.id === id);
    assert.equal(item?.name, name);
    assert.equal(item.prizeCategoryId, category);
    assert.equal(item.imageAsset, "/public/prizes/" + path);
    const png = await readFile(new URL("../../public/prizes/" + path, import.meta.url));
    assert.deepEqual([...png.subarray(0, 8)], [137,80,78,71,13,10,26,10]);
    assert.equal(png.readUInt32BE(16), 512);
    assert.equal(png.readUInt32BE(20), 512);
  }
});
