import { getCampaign, mapCampaign } from "../_lib/data.js";
import { apiError, cacheHeaders, json, unavailable } from "../_lib/http.js";

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const campaign = await getCampaign(env.DB, url.searchParams.get("campaign"));
    if (!campaign) return apiError("キャンペーンが見つかりません。", 404);
    const rows = (await env.DB.prepare(`
      SELECT item.id, item.prize_category_id, item.name, item.sort_order
      FROM prize_items item
      JOIN prize_categories category ON category.id = item.prize_category_id
      WHERE item.campaign_id = ? AND item.active = 1 AND category.active = 1
      ORDER BY category.sort_order, item.sort_order, item.id
    `).bind(campaign.id).all()).results;
    return json({
      campaign: mapCampaign(campaign),
      items: rows.map((row) => ({ id: row.id, prizeCategoryId: row.prize_category_id, name: row.name, sortOrder: row.sort_order })),
    }, { headers: cacheHeaders(300) });
  } catch (error) { return unavailable(error); }
}
