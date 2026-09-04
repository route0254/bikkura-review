import { getCampaign, mapCampaign } from "../../../_lib/data.js";
import { apiError, json, unavailable } from "../../../_lib/http.js";
import { currentBenefit } from "../../../../lib/benefits.js";
import { todayInJapan } from "../../../../lib/validation.js";
import { readBenefitMasters, readBenefitRows, mapBenefitStatus } from "../../../_lib/benefit-data.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const url=new URL(request.url),now=new Date();
    const campaign=await getCampaign(env.DB,url.searchParams.get("campaign"));
    if(!campaign)return apiError("キャンペーンが見つかりません。",404);
    const store=await env.DB.prepare("SELECT id FROM stores WHERE id=? AND active=1").bind(params.id).first();
    if(!store)return apiError("店舗が見つかりません。",404);
    const benefits=await readBenefitMasters(env.DB,campaign.id);
    const selected=url.searchParams.get("benefit")?benefits.find((b)=>b.id===url.searchParams.get("benefit")):currentBenefit(benefits,todayInJapan(now));
    if(url.searchParams.get("benefit")&&!selected)return apiError("特典が見つかりません。",404);
    // 現行UIは current=1 または特典指定。旧APIの全特典取得も維持。
    const targets=url.searchParams.has("benefit")||url.searchParams.get("current")==="1"?(selected?[selected]:[]):benefits;
    const items=await Promise.all(targets.map(async b=>{
      const rows=await readBenefitRows(env.DB,b.id,{now,store:store.id,limit:241});
      return {...b,...mapBenefitStatus(rows.find((r)=>r.benefit_item_id===null),now),
        items:b.items.map((i)=>({...i,...mapBenefitStatus(rows.find((r)=>r.benefit_item_id===i.id),now)}))};
    }));
    return json({campaign:mapCampaign(campaign),asOf:now.toISOString(),benefits,selected:selected??null,items},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return unavailable(error);}
}
