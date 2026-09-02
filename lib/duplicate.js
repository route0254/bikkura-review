function canonicalPrizeEntries(prizes = []) {
  return prizes
    .filter((prize) => prize?.quantity > 0)
    .map((prize) => [String(prize.prizeCategoryId), Number(prize.quantity)])
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
  });
}

export async function createReportFingerprint(visitorHash, payload) {
  const source = `${visitorHash}:${duplicatePayloadSource(payload)}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
