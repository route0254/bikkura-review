import { acquisitionTypeOf, resultInputModeOf } from "./report-policy.js";

function canonicalPrizeEntries(prizes = []) {
  return prizes
    .filter((prize) => prize?.quantity > 0)
    .map((prize) => [acquisitionTypeOf(prize), String(prize.prizeCategoryId), Number(prize.quantity)])
    .sort((left, right) => `${left[0]}:${left[1]}`.localeCompare(`${right[0]}:${right[1]}`));
}

function canonicalItemBreakdowns(breakdowns = []) {
  return breakdowns
    .map((breakdown) => [
      acquisitionTypeOf(breakdown),
      String(breakdown.prizeCategoryId),
      String(breakdown.status),
      (breakdown.items ?? [])
        .filter((item) => item?.quantity > 0)
        .map((item) => [String(item.prizeItemId), Number(item.quantity)])
        .sort(([left], [right]) => left.localeCompare(right)),
    ])
    .sort((left, right) => `${left[0]}:${left[1]}`.localeCompare(`${right[0]}:${right[1]}`));
}

export function duplicatePayloadSource(payload) {
  return JSON.stringify({
    ...(payload.goodsInput ? { goodsGuaranteedItems: (payload.goodsGuaranteedItems ?? []).map((i) => [i.prizeItemId, i.quantity]).sort(([a], [b]) => a.localeCompare(b)) } : {}),
    storeId: payload.storeId,
    campaignId: payload.campaignId,
    visitDate: payload.visitDate,
    resultInputMode: resultInputModeOf(payload),
    spendAmountYen: payload.spendAmountYen ?? null,
    reportedTotalDraws: payload.reportedTotalDraws ?? null,
    reportedPrizeCount: payload.reportedPrizeCount ?? null,
    usageType: payload.usageType,
    prizeInputMode: payload.prizeInputMode ?? "by_acquisition",
    guaranteedPrizeCount: payload.guaranteedPrizeCount ?? 0,
    simpleGuaranteedPrizeCount: payload.simpleGuaranteedPrizeCount ?? null,
    prizeBreakdownStatus: payload.prizeBreakdownStatus,
    panelDraws: payload.panelDraws,
    panelWins: payload.panelWins,
    mobileDraws: payload.mobileDraws,
    mobileWins: payload.mobileWins,
    unknownPrizeCount: payload.unknownPrizeCount,
    prizes: canonicalPrizeEntries(payload.prizes),
    itemBreakdowns: canonicalItemBreakdowns(payload.itemBreakdowns),
  });
}

export async function createReportFingerprint(visitorHash, payload) {
  const source = `${visitorHash}:${duplicatePayloadSource(payload)}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
