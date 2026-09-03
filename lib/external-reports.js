export const EXTERNAL_PLATFORM_LABELS = Object.freeze({
  x: "X",
  google_maps: "Google Maps",
  tabelog: "食べログ",
  blog: "ブログ",
  other: "その他",
});

export const EXTERNAL_EVIDENCE_QUALITIES = Object.freeze(["A", "B", "C"]);
export const EXTERNAL_RESULT_PRECISIONS = Object.freeze(["complete", "partial", "mention_only"]);
export const EXTERNAL_QUANTITY_KINDS = Object.freeze(["exact", "at_least", "unknown"]);
export const EXTERNAL_SPEND_KINDS = Object.freeze(["exact", "approx", "at_least", "unknown"]);
export const EXTERNAL_STATUSES = Object.freeze(["active", "pending", "hidden"]);
export const EXTERNAL_ACQUISITION_TYPES = Object.freeze(["draw", "guaranteed", "unknown"]);

const USAGE_TYPES = new Set(["normal", "plus", "unknown"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function formatExternalQuantity(quantity, kind = "exact") {
  if (quantity === null || quantity === undefined || kind === "unknown") return "不明";
  return `${Number(quantity).toLocaleString("ja-JP")}個${kind === "at_least" ? "以上" : ""}`;
}

export function formatExternalSpend(amount, kind = "unknown") {
  if (amount === null || amount === undefined || kind === "unknown") return null;
  const prefix = kind === "approx" ? "約" : "";
  const suffix = kind === "at_least" ? "以上" : "";
  return `${prefix}${Number(amount).toLocaleString("ja-JP")}円${suffix}`;
}

export function filterPublicExternalReports(reports = []) {
  return reports.filter((report) => report.status === "active" && report.storeId);
}

function validQuantity(value) {
  return Number.isInteger(value) && value >= 0 && value <= 500;
}

function validateQuantity(value, kind, label, errors) {
  if (!EXTERNAL_QUANTITY_KINDS.includes(kind)) {
    errors.push(`${label}: quantityKindが不正です`);
  } else if (kind === "unknown") {
    if (value !== null) errors.push(`${label}: 不明な数量はnullにしてください`);
  } else if (!validQuantity(value)) {
    errors.push(`${label}: 数量は0〜500の整数にしてください`);
  }
}

export function validateExternalReports(reports, context = {}) {
  const errors = [];
  const storeIds = context.storeIds ?? new Set();
  const campaigns = context.campaigns ?? new Map();
  const categories = context.categories ?? new Map();
  const prizeItems = context.prizeItems ?? new Map();
  if (!Array.isArray(reports)) return ["external reports: 配列にしてください"];

  const ids = new Set();
  const sourceKeys = new Set();
  for (const report of reports) {
    const label = report?.id || "external report";
    if (!report?.id || typeof report.id !== "string") errors.push(`${label}: idが必要です`);
    else if (ids.has(report.id)) errors.push(`${label}: idが重複しています`);
    ids.add(report?.id);

    if (report.storeId !== null && !storeIds.has(report.storeId)) errors.push(`${label}: storeIdが不正です`);
    const campaign = campaigns.get(report.campaignId);
    if (!campaign) errors.push(`${label}: campaignIdが不正です`);
    if (!Object.hasOwn(EXTERNAL_PLATFORM_LABELS, report.externalPlatform)) errors.push(`${label}: externalPlatformが不正です`);
    if (!EXTERNAL_EVIDENCE_QUALITIES.includes(report.evidenceQuality)) errors.push(`${label}: evidenceQualityが不正です`);
    if (!EXTERNAL_RESULT_PRECISIONS.includes(report.resultPrecision)) errors.push(`${label}: resultPrecisionが不正です`);
    if (!USAGE_TYPES.has(report.usageType)) errors.push(`${label}: usageTypeが不正です`);
    if (!EXTERNAL_STATUSES.includes(report.status)) errors.push(`${label}: statusが不正です`);
    if (report.visitDate !== null && !ISO_DATE.test(report.visitDate ?? "")) errors.push(`${label}: visitDateは日付またはnullにしてください`);
    if (report.visitDate && campaign && (report.visitDate < campaign.startsOn || report.visitDate > campaign.endsOn)) errors.push(`${label}: visitDateがキャンペーン期間外です`);
    if (!ISO_DATE.test(report.externalObservedAt ?? "")) errors.push(`${label}: externalObservedAtが不正です`);
    if (report.visitDateLabel !== null && (typeof report.visitDateLabel !== "string" || report.visitDateLabel.length > 40)) errors.push(`${label}: visitDateLabelが不正です`);
    if (report.noteInternal !== null && (typeof report.noteInternal !== "string" || report.noteInternal.length > 500)) errors.push(`${label}: noteInternalは500文字以内にしてください`);
    const spendAmount = report.spendAmountYen ?? null;
    const spendKind = report.spendAmountKind ?? "unknown";
    if (!EXTERNAL_SPEND_KINDS.includes(spendKind)) errors.push(`${label}: spendAmountKindが不正です`);
    else if (spendKind === "unknown") {
      if (spendAmount !== null) errors.push(`${label}: 不明な利用金額はnullにしてください`);
    } else if (!Number.isInteger(spendAmount) || spendAmount < 0 || spendAmount > 1000000) {
      errors.push(`${label}: spendAmountYenは0〜1000000の整数にしてください`);
    }

    if (report.externalUrl !== null) {
      try {
        const url = new URL(report.externalUrl);
        if (!new Set(["https:", "http:"]).has(url.protocol)) throw new Error("protocol");
      } catch { errors.push(`${label}: externalUrlが不正です`); }
      const sourceKey = `${report.externalPlatform}|${report.externalUrl}|${report.storeId ?? ""}`;
      if (sourceKeys.has(sourceKey)) errors.push(`${label}: externalPlatform・externalUrl・storeIdが重複しています`);
      sourceKeys.add(sourceKey);
    }

    for (const field of ["panelDraws", "panelWins", "mobileDraws", "mobileWins"]) {
      if (report[field] !== null && !validQuantity(report[field])) errors.push(`${label}: ${field}は0〜500の整数またはnullにしてください`);
    }
    if (validQuantity(report.panelDraws) && validQuantity(report.panelWins) && report.panelWins > report.panelDraws) errors.push(`${label}: panelWinsがpanelDrawsを超えています`);
    if (validQuantity(report.mobileDraws) && validQuantity(report.mobileWins) && report.mobileWins > report.mobileDraws) errors.push(`${label}: mobileWinsがmobileDrawsを超えています`);
    validateQuantity(report.totalPrizes, report.totalPrizesKind, `${label}: totalPrizes`, errors);

    const reportPrizes = Array.isArray(report.prizes) ? report.prizes : [];
    if (!Array.isArray(report.prizes)) errors.push(`${label}: prizesは配列にしてください`);
    const seenCategories = new Set();
    let exactCategoryTotal = 0;
    let allCategoriesExact = true;
    for (const prize of reportPrizes) {
      const acquisitionType = prize.acquisitionType ?? "unknown";
      if (!EXTERNAL_ACQUISITION_TYPES.includes(acquisitionType)) errors.push(`${label}: 景品のacquisitionTypeが不正です`);
      const category = categories.get(prize.prizeCategoryId);
      if (!category || category.campaignId !== report.campaignId) errors.push(`${label}: 景品カテゴリがキャンペーンと一致しません`);
      if (seenCategories.has(prize.prizeCategoryId)) errors.push(`${label}: 景品カテゴリが重複しています`);
      seenCategories.add(prize.prizeCategoryId);
      validateQuantity(prize.quantity, prize.quantityKind, `${label}: ${prize.prizeCategoryId}`, errors);
      if (prize.quantityKind === "exact" && validQuantity(prize.quantity)) exactCategoryTotal += prize.quantity;
      else allCategoriesExact = false;
    }
    if (report.totalPrizesKind === "exact" && validQuantity(report.totalPrizes) && exactCategoryTotal > report.totalPrizes) errors.push(`${label}: カテゴリ合計が景品総数を超えています`);
    const campaignCategoryCount = [...categories.values()].filter((category) => category.campaignId === report.campaignId).length;
    if (report.resultPrecision === "complete" && (report.totalPrizesKind !== "exact" || !allCategoriesExact || seenCategories.size !== campaignCategoryCount || exactCategoryTotal !== report.totalPrizes)) errors.push(`${label}: completeは景品総数と全カテゴリの正確な内訳が必要です`);

    const reportItems = Array.isArray(report.items) ? report.items : [];
    if (!Array.isArray(report.items)) errors.push(`${label}: itemsは配列にしてください`);
    const seenItems = new Set();
    for (const item of reportItems) {
      const acquisitionType = item.acquisitionType ?? "unknown";
      if (!EXTERNAL_ACQUISITION_TYPES.includes(acquisitionType)) errors.push(`${label}: 個別景品のacquisitionTypeが不正です`);
      const master = prizeItems.get(item.prizeItemId);
      if (!master || master.campaignId !== report.campaignId || master.prizeCategoryId !== item.prizeCategoryId) errors.push(`${label}: 個別景品がカテゴリまたはキャンペーンと一致しません`);
      if (!seenCategories.has(item.prizeCategoryId)) errors.push(`${label}: 個別景品には対応するカテゴリ情報が必要です`);
      if (seenItems.has(item.prizeItemId)) errors.push(`${label}: 個別景品が重複しています`);
      seenItems.add(item.prizeItemId);
      if (!new Set(["exact", "at_least"]).has(item.quantityKind) || !validQuantity(item.quantity)) errors.push(`${label}: 個別景品の数量が不正です`);
    }
  }
  return [...new Set(errors)];
}
