import { readFile, writeFile } from "node:fs/promises";
import { normalizeSearchText } from "../lib/search.js";

const root = new URL("../", import.meta.url);
const stores = JSON.parse(await readFile(new URL("data/stores.json", root), "utf8"));
const campaigns = JSON.parse(await readFile(new URL("data/campaigns.json", root), "utf8"));
const outputUrl = new URL("seed/seed.sql", root);
const sql = [];
const quote = (value) => value === null || value === undefined ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;

sql.push("-- data/*.json から生成。手動編集しないでください。", "PRAGMA foreign_keys = ON;", "");
for (const campaign of campaigns) {
  sql.push(`INSERT INTO campaigns (id, name, starts_on, ends_on, source_url, published) VALUES (${quote(campaign.id)}, ${quote(campaign.name)}, ${quote(campaign.startsOn)}, ${quote(campaign.endsOn)}, ${quote(campaign.sourceUrl)}, 1) ON CONFLICT(id) DO UPDATE SET name=excluded.name, starts_on=excluded.starts_on, ends_on=excluded.ends_on, source_url=excluded.source_url, published=excluded.published;`);
  for (const prize of campaign.prizeCategories) sql.push(`INSERT INTO prize_categories (id, campaign_id, name, sort_order, active) VALUES (${quote(prize.id)}, ${quote(campaign.id)}, ${quote(prize.name)}, ${Number(prize.sortOrder)}, 1) ON CONFLICT(id) DO UPDATE SET name=excluded.name, sort_order=excluded.sort_order, active=excluded.active;`);
  for (const item of campaign.prizeItems ?? []) {
    sql.push(`INSERT INTO prize_items (id, campaign_id, prize_category_id, name, sort_order, active) VALUES (${quote(item.id)}, ${quote(campaign.id)}, ${quote(item.prizeCategoryId)}, ${quote(item.name)}, ${Number(item.sortOrder)}, 1) ON CONFLICT(id) DO UPDATE SET campaign_id=excluded.campaign_id, prize_category_id=excluded.prize_category_id, name=excluded.name, sort_order=excluded.sort_order, active=excluded.active;`);
  }
  const itemIds = (campaign.prizeItems ?? []).map((item) => quote(item.id));
  if (itemIds.length) sql.push(`UPDATE prize_items SET active = 0 WHERE campaign_id = ${quote(campaign.id)} AND id NOT IN (${itemIds.join(", ")});`);
}
for (const store of stores) {
  const searchText = normalizeSearchText([store.name, store.prefecture, store.city, store.address].join(" "));
  sql.push(`INSERT INTO stores (id, name, prefecture, city, address, latitude, longitude, official_url, active, search_text) VALUES (${quote(store.id)}, ${quote(store.name)}, ${quote(store.prefecture)}, ${quote(store.city)}, ${quote(store.address)}, ${store.latitude ?? "NULL"}, ${store.longitude ?? "NULL"}, ${quote(store.officialUrl)}, ${store.active ? 1 : 0}, ${quote(searchText)}) ON CONFLICT(id) DO UPDATE SET name=excluded.name, prefecture=excluded.prefecture, city=excluded.city, address=excluded.address, latitude=excluded.latitude, longitude=excluded.longitude, official_url=excluded.official_url, active=excluded.active, search_text=excluded.search_text;`);
}
const currentStoreIds = stores.map((store) => quote(store.id)).join(", ");
sql.push(
  "",
  `UPDATE stores SET active = 0 WHERE id LIKE 'kura-%' AND id NOT IN (${currentStoreIds});`,
  "INSERT OR IGNORE INTO store_campaign_stats (store_id, campaign_id) SELECT stores.id, campaigns.id FROM stores CROSS JOIN campaigns WHERE stores.active = 1;",
  "INSERT OR IGNORE INTO store_campaign_usage_stats (store_id, campaign_id, usage_type) SELECT stores.id, campaigns.id, usage.usage_type FROM stores CROSS JOIN campaigns CROSS JOIN (SELECT 'normal' AS usage_type UNION ALL SELECT 'plus' UNION ALL SELECT 'unknown') AS usage WHERE stores.active = 1;",
  "PRAGMA optimize;",
  "",
);
const next = sql.join("\n");
const checkOnly = process.argv.includes("--check");
if (checkOnly) {
  const current = await readFile(outputUrl, "utf8").catch(() => "");
  if (current !== next) { console.error("seed/seed.sql が data/*.json と一致しません。pnpm db:seed を実行してください。"); process.exitCode = 1; }
  else console.log("seed: data/*.json と一致しています");
} else {
  await writeFile(outputUrl, next, "utf8");
  console.log("seed/seed.sql を更新しました");
}
