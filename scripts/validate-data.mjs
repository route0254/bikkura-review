import { readFile } from "node:fs/promises";
import { safeImageAsset } from "../lib/goods-ui.js";

const root = new URL("../", import.meta.url);
const stores = JSON.parse(await readFile(new URL("data/stores.json", root), "utf8"));
const campaigns = JSON.parse(await readFile(new URL("data/campaigns.json", root), "utf8"));
const benefits = JSON.parse(await readFile(new URL("data/benefits.json", root), "utf8"));
const errors = [];

function checkUnique(items, label) {
  const ids = new Set();
  for (const item of items) {
    if (!item.id || typeof item.id !== "string") errors.push(`${label}: id がありません`);
    else if (ids.has(item.id)) errors.push(`${label}: id が重複しています (${item.id})`);
    ids.add(item.id);
  }
}

checkUnique(stores, "stores");
checkUnique(campaigns, "campaigns");
checkUnique(benefits, "benefits");
for (const item of [...benefits, ...campaigns.flatMap((c)=>c.prizeItems??[])]) {
  if (item.imageAsset != null && safeImageAsset(item.imageAsset) !== item.imageAsset) errors.push(`${item.id}: imageAsset はプロジェクト内の画像パスにしてください`);
}
for (const benefit of benefits) {
  const campaign = campaigns.find((c) => c.id === benefit.campaignId);
  if (!campaign || !benefit.name || !benefit.conditions || typeof benefit.active !== "boolean" || !Number.isInteger(benefit.sortOrder)) errors.push(`${benefit.id}: 特典マスタが不正です`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(benefit.startsOn) || (campaign && (benefit.startsOn < campaign.startsOn || benefit.startsOn > campaign.endsOn)) || (benefit.endsOn !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(benefit.endsOn) || benefit.endsOn < benefit.startsOn))) errors.push(`${benefit.id}: 特典期間が不正です`);
  try { if (new URL(benefit.sourceUrl).protocol !== "https:") throw new Error(); } catch { errors.push(`${benefit.id}: 特典出典URLが不正です`); }
}
checkUnique(campaigns.flatMap((campaign) => campaign.prizeCategories ?? []), "prizeCategories");
checkUnique(campaigns.flatMap((campaign) => campaign.prizeItems ?? []), "prizeItems");

for (const store of stores) {
  for (const key of ["name", "prefecture", "city", "address", "officialUrl"]) if (!store[key] || typeof store[key] !== "string") errors.push(`${store.id}: ${key} がありません`);
  if (typeof store.active !== "boolean") errors.push(`${store.id}: active は真偽値にしてください`);
  if (store.latitude !== null && (typeof store.latitude !== "number" || store.latitude < -90 || store.latitude > 90)) errors.push(`${store.id}: latitude が不正です`);
  if (store.longitude !== null && (typeof store.longitude !== "number" || store.longitude < -180 || store.longitude > 180)) errors.push(`${store.id}: longitude が不正です`);
  try { new URL(store.officialUrl); } catch { errors.push(`${store.id}: officialUrl が不正です`); }
}

for (const campaign of campaigns) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(campaign.startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(campaign.endsOn) || campaign.endsOn < campaign.startsOn) errors.push(`${campaign.id}: 開催期間が不正です`);
  if (!campaign.prizeCategories?.length) errors.push(`${campaign.id}: 景品カテゴリがありません`);
  const categoryIds = new Set(campaign.prizeCategories?.map((category) => category.id) ?? []);
  for (const category of campaign.prizeCategories ?? []) {
    if (!Number.isInteger(category.expectedItemCount) || category.expectedItemCount < 0) errors.push(`${category.id}: expectedItemCount は0以上の整数にしてください`);
    const actual = (campaign.prizeItems ?? []).filter((item) => item.prizeCategoryId === category.id).length;
    if (Number.isInteger(category.expectedItemCount) && actual !== category.expectedItemCount) errors.push(`${category.id}: 個別景品は${category.expectedItemCount}種の予定ですが${actual}種です`);
  }
  for (const item of campaign.prizeItems ?? []) {
    if (!categoryIds.has(item.prizeCategoryId)) errors.push(`${item.id}: 同じキャンペーンの景品カテゴリに属していません`);
    if (!item.name || typeof item.name !== "string") errors.push(`${item.id}: name がありません`);
    if (!Number.isInteger(item.sortOrder) || item.sortOrder < 0) errors.push(`${item.id}: sortOrder が不正です`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`data: ${stores.length}店舗、${campaigns.length}キャンペーンを確認しました`);
}
