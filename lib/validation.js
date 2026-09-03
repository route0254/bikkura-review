import { acquisitionTypeOf, prizeInputModeOf } from "./report-policy.js";

export const REPORT_LIMITS = Object.freeze({
  maxCount: 300,
  maxTotalDraws: 300,
  maxBodyBytes: 16_384,
  duplicateWindowSeconds: 3600,
});

const USAGE_TYPES = new Set(["normal", "plus", "unknown"]);
const PRIZE_BREAKDOWN_STATUSES = new Set(["complete", "partial", "unknown"]);
const ITEM_BREAKDOWN_STATUSES = new Set(["complete", "partial", "unknown"]);
const LEGACY_ACQUISITION_TYPES = new Set(["draw", "guaranteed"]);
const TOTAL_ACQUISITION_TYPES = new Set(["total"]);
const PRIZE_INPUT_MODES = new Set(["by_acquisition", "total"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isBoundedInteger(value) {
  return Number.isInteger(value) && value >= 0 && value <= REPORT_LIMITS.maxCount;
}

export function todayInJapan(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(now);
}

export function validateReportPayload(payload, context = {}) {
  const errors = [];
  const storeIds = context.storeIds ?? new Set();
  const campaign = context.campaign ?? null;
  const prizeCategoryIds = context.prizeCategoryIds ?? new Set();
  const prizeItems = context.prizeItems ?? new Map();
  const today = context.today ?? todayInJapan();

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return ["投稿データの形式が正しくありません。"];
  if (!storeIds.has(payload.storeId)) errors.push("店舗を選択してください。");
  if (!campaign || payload.campaignId !== campaign.id) errors.push("キャンペーンを選択してください。");
  if (!ISO_DATE.test(payload.visitDate ?? "") || payload.visitDate > today) errors.push("来店日は今日以前の日付を入力してください。");
  if (campaign && ISO_DATE.test(payload.visitDate ?? "") && (payload.visitDate < campaign.startsOn || payload.visitDate > campaign.endsOn)) {
    errors.push("来店日はキャンペーン期間内の日付を入力してください。");
  }
  if (campaign && today > campaign.endsOn) errors.push("終了したキャンペーンには投稿できません。");
  if (!USAGE_TYPES.has(payload.usageType)) errors.push("利用区分が正しくありません。");
  if (!PRIZE_BREAKDOWN_STATUSES.has(payload.prizeBreakdownStatus)) errors.push("景品内訳の入力状況を選択してください。");
  const prizeInputMode = prizeInputModeOf(payload);
  if (!PRIZE_INPUT_MODES.has(prizeInputMode)) errors.push("景品の入力方法が正しくありません。");
  const allowedAcquisitionTypes = prizeInputMode === "total" ? TOTAL_ACQUISITION_TYPES : LEGACY_ACQUISITION_TYPES;
  const guaranteedPrizeCount = payload.guaranteedPrizeCount ?? 0;
  if (!isBoundedInteger(guaranteedPrizeCount)) errors.push(`確定セット等でもらった景品数は0〜${REPORT_LIMITS.maxCount}の整数で入力してください。`);

  const pairs = [
    [payload.panelDraws, payload.panelWins, "タッチパネル"],
    [payload.mobileDraws, payload.mobileWins, "スマホ注文"],
  ];
  for (const [draws, wins, label] of pairs) {
    if (!isBoundedInteger(draws) || !isBoundedInteger(wins)) errors.push(`${label}の回数は0〜${REPORT_LIMITS.maxCount}の整数で入力してください。`);
    else if (wins > draws) errors.push(`${label}の当たり回数は抽選回数以下にしてください。`);
  }

  if (!isBoundedInteger(payload.unknownPrizeCount)) errors.push(`内訳不明の景品数は0〜${REPORT_LIMITS.maxCount}の整数で入力してください。`);
  if (!Array.isArray(payload.prizes)) errors.push("景品データの形式が正しくありません。");
  else {
    const seen = new Set();
    for (const prize of payload.prizes) {
      const acquisitionType = acquisitionTypeOf(prize);
      if (!prize || !prizeCategoryIds.has(prize.prizeCategoryId)) errors.push("景品の種類が正しくありません。");
      if (!allowedAcquisitionTypes.has(acquisitionType)) errors.push("景品の取得経路が入力方法と一致しません。");
      if (!isBoundedInteger(prize?.quantity)) errors.push(`景品個数は0〜${REPORT_LIMITS.maxCount}の整数で入力してください。`);
      const key = `${acquisitionType}:${prize?.prizeCategoryId}`;
      if (seen.has(key)) errors.push("同じ取得経路の景品種類が重複しています。");
      seen.add(key);
    }
  }

  const itemBreakdowns = payload.itemBreakdowns ?? [];
  if (!Array.isArray(itemBreakdowns)) errors.push("個別景品データの形式が正しくありません。");
  else {
    const categoryQuantities = new Map((payload.prizes ?? []).map((prize) => [`${acquisitionTypeOf(prize)}:${prize.prizeCategoryId}`, prize.quantity]));
    const seenCategories = new Set();
    for (const breakdown of itemBreakdowns) {
      const categoryId = breakdown?.prizeCategoryId;
      const acquisitionType = acquisitionTypeOf(breakdown);
      if (!prizeCategoryIds.has(categoryId)) errors.push("個別景品のカテゴリが正しくありません。");
      if (!allowedAcquisitionTypes.has(acquisitionType)) errors.push("個別景品の取得経路が入力方法と一致しません。");
      const categoryKey = `${acquisitionType}:${categoryId}`;
      if (seenCategories.has(categoryKey)) errors.push("同じ取得経路の個別景品カテゴリが重複しています。");
      seenCategories.add(categoryKey);
      if (!ITEM_BREAKDOWN_STATUSES.has(breakdown?.status)) errors.push("個別景品内訳の入力状況が正しくありません。");
      if (!Array.isArray(breakdown?.items)) { errors.push("個別景品データの形式が正しくありません。"); continue; }
      const seenItems = new Set();
      let itemTotal = 0;
      let validQuantities = true;
      for (const item of breakdown.items) {
        const master = prizeItems.get(item?.prizeItemId);
        if (!master || master.prizeCategoryId !== categoryId) errors.push("個別景品の種類がカテゴリまたはキャンペーンと一致しません。");
        if (seenItems.has(item?.prizeItemId)) errors.push("同じ個別景品が重複しています。");
        seenItems.add(item?.prizeItemId);
        if (!isBoundedInteger(item?.quantity)) { errors.push(`個別景品数は0〜${REPORT_LIMITS.maxCount}の整数で入力してください。`); validQuantities = false; }
        else itemTotal += item.quantity;
      }
      const categoryQuantity = categoryQuantities.get(categoryKey) ?? 0;
      if (validQuantities && Number.isInteger(categoryQuantity)) {
        if (itemTotal > categoryQuantity) errors.push("個別景品数の合計はカテゴリ個数以下にしてください。");
        if (breakdown.status === "complete" && itemTotal !== categoryQuantity) errors.push("個別景品内訳をすべて入力した場合、合計をカテゴリ個数と一致させてください。");
        if (breakdown.status === "partial" && itemTotal >= categoryQuantity) errors.push("個別景品数がカテゴリ個数と一致する場合は、内訳をすべて入力した状態にしてください。");
        if (breakdown.status === "unknown" && itemTotal !== 0) errors.push("個別景品内訳が未入力の場合、個別景品数は0にしてください。");
      }
    }
  }

  const valuesAreNumbers = pairs.every(([draws, wins]) => Number.isInteger(draws) && Number.isInteger(wins));
  const prizeValuesAreNumbers = Array.isArray(payload.prizes) && payload.prizes.every((prize) => Number.isInteger(prize?.quantity)) && Number.isInteger(payload.unknownPrizeCount);
  if (valuesAreNumbers && prizeValuesAreNumbers) {
    const totalDraws = payload.panelDraws + payload.mobileDraws;
    const totalWins = payload.panelWins + payload.mobileWins;
    const categorizedPrizes = payload.prizes
      .filter((prize) => prizeInputMode === "total" || acquisitionTypeOf(prize) === "draw")
      .reduce((sum, prize) => sum + prize.quantity, 0);
    const totalPrizes = categorizedPrizes + payload.unknownPrizeCount;
    const expectedPrizeCount = totalWins + (prizeInputMode === "total" ? guaranteedPrizeCount : 0);
    if (totalDraws > REPORT_LIMITS.maxTotalDraws) errors.push(`1件の投稿で入力できる抽選回数は合計${REPORT_LIMITS.maxTotalDraws}回までです。`);
    if (payload.prizeBreakdownStatus === "complete") {
      if (payload.unknownPrizeCount !== 0) errors.push("すべて入力した場合、内訳不明の景品数は0にしてください。");
      if (categorizedPrizes !== expectedPrizeCount) errors.push("すべて入力した場合、景品個数の合計を抽選の当たり数と確定セット等でもらった景品数の合計に一致させてください。");
    } else if (totalPrizes > expectedPrizeCount) {
      errors.push("景品個数の合計は、抽選の当たり数と確定セット等でもらった景品数の合計以下にしてください。");
    }
  }
  return [...new Set(errors)];
}
