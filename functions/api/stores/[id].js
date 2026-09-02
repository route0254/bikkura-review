import { getCampaign, mapCampaign, mapStore } from "../../_lib/data.js";
import { apiError, cacheHeaders, json, unavailable } from "../../_lib/http.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const url = new URL(request.url);
    const campaign = await getCampaign(env.DB, url.searchParams.get("campaign"));
    const store = await env.DB.prepare(`
      SELECT s.*, scs.report_count, scs.total_panel_draws, scs.total_panel_wins,
        scs.total_mobile_draws, scs.total_mobile_wins, scs.total_prize_count
      FROM stores s
      LEFT JOIN store_campaign_stats scs ON scs.store_id = s.id AND scs.campaign_id = ?
      WHERE s.id = ? AND s.active = 1
    `).bind(campaign?.id ?? "", params.id).first();
    if (!store) return apiError("店舗が見つかりません。", 404);
    const prizes = campaign ? (await env.DB.prepare(`
      SELECT pc.id, pc.name, COALESCE(scps.reported_quantity, 0) AS quantity
      FROM prize_categories pc
      LEFT JOIN store_campaign_prize_stats scps ON scps.prize_category_id = pc.id AND scps.store_id = ? AND scps.campaign_id = pc.campaign_id
      WHERE pc.campaign_id = ? AND pc.active = 1
      ORDER BY pc.sort_order, pc.id
    `).bind(store.id, campaign.id).all()).results : [];
    return json({ ...mapStore(store), campaign: mapCampaign(campaign), prizes: prizes.map((prize) => ({ id: prize.id, name: prize.name, quantity: Number(prize.quantity) })) }, { headers: cacheHeaders(60) });
  } catch (error) { return unavailable(error); }
}
