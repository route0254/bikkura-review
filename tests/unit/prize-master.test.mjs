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
