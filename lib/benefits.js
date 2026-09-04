export const BENEFIT_LABELS = { available: "受け取れた", unavailable: "配布終了と案内された", unknown: "確認できなかった" };
export const BENEFIT_OBSERVATIONS = {
  received: { label: "受け取れた", availability: "available", observationType: "received" },
  notice: { label: "配布中の案内", availability: "available", observationType: "store_notice" },
  observed: { label: "配布中の表示", availability: "available", observationType: "observed" },
  ended: { label: "終了の案内", availability: "unavailable", observationType: "store_notice" },
  unknown: { label: "確認できず", availability: "unknown", observationType: "observed" },
};
export function benefitStatusLabel(row) {
  if (row?.availability === "available" && row.observationType === "store_notice") return "配布中と案内された";
  if (row?.availability === "available" && row.observationType === "observed") return "配布中の表示を見た";
  return BENEFIT_LABELS[row?.availability] ?? "まだ報告がありません";
}
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
  if (payload.items !== undefined) {
    if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 12) errors.push("確認した絵柄を1〜12種類選んでください。");
    else {
      const seen = new Set();
      for (const item of payload.items) {
        if (!item || typeof item !== "object" || Array.isArray(item)) { errors.push("絵柄の入力が不正です。"); continue; }
        if (!benefit?.items?.some((m)=>m.id===item.benefitItemId && m.benefitId===benefit.id) || seen.has(item.benefitItemId)) errors.push("同じ特典の絵柄を重複なく選んでください。");
        seen.add(item.benefitItemId);
        if (!Object.values(BENEFIT_OBSERVATIONS).some((v)=>v.availability===item.availability && v.observationType===item.observationType)) errors.push("絵柄ごとに確認した状態を選んでください。");
        if (item.receivedQuantity != null && (item.observationType!=="received" || item.availability!=="available" || !Number.isInteger(item.receivedQuantity) || item.receivedQuantity<1 || item.receivedQuantity>300)) errors.push("受取個数は実際に受け取った絵柄のみ1〜300で入力してください。");
      }
    }
    if (payload.availability !== undefined || payload.receivedQuantity != null) errors.push("絵柄別と特典全体の入力は同時に送信できません。");
  } else {
    if (!Object.hasOwn(BENEFIT_LABELS, payload.availability)) errors.push("確認した状態を選択してください。");
    if (payload.receivedQuantity != null && (payload.availability !== "available" || !Number.isInteger(payload.receivedQuantity) || payload.receivedQuantity < 1 || payload.receivedQuantity > 300)) errors.push("受け取った個数は、受け取れた場合のみ1〜300の整数で入力してください。");
  }
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
  const key = [identity, payload.storeId, payload.benefitId];
  if (payload.items) key.push(payload.items.map((i)=>[i.benefitItemId,i.availability,i.observationType]).sort((a,b)=>a[0].localeCompare(b[0])));
  const source = JSON.stringify(key);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
