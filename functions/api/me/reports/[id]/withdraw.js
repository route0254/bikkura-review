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
      SELECT id, store_id, campaign_id FROM reports
      WHERE id = ? AND user_id = ? AND source_type = 'user'
    `).bind(params.id, identity.userId).first();
    if (!report) return apiError("投稿が見つかりません。", 404);
    const withdrawnAt = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO report_withdrawals (report_id, withdrawn_at, reason)
        VALUES (?, ?, 'user_request')
        ON CONFLICT(report_id) DO NOTHING
      `).bind(report.id, withdrawnAt),
      ...rebuildStoreCampaignStatements(env, report.store_id, report.campaign_id, withdrawnAt),
    ]);
    return json({ id: report.id, status: "withdrawn", withdrawnAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return unavailable(error); }
}
