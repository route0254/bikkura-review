import { cacheHeaders, json, unavailable } from "../_lib/http.js";
import { mapCampaign } from "../_lib/data.js";

export async function onRequestGet({ env }) {
  try {
    const campaigns = (await env.DB.prepare("SELECT id, name, starts_on, ends_on, source_url FROM campaigns WHERE published = 1 ORDER BY starts_on DESC").all()).results;
    const [prizeResult, itemResult] = await Promise.all([
      env.DB.prepare("SELECT id, campaign_id, name, sort_order FROM prize_categories WHERE active = 1 ORDER BY campaign_id, sort_order, id").all(),
      env.DB.prepare("SELECT id, campaign_id, prize_category_id, name, sort_order, image_asset FROM prize_items WHERE active = 1 ORDER BY campaign_id, prize_category_id, sort_order, id").all(),
    ]);
    const prizes = prizeResult.results;
    const prizeItems = itemResult.results;
    return json({
      items: campaigns.map((row) => ({
        ...mapCampaign(row),
        prizeCategories: prizes.filter((prize) => prize.campaign_id === row.id).map((prize) => ({ id: prize.id, name: prize.name, sortOrder: prize.sort_order })),
        prizeItems: prizeItems.filter((item) => item.campaign_id === row.id).map((item) => ({ id: item.id, prizeCategoryId: item.prize_category_id, name: item.name, sortOrder: item.sort_order, imageAsset: item.image_asset })),
      })),
    }, { headers: cacheHeaders(300) });
  } catch (error) { return unavailable(error); }
}
