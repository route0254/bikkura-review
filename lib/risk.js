import { resultInputModeOf } from "./report-policy.js";

export const PENDING_RISK_SCORE = 70;

export function assessReportRisk(payload, context = {}) {
  const simpleReport = resultInputModeOf(payload) === "simple";
  const totalDraws = simpleReport
    ? Number(payload.reportedTotalDraws ?? 0)
    : Number(payload.panelDraws) + Number(payload.mobileDraws);
  const totalWins = simpleReport ? null : Number(payload.panelWins) + Number(payload.mobileWins);
  const sameStoreRecentCount = Number(context.sameStoreRecentCount ?? 0);
  const recentAbuseCount = Number(context.recentAbuseCount ?? 0);
  let score = 0;
  const reasons = [];

  if (totalDraws >= 200) { score += 30; reasons.push("very_large_draw_count"); }
  else if (totalDraws >= 120) { score += 20; reasons.push("large_draw_count"); }
  if (!simpleReport && totalDraws >= 120 && totalWins === 0) { score += 15; reasons.push("large_zero_win_report"); }
  if (sameStoreRecentCount >= 8) { score += 40; reasons.push("rapid_same_store_volume"); }
  else if (sameStoreRecentCount >= 4) { score += 20; reasons.push("elevated_same_store_volume"); }
  if (recentAbuseCount >= 30) { score += 40; reasons.push("high_recent_volume"); }
  else if (recentAbuseCount >= 15) { score += 20; reasons.push("elevated_recent_volume"); }

  score = Math.min(score, 100);
  return { score, reasons, status: score >= PENDING_RISK_SCORE ? "pending" : "active" };
}
