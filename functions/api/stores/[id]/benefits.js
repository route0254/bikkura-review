import { getCampaign, mapCampaign } from "../../../_lib/data.js";
import { apiError, json, unavailable } from "../../../_lib/http.js";
import { benefitFreshness } from "../../../../lib/benefits.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const url = new URL(request.url);
    const campaign = await getCampaign(env.DB, url.searchParams.get("campaign"));
    if (!campaign) return apiError("キャンペーンが見つかりません。", 404);
    const store = await env.DB.prepare("SELECT id FROM stores WHERE id = ? AND active = 1").bind(params.id).first();
    if (!store) return apiError("店舗が見つかりません。", 404);
    const now = new Date();
    const cutoff = new Date(now.getTime() - 24 * 3600_000).toISOString();
    const rows = (await env.DB.prepare(`
      SELECT benefit.*, latest.availability, latest.observed_at, latest.received_quantity,
        (SELECT COUNT(*) FROM active_benefit_reports r WHERE r.benefit_id = benefit.id AND r.store_id = ? AND r.status = 'active' AND r.observed_at BETWEEN ? AND ? AND r.availability = 'available') AS available_count,
        (SELECT COUNT(*) FROM active_benefit_reports r WHERE r.benefit_id = benefit.id AND r.store_id = ? AND r.status = 'active' AND r.observed_at BETWEEN ? AND ? AND r.availability = 'unavailable') AS unavailable_count,
        (SELECT COUNT(*) FROM active_benefit_reports r WHERE r.benefit_id = benefit.id AND r.store_id = ? AND r.status = 'active' AND r.observed_at BETWEEN ? AND ? AND r.availability = 'unknown') AS unknown_count
      FROM benefit_campaigns benefit
      LEFT JOIN active_benefit_reports latest ON latest.id = (
        SELECT id FROM active_benefit_reports WHERE benefit_id = benefit.id AND store_id = ? AND status = 'active' AND observed_at <= ?
        ORDER BY observed_at DESC, created_at DESC, id DESC LIMIT 1
      )
      WHERE benefit.campaign_id = ? AND benefit.active = 1 ORDER BY benefit.sort_order, benefit.id LIMIT 20
    `).bind(params.id, cutoff, now.toISOString(), params.id, cutoff, now.toISOString(), params.id, cutoff, now.toISOString(), params.id, now.toISOString(), campaign.id).all()).results;
    return json({ campaign: mapCampaign(campaign), asOf: now.toISOString(), items: rows.map((row) => ({
      id: row.id, name: row.name, startsOn: row.starts_on, endsOn: row.ends_on,
      conditions: row.conditions, sourceUrl: row.source_url, imageAsset: row.image_asset,
      conflicting: Number(row.available_count) > 0 && Number(row.unavailable_count) > 0,
      latest: row.observed_at ? { receivedQuantity: row.received_quantity ?? null, availability: row.availability, observedAt: row.observed_at, freshness: benefitFreshness(row.observed_at, now) } : null,
      last24h: { available: Number(row.available_count), unavailable: Number(row.unavailable_count), unknown: Number(row.unknown_count) },
    })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return unavailable(error); }
}
