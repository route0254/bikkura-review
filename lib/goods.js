export const MAX_GOODS_COUNT = 300;
export function changeItemCount(value, delta, maximum = MAX_GOODS_COUNT) {
  return Math.max(0, Math.min(maximum, (Number.isInteger(value) ? value : 0) + delta));
}

// クライアントの合計値は信用せず、マスターにある個別景品から毎回計算する。
export function normalizeGoodsPayload(input, context = {}) {
  const errors = [];
  const masters = context.prizeItems ?? new Map();
  const categories = context.prizeCategoryIds ?? new Set();
  const validCount = (n) => Number.isInteger(n) && n >= 0 && n <= MAX_GOODS_COUNT;
  const known = input.guaranteedKnown === true;
  const sums = new Map([...categories].map((id) => [id, { quantity: 0, unknown: 0, guaranteed: 0, items: [] }]));
  const seen = new Set();
  if (!Array.isArray(input.goodsItems) || input.goodsItems.length > masters.size) errors.push("グッズ入力の形式が正しくありません。");
  const guaranteedItems = [];
  for (const item of Array.isArray(input.goodsItems) ? input.goodsItems : []) {
    const master = masters.get(item?.prizeItemId);
    if (!master || seen.has(item.prizeItemId)) { errors.push("グッズの種類が不正、または重複しています。"); continue; }
    seen.add(item.prizeItemId);
    if (!validCount(item.quantity)) { errors.push("グッズの個数は0〜300の整数にしてください。"); continue; }
    const guaranteed = known ? item.guaranteedQuantity ?? 0 : 0;
    if (!validCount(guaranteed) || guaranteed > item.quantity) errors.push("確定セット分はそのグッズの個数以下にしてください。");
    const category = sums.get(master.prizeCategoryId);
    if (!category) { errors.push("グッズのカテゴリが一致しません。"); continue; }
    category.quantity += item.quantity;
    category.guaranteed += guaranteed;
    category.items.push({ prizeItemId: item.prizeItemId, quantity: item.quantity });
    if (known && item.quantity > 0) guaranteedItems.push({ prizeItemId: item.prizeItemId, quantity: guaranteed });
  }
  const unknownSeen = new Set();
  if (input.goodsUnknown !== undefined && !Array.isArray(input.goodsUnknown)) errors.push("デザイン不明の個数が不正です。");
  for (const item of Array.isArray(input.goodsUnknown) ? input.goodsUnknown : []) {
    const category = sums.get(item?.prizeCategoryId);
    if (!category || unknownSeen.has(item.prizeCategoryId) || !validCount(item.quantity)) { errors.push("デザイン不明の種類・個数が不正です。"); continue; }
    unknownSeen.add(item.prizeCategoryId);
    const guaranteed = known ? item.guaranteedQuantity ?? 0 : 0;
    if (!validCount(guaranteed) || guaranteed > item.quantity) errors.push("確定セット分はそのカテゴリの個数以下にしてください。");
    category.quantity += item.quantity; category.unknown += item.quantity; category.guaranteed += guaranteed;
  }
  const unknown = input.goodsUncategorized ?? 0;
  const unknownGuaranteed = known ? input.goodsUncategorizedGuaranteed ?? 0 : 0;
  if (!validCount(unknown) || !validCount(unknownGuaranteed) || unknownGuaranteed > unknown) errors.push("種類不明の個数が不正です。");
  const categorized = [...sums.values()].reduce((n, c) => n + c.quantity, 0);
  const total = categorized + unknown;
  const guaranteed = known ? [...sums.values()].reduce((n, c) => n + c.guaranteed, unknownGuaranteed) : null;
  if (total > MAX_GOODS_COUNT) errors.push("景品合計は300個以下にしてください。");
  if (input.spendAmountYen != null && (!Number.isInteger(input.spendAmountYen) || input.spendAmountYen < 1 || input.spendAmountYen > 1_000_000)) errors.push("利用金額は空欄、または1〜1,000,000円の整数にしてください。");
  const detail = input.drawDetails;
  if (detail != null && (typeof detail !== "object" || Array.isArray(detail))) errors.push("抽選詳細の形式が不正です。");
  if (detail && !known) errors.push("抽選詳細を入力するときは、確定セット分も確認してください（なければ0個）。");
  const report = {
    storeId: input.storeId, campaignId: input.campaignId, visitDate: input.visitDate,
    goodsInput: true, resultInputMode: detail ? "detailed" : "simple", prizeInputMode: "total",
    usageType: detail?.usageType ?? "unknown", panelDraws: detail?.panelDraws ?? 0,
    panelWins: detail?.panelWins ?? 0, mobileDraws: detail?.mobileDraws ?? 0, mobileWins: detail?.mobileWins ?? 0,
    guaranteedPrizeCount: detail ? guaranteed ?? 0 : 0,
    simpleGuaranteedPrizeCount: detail ? null : guaranteed,
    spendAmountYen: input.spendAmountYen ?? null, reportedPrizeCount: total, reportedTotalDraws: null,
    prizeBreakdownStatus: unknown === 0 ? "complete" : categorized > 0 ? "partial" : "unknown",
    unknownPrizeCount: unknown, prizes: [...sums].map(([prizeCategoryId, c]) => ({ prizeCategoryId, quantity: c.quantity, acquisitionType: "total" })),
    itemBreakdowns: [...sums].map(([prizeCategoryId, c]) => ({ prizeCategoryId, acquisitionType: "total", status: c.unknown === 0 ? "complete" : c.items.some((i) => i.quantity > 0) ? "partial" : "unknown", items: c.items })),
    goodsGuaranteedItems: guaranteedItems, turnstileToken: input.turnstileToken,
  };
  const validationPayload = { ...report, goodsInput: false };
  // 既存の厳密なカテゴリ・個別景品・日付検証を再利用する。
  if (detail) {
    validationPayload.spendAmountYen = null; validationPayload.reportedPrizeCount = null;
    if (report.panelWins + report.mobileWins + report.guaranteedPrizeCount !== total) errors.push("抽選の当たり数と確定セット分の合計が、選んだグッズ合計と一致しません。");
  } else validationPayload.spendAmountYen ??= 1;
  return { report, validationPayload, errors, totals: { total, guaranteed, draw: guaranteed === null ? null : total - guaranteed } };
}
