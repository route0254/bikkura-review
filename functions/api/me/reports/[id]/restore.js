import { rebuildStoreCampaignStatements } from "../../../../_lib/aggregate-rebuild.js";
import { requireAuthenticatedUser } from "../../../../_lib/authenticated-user.js";
import { apiError, json, unavailable } from "../../../../_lib/http.js";
import { isSameOrigin } from "../../../../_lib/security.js";

export async function onRequestPost({ request, env, params }) {
  try {
    if (!isSameOrigin(request)) return apiError("送信元を確認できませんでした。", 403);
    const identity = await requireAuthenticatedUser(request, env);
    if (identity.error) return identity.error;
    const report = await env.DB.prepare(`
      SELECT report.id, report.store_id, report.campaign_id, report.status
      FROM reports report
      JOIN report_withdrawals withdrawal ON withdrawal.report_id = report.id
      WHERE report.id = ? AND report.user_id = ? AND report.source_type = 'user'
    `).bind(params.id, identity.userId).first();
    if (!report) return apiError("取り下げ済みの投稿が見つかりません。", 404);
    if (report.status !== "active") return apiError("確認中または非表示の投稿は復旧できません。", 409);
    const updatedAt = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM report_withdrawals WHERE report_id = ?").bind(report.id),
      ...rebuildStoreCampaignStatements(env, report.store_id, report.campaign_id, updatedAt),
    ]);
    return json({ id: report.id, status: "active" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return unavailable(error); }
}
