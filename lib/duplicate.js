function canonicalPrizeEntries(prizes = []) {
  return prizes
    .filter((prize) => prize?.quantity > 0)
    .map((prize) => [String(prize.prizeCategoryId), Number(prize.quantity)])
    .sort(([left], [right]) => left.localeCompare(right));
}

function canonicalItemBreakdowns(breakdowns = []) {
  return breakdowns
    .map((breakdown) => [
      String(breakdown.prizeCategoryId),
      String(breakdown.status),
      (breakdown.items ?? [])
        .filter((item) => item?.quantity > 0)
        .map((item) => [String(item.prizeItemId), Number(item.quantity)])
        .sort(([left], [right]) => left.localeCompare(right)),
    ])
    .sort(([left], [right]) => left.localeCompare(right));
}

export function duplicatePayloadSource(payload) {
  return JSON.stringify({
    storeId: payload.storeId,
    campaignId: payload.campaignId,
    visitDate: payload.visitDate,
    usageType: payload.usageType,
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
