export function confirmationRows(payload, store, campaign) {
  const simple = payload.resultInputMode === "simple";
  const wins = payload.panelWins + payload.mobileWins;
  const guaranteed = simple ? payload.simpleGuaranteedPrizeCount ?? null : payload.guaranteedPrizeCount ?? 0;
  const total = simple ? payload.reportedPrizeCount : wins + guaranteed;
  const count = (value, unit) => value === null || value === undefined ? "不明" : `${value.toLocaleString("ja-JP")}${unit}`;
  // 許可した投稿項目だけから構築し、認証ユーザー情報やtokenを渡さない。
  return [
    ["店舗", store?.name ?? ""], ["来店日", payload.visitDate.replaceAll("-", "/")],
    ["利用金額", payload.spendAmountYen == null ? "未入力" : `約${count(payload.spendAmountYen, "円")}`],
    ["抽選回数", count(simple ? payload.reportedTotalDraws : payload.panelDraws + payload.mobileDraws, "回")],
    ["景品合計", count(total, "個")], ["うち確定セット等", count(guaranteed, "個")],
    ["抽選由来の景品", count(guaranteed === null ? null : total - guaranteed, "個")],
    ...(campaign?.prizeCategories ?? []).map((category) => {
      const matches = payload.prizes.filter((p) => p.prizeCategoryId === category.id);
      return [category.name, matches.length ? count(matches.reduce((sum, p) => sum + p.quantity, 0), "個") : payload.prizeBreakdownStatus === "complete" ? "0個" : "不明"];
    }),
  ];
}

export function postedShareData(store, campaignId) {
  const url = new URL("https://review.chiikatsu-map.com/");
  url.searchParams.set("store", store.id);
  if (campaignId) url.searchParams.set("campaign", campaignId);
  return { title: "ビッくらポン！みんなの結果共有", text: `${store.name}のビッくらポン！結果を投稿しました🍣\n\nみんなの結果も募集中👇`, url: url.toString() };
}
