import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const stores = JSON.parse(await readFile(new URL("data/stores.json", root), "utf8"));
const campaigns = JSON.parse(await readFile(new URL("data/campaigns.json", root), "utf8"));
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
checkUnique(campaigns.flatMap((campaign) => campaign.prizeCategories ?? []), "prizeCategories");

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
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`data: ${stores.length}店舗、${campaigns.length}キャンペーンを確認しました`);
}
