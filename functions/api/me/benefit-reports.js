import { requireAuthenticatedUser } from "../../_lib/authenticated-user.js";
import { boundedLimit, json, unavailable } from "../../_lib/http.js";
export async function onRequestGet({request,env}) {
  try {
    const identity=await requireAuthenticatedUser(request,env); if(identity.error)return identity.error;
    const limit=boundedLimit(new URL(request.url).searchParams.get("limit"),30,100);
    const rows=(await env.DB.prepare(`SELECT r.id,s.name AS store_name,b.name AS benefit_name,r.availability,r.observed_at,r.created_at,r.received_quantity,
      CASE WHEN w.report_id IS NOT NULL THEN 'withdrawn' ELSE r.status END AS status
      FROM benefit_reports r JOIN stores s ON s.id=r.store_id JOIN benefit_campaigns b ON b.id=r.benefit_id
      LEFT JOIN benefit_withdrawals w ON w.report_id=r.id WHERE r.user_id=? ORDER BY r.created_at DESC,r.id DESC LIMIT ?`).bind(identity.userId,limit).all()).results;
    const details=rows.length?(await env.DB.prepare(`SELECT i.*,m.name,m.image_asset FROM benefit_report_items i JOIN benefit_items m ON m.id=i.benefit_item_id WHERE i.report_id IN (${rows.map(()=>"?").join(",")}) ORDER BY m.sort_order,m.id`).bind(...rows.map((r)=>r.id)).all()).results:[];
    return json({items:rows.map((r)=>({id:r.id,storeName:r.store_name,benefitName:r.benefit_name,receivedQuantity:r.received_quantity ?? null,availability:r.availability,observedAt:r.observed_at,status:r.status,
      items:details.filter((i)=>i.report_id===r.id).map((i)=>({id:i.benefit_item_id,name:i.name,imageAsset:i.image_asset,availability:i.availability,observationType:i.observation_type,receivedQuantity:i.received_quantity??null}))}))},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return unavailable(error);}
}
