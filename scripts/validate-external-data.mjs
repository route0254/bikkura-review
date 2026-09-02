import { readFile } from "node:fs/promises";
import { validateExternalReports } from "../lib/external-reports.js";

const root = new URL("../", import.meta.url);
const stores = JSON.parse(await readFile(new URL("data/stores.json", root), "utf8"));
const campaigns = JSON.parse(await readFile(new URL("data/campaigns.json", root), "utf8"));
const reports = JSON.parse(await readFile(new URL("seed/external-reports.json", root), "utf8"));
const campaignMap = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
const categories = new Map(campaigns.flatMap((campaign) => campaign.prizeCategories.map((category) => [category.id, { ...category, campaignId: campaign.id }])));
const prizeItems = new Map(campaigns.flatMap((campaign) => (campaign.prizeItems ?? []).map((item) => [item.id, { ...item, campaignId: campaign.id }])));
const errors = validateExternalReports(reports, {
  storeIds: new Set(stores.map((store) => store.id)),
  campaigns: campaignMap,
  categories,
  prizeItems,
});

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`external data: ${reports.length}件を確認しました`);
}
