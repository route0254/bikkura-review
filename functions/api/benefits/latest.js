import { getCampaign, mapCampaign } from "../../_lib/data.js";
import { apiError, boundedLimit, json, unavailable } from "../../_lib/http.js";
import { currentBenefit } from "../../../lib/benefits.js";
import { todayInJapan } from "../../../lib/validation.js";
import { readBenefitMasters, readBenefitRows, readBenefitItemSummary, mapBenefitStatus } from "../../_lib/benefit-data.js";

export async function onRequestGet({ request, env }) {
  try {
    const url=new URL(request.url), now=new Date();
    const campaign=await getCampaign(env.DB,url.searchParams.get("campaign"));
    if(!campaign)return apiError("キャンペーンが見つかりません。",404);
    const benefits=await readBenefitMasters(env.DB,campaign.id);
    const selected=url.searchParams.get("benefit")?benefits.find((b)=>b.id===url.searchParams.get("benefit")):currentBenefit(benefits,todayInJapan(now));
    const base={campaign:mapCampaign(campaign),asOf:now.toISOString(),benefits,selected:selected??null};
    if(url.searchParams.get("benefit")&&!selected)return apiError("特典が見つかりません。",404);
    if(!selected)return json({...base,items:[],itemSummary:[],hasMore:false},{headers:{"Cache-Control":"no-store"}});
    const item=url.searchParams.get("item");
    if(item&&item!=="legacy"&&!selected.items.some((i)=>i.id===item))return apiError("この特典の絵柄を選んでください。");
    if(url.searchParams.get("summary")==="1")return json({...base,items:[],itemSummary:await readBenefitItemSummary(env.DB,selected,now),hasMore:false},{headers:{"Cache-Control":"no-store"}});
    const limit=boundedLimit(url.searchParams.get("limit"),20,60),offset=Number(url.searchParams.get("offset")??0);
    if(!Number.isSafeInteger(offset)||offset<0||offset>10000)return apiError("ページ指定が不正です。");
    const rows=await readBenefitRows(env.DB,selected.id,{now,item,limit:limit+1,offset,
      prefecture:url.searchParams.get("prefecture"),q:(url.searchParams.get("q")??"").trim().slice(0,100),store:url.searchParams.get("store"),unavailableOnly:url.searchParams.get("unavailable")==="1"});
    return json({...base,hasMore:rows.length>limit,items:rows.slice(0,limit).map((r)=>({storeId:r.store_id,storeName:r.store_name,prefecture:r.prefecture,
      benefitItem:selected.items.find((i)=>i.id===r.benefit_item_id)??null,...mapBenefitStatus(r,now)}))},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return unavailable(error);}
}
