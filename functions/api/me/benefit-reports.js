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
    return json({items:rows.map((r)=>({id:r.id,storeName:r.store_name,benefitName:r.benefit_name,receivedQuantity:r.received_quantity ?? null,availability:r.availability,observedAt:r.observed_at,status:r.status}))},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return unavailable(error);}
}
