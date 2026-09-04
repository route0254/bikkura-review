import { getCampaign, mapCampaign } from "../../_lib/data.js";
import { apiError, cacheHeaders, json, unavailable } from "../../_lib/http.js";
import { periodCondition, resolvePeriod } from "../../../lib/periods.js";

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const campaign = await getCampaign(env.DB, url.searchParams.get("campaign"));
    if (!campaign) return apiError("キャンペーンが見つかりません。", 404);
    const period = resolvePeriod(campaign.id, url.searchParams.get("period") ?? "all");
    if (!period) return apiError("集計期間が不正です。");
    const dates = periodCondition(period, "r.visit_date");
    const store = url.searchParams.get("store"), prefecture = url.searchParams.get("prefecture");
    const binds = [campaign.id, ...dates.bindings, ...(store ? [store] : []), ...(prefecture ? [prefecture] : [])];
    const scope = `WITH scope AS (SELECT r.* FROM active_user_reports r JOIN stores s ON s.id=r.store_id AND s.active=1
      WHERE r.campaign_id=? ${dates.sql}${store ? " AND r.store_id=?" : ""}${prefecture ? " AND s.prefecture=?" : ""})`;
    const [categoryRows, itemRows, summary] = await Promise.all([
      env.DB.prepare(`${scope}, counts AS (
        SELECT p.prize_category_id, SUM(p.quantity) AS quantity, COUNT(DISTINCT r.id) AS report_count
        FROM scope r JOIN report_observed_prizes p ON p.report_id=r.id GROUP BY p.prize_category_id
      ), complete AS (
        SELECT p.prize_category_id, COUNT(*) AS report_count, SUM(p.quantity) AS quantity
        FROM scope r JOIN report_observed_prizes p ON p.report_id=r.id
        WHERE p.quantity > 0 AND p.quantity=(SELECT SUM(i.quantity) FROM report_observed_items i WHERE i.report_id=r.id AND i.prize_category_id=p.prize_category_id)
        GROUP BY p.prize_category_id
      ) SELECT c.id,c.name,c.sort_order,COALESCE(n.quantity,0) AS quantity,COALESCE(n.report_count,0) AS report_count,
        COALESCE(x.quantity,0) AS complete_quantity,COALESCE(x.report_count,0) AS complete_reports
        FROM prize_categories c LEFT JOIN counts n ON n.prize_category_id=c.id LEFT JOIN complete x ON x.prize_category_id=c.id
        WHERE c.campaign_id=? AND c.active=1 ORDER BY c.sort_order,c.id`).bind(...binds, campaign.id).all(),
      env.DB.prepare(`${scope}, counts AS (
        SELECT i.prize_item_id,SUM(i.quantity) AS quantity,
          SUM(CASE WHEN p.quantity=(SELECT SUM(j.quantity) FROM report_observed_items j WHERE j.report_id=r.id AND j.prize_category_id=i.prize_category_id) THEN i.quantity ELSE 0 END) AS complete_quantity
        FROM scope r JOIN report_observed_items i ON i.report_id=r.id
        JOIN report_observed_prizes p ON p.report_id=r.id AND p.prize_category_id=i.prize_category_id GROUP BY i.prize_item_id
      ) SELECT i.id,i.name,i.prize_category_id,i.image_asset,COALESCE(n.quantity,0) AS quantity,COALESCE(n.complete_quantity,0) AS complete_quantity
        FROM prize_items i JOIN prize_categories c ON c.id=i.prize_category_id AND c.active=1 LEFT JOIN counts n ON n.prize_item_id=i.id
        WHERE i.campaign_id=? AND i.active=1 ORDER BY c.sort_order,i.sort_order,i.id`).bind(...binds,campaign.id).all(),
      env.DB.prepare(`${scope} SELECT COUNT(*) AS report_count,
        COALESCE(SUM(CASE WHEN result_input_mode='simple' OR goods_input=1 THEN reported_prize_count
          ELSE unknown_prize_count + COALESCE((SELECT SUM(quantity) FROM report_observed_prizes p WHERE p.report_id=scope.id),0) END),0) AS total_prizes
        FROM scope`).bind(...binds).first(),
    ]);
    return json({ campaign: mapCampaign(campaign), period, reportCount: Number(summary.report_count), totalPrizes: Number(summary.total_prizes),
      categories: categoryRows.results.map((c) => ({ id:c.id,name:c.name,quantity:Number(c.quantity),reportCount:Number(c.report_count),completeReports:Number(c.complete_reports),completeQuantity:Number(c.complete_quantity),
        items:itemRows.results.filter((i)=>i.prize_category_id===c.id).map((i)=>({id:i.id,name:i.name,prizeCategoryId:c.id,imageAsset:i.image_asset,quantity:Number(i.quantity),
          share:c.complete_reports>=3 && c.complete_quantity>=10 ? Number(i.complete_quantity)/Number(c.complete_quantity) : null})),
        unknownDesignQuantity: Math.max(0,Number(c.quantity)-itemRows.results.filter((i)=>i.prize_category_id===c.id).reduce((n,i)=>n+Number(i.quantity),0)),
      })) }, { headers: cacheHeaders(60) });
  } catch (error) { return unavailable(error); }
}
