export const BENEFIT_LABELS = { available: "受け取れた", unavailable: "配布終了と案内された", unknown: "確認できなかった" };
export const conflictingBenefits = (counts = {}) => Number(counts.available) > 0 && Number(counts.unavailable) > 0;
export function currentBenefit(benefits, today) {
  return [...benefits].filter((b)=>b.startsOn<=today && (!b.endsOn||b.endsOn>=today)).sort((a,b)=>b.startsOn.localeCompare(a.startsOn))[0] ?? null;
}

export function benefitFreshness(observedAt, now = new Date()) {
  const age = now.getTime() - new Date(observedAt).getTime();
  if (!Number.isFinite(age) || age < 0) return "unknown";
  return age <= 24 * 3600_000 ? "24h" : age <= 48 * 3600_000 ? "48h" : "stale";
}

export function validateBenefit(payload, benefit, now = new Date()) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return ["投稿データが不正です。"];
  const errors = [];
  if (!benefit || payload.benefitId !== benefit.id) errors.push("特典を選択してください。");
  if (!Object.hasOwn(BENEFIT_LABELS, payload.availability)) errors.push("確認した状態を選択してください。");
  if (payload.receivedQuantity != null && (payload.availability !== "available" || !Number.isInteger(payload.receivedQuantity) || payload.receivedQuantity < 1 || payload.receivedQuantity > 300)) errors.push("受け取った個数は、受け取れた場合のみ1〜300の整数で入力してください。");
  const date = new Date(payload.observedAt);
  const iso = typeof payload.observedAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(payload.observedAt);
  if (!iso || !Number.isFinite(date.getTime()) || date.toISOString() !== payload.observedAt || date > now) errors.push("確認日時は現在以前の有効な日時にしてください。");
  else if (benefit) {
    const localDay = date.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
    if (localDay < benefit.startsOn || (benefit.endsOn && localDay > benefit.endsOn)) errors.push("確認日時は特典の対象期間内にしてください。");
  }
  return errors;
}

export async function benefitFingerprint(identity, payload) {
  // 同じ人が同じ店舗・特典へ1時間以内に別時刻で連投しても重複扱い。
  const source = JSON.stringify([identity, payload.storeId, payload.benefitId]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
