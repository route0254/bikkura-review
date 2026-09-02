import { postingDecision } from "../../lib/posting.js";
import { json, unavailable } from "../_lib/http.js";
import { resolveIdentity } from "../_lib/report-submission.js";
import { todayInJapan } from "../../lib/validation.js";

export async function onRequestGet({ request, env }) {
  try {
    const now = new Date();
    const identity = await resolveIdentity(request, env, now);
    if (identity.error) return identity.error;
    const retentionCutoff = new Date(now.getTime() - 30 * 86_400_000).toISOString();
    const slotCutoff = todayInJapan(new Date(now.getTime() - 35 * 86_400_000));
    await env.DB.batch([
      env.DB.prepare("DELETE FROM daily_submission_slots WHERE local_date < ?").bind(slotCutoff),
      env.DB.prepare("UPDATE reports SET daily_rate_hash = NULL, abuse_hash = NULL WHERE created_at < ? AND (daily_rate_hash IS NOT NULL OR abuse_hash IS NOT NULL)").bind(retentionCutoff),
    ]);
    const user = identity.userId
      ? await env.DB.prepare("SELECT status FROM users WHERE id = ?").bind(identity.userId).first()
      : null;
    const userStatus = user?.status ?? "active";
    const usage = await env.DB.prepare("SELECT COUNT(*) AS count FROM daily_submission_slots WHERE actor_hash = ? AND local_date = ?")
      .bind(identity.actorHash, identity.localDate).first();
    const decision = postingDecision({ authenticated: identity.authenticated, userStatus, usedToday: usage?.count });
    return json({
      authenticated: identity.authenticated,
      accountStatus: userStatus,
      localDate: identity.localDate,
      dailyLimit: decision.dailyLimit,
      usedToday: decision.usedToday,
      remainingToday: decision.remainingToday,
      canPost: decision.allowed,
      message: decision.message ?? null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return unavailable(error); }
}
