import { requireAuthenticatedUser } from "../../../../_lib/authenticated-user.js";
import { apiError,json,unavailable } from "../../../../_lib/http.js";
import { isSameOrigin } from "../../../../_lib/security.js";
export async function onRequestPost({request,env,params}) {
  try {
    if(!isSameOrigin(request))return apiError("このサイトから操作してください。",403);
    const identity=await requireAuthenticatedUser(request,env);if(identity.error)return identity.error;
    return await withdrawBenefitReport(env,params.id,identity.userId);
  }catch(error){return unavailable(error);}
}
export async function withdrawBenefitReport(env,reportId,userId) {
  const report=await env.DB.prepare("SELECT id FROM benefit_reports WHERE id=? AND user_id=?").bind(reportId,userId).first();
  if(!report)return apiError("投稿が見つかりません。",404);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO benefit_withdrawals(report_id,withdrawn_at) VALUES(?,?) ON CONFLICT(report_id) DO NOTHING").bind(report.id,new Date().toISOString()),
    // 取り下げ後は訂正版を報告できる。消費済みの日次枠は戻さない。
    env.DB.prepare("DELETE FROM benefit_fingerprints WHERE report_id=?").bind(report.id),
  ]);
  return json({id:report.id,status:"withdrawn"},{headers:{"Cache-Control":"no-store"}});
}
