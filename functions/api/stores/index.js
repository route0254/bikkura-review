import { normalizeSearchText } from "../../../lib/search.js";
import { getCampaign, mapCampaign, mapStore } from "../../_lib/data.js";
import { boundedLimit, cacheHeaders, json, numericCursor, unavailable } from "../../_lib/http.js";

function escapeLike(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const campaign = await getCampaign(env.DB, url.searchParams.get("campaign"));
    const limit = boundedLimit(url.searchParams.get("limit"), 30, 100);
    const offset = numericCursor(url.searchParams.get("cursor"));
    const conditions = ["s.active = 1"];
    const values = [campaign?.id ?? ""];
    const prefecture = url.searchParams.get("prefecture")?.trim();
    const query = normalizeSearchText(url.searchParams.get("q") ?? "");
    if (prefecture) { conditions.push("s.prefecture = ?"); values.push(prefecture); }
    if (query) { conditions.push("s.search_text LIKE ? ESCAPE '\\'"); values.push(`%${escapeLike(query)}%`); }
    const where = conditions.join(" AND ");
    const rows = (await env.DB.prepare(`
      SELECT s.*, scs.report_count, scs.total_panel_draws, scs.total_panel_wins,
        scs.total_mobile_draws, scs.total_mobile_wins, scs.total_prize_count,
        scs.updated_at AS latest_report_at
      FROM stores s
      LEFT JOIN store_campaign_stats scs ON scs.store_id = s.id AND scs.campaign_id = ?
      WHERE ${where}
      ORDER BY s.name, s.id
      LIMIT ? OFFSET ?
    `).bind(...values, limit, offset).all()).results;
    const total = await env.DB.prepare(`SELECT COUNT(*) AS count FROM stores s WHERE ${where}`).bind(...values.slice(1)).first();
    return json({
      campaign: mapCampaign(campaign),
      items: rows.map(mapStore),
      total: Number(total.count),
      nextCursor: rows.length === limit ? String(offset + limit) : null,
    }, { headers: cacheHeaders(120) });
  } catch (error) { return unavailable(error); }
}
