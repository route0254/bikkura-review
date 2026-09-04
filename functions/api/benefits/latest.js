import { getCampaign, mapCampaign } from "../../_lib/data.js";
import { apiError, boundedLimit, json, unavailable } from "../../_lib/http.js";
import { benefitFreshness, currentBenefit, conflictingBenefits } from "../../../lib/benefits.js";
import { todayInJapan } from "../../../lib/validation.js";

export async function onRequestGet({ request, env }) {
  try {
    const url=new URL(request.url), now=new Date();
    const campaign=await getCampaign(env.DB,url.searchParams.get("campaign"));
    if(!campaign) return apiError("キャンペーンが見つかりません。",404);
    const masters=(await env.DB.prepare("SELECT id,name,starts_on,ends_on,conditions,source_url,image_asset FROM benefit_campaigns WHERE campaign_id=? AND active=1 ORDER BY starts_on,id LIMIT 20").bind(campaign.id).all()).results.map((r)=>({id:r.id,name:r.name,startsOn:r.starts_on,endsOn:r.ends_on,conditions:r.conditions,sourceUrl:r.source_url,imageAsset:r.image_asset}));
    const selected=url.searchParams.get("benefit") ? masters.find((b)=>b.id===url.searchParams.get("benefit")) : currentBenefit(masters,todayInJapan(now));
    if(!selected) return json({campaign:mapCampaign(campaign),benefits:masters,selected:null,items:[],hasMore:false},{headers:{"Cache-Control":"no-store"}});
    const limit=boundedLimit(url.searchParams.get("limit"),30,60);
    const offset=Number(url.searchParams.get("offset")??0);
    if(!Number.isSafeInteger(offset)||offset<0||offset>10000) return apiError("ページ指定が不正です。");
    const prefecture=url.searchParams.get("prefecture"), q=(url.searchParams.get("q")??"").trim().slice(0,100), store=url.searchParams.get("store");
    const unavailableOnly=url.searchParams.get("unavailable")==="1";
    const rows=(await env.DB.prepare(`WITH recent AS (
      SELECT r.*,ROW_NUMBER() OVER(PARTITION BY store_id ORDER BY observed_at DESC,created_at DESC,id DESC) AS position
      FROM active_benefit_reports r WHERE benefit_id=? AND observed_at<=?
    ), counts AS (
      SELECT store_id,SUM(availability='available') AS available_count,SUM(availability='unavailable') AS unavailable_count,SUM(availability='unknown') AS unknown_count
      FROM recent WHERE observed_at>=? GROUP BY store_id
    ) SELECT s.id,s.name,s.prefecture,r.availability,r.observed_at,r.received_quantity,COALESCE(c.available_count,0) AS available_count,
      COALESCE(c.unavailable_count,0) AS unavailable_count,COALESCE(c.unknown_count,0) AS unknown_count
      FROM stores s JOIN recent r ON r.store_id=s.id AND r.position=1 LEFT JOIN counts c ON c.store_id=s.id
      WHERE s.active=1${prefecture?" AND s.prefecture=?":""}${q?" AND s.name LIKE ?":""}${store?" AND s.id=?":""}${unavailableOnly?" AND c.unavailable_count>0":""}
      ORDER BY r.observed_at DESC,s.id LIMIT ? OFFSET ?`).bind(selected.id,now.toISOString(),new Date(now.getTime()-86400000).toISOString(),...(prefecture?[prefecture]:[]),...(q?[`%${q}%`]:[]),...(store?[store]:[]),limit+1,offset).all()).results;
    return json({campaign:mapCampaign(campaign),asOf:now.toISOString(),benefits:masters,selected,hasMore:rows.length>limit,items:rows.slice(0,limit).map((r)=>{
      const last24h={available:Number(r.available_count),unavailable:Number(r.unavailable_count),unknown:Number(r.unknown_count)};
      return {storeId:r.id,storeName:r.name,prefecture:r.prefecture,latest:{receivedQuantity:r.received_quantity ?? null,availability:r.availability,observedAt:r.observed_at,freshness:benefitFreshness(r.observed_at,now)},last24h,conflicting:conflictingBenefits(last24h)};
    })},{headers:{"Cache-Control":"no-store"}});
  } catch(error){return unavailable(error);}
}
