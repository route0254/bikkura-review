import { MIN_SPEND_REPORTS } from "./spend.js";

export const htmlEscape = (value = "") => String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
const number = (value, digits = 1) => Number(value).toLocaleString("ja-JP", { maximumFractionDigits: digits });

export function spendMarkup(spend = {}) {
  const count = Number(spend.reportCount ?? 0);
  const min = spend.minimum ?? MIN_SPEND_REPORTS;
  const note = `<p class="section-note section-note-left">金額を入力したかんたん投稿のみ。人数や注文内容が異なるため、費用対効果や当選率を表す数値ではありません。9/4以降は価格改定の影響もあるため、利用金額の単純比較にはご注意ください。</p>`;
  if (count < min) return `<h3>利用金額の参考データ</h3><p>まだデータが少ないです（${count}件 / ${min}件以上で中央値を表示）。</p>${note}`;
  const metric = (key, label, unit, digits = 1) => {
    const row = spend.metrics?.[key];
    return `<div><dt>${label}</dt><dd>${row?.count >= min ? `${number(row.median, digits)}${unit}` : "データ不足"}<small>対象 ${row?.count ?? 0}件</small></dd></div>`;
  };
  return `<h3>利用金額の参考データ <small>${count}件</small></h3><p class="section-note section-note-left">各来店の値から計算した中央値です。景品合計には確定セット等を含みます。</p><dl class="spend-metrics">${metric("spend", "利用金額中央値", "円")}${metric("prizes", "景品数中央値 / 来店", "個")}${metric("perPrize", "景品1個あたり金額中央値", "円")}${metric("per1000", "1,000円あたり景品中央値", "個", 2)}${metric("drawn", "うち抽選由来・中央値", "個")}${metric("guaranteed", "うち確定セット等・中央値", "個")}</dl><p class="section-note section-note-left">抽選・確定の内訳は確定景品数の回答がある投稿のみ。景品0個の投稿は「1個あたり」の計算対象外です。</p>${spend.bands?.length ? `<details class="spend-bands"><summary>金額帯ごとの景品数中央値</summary><ul>${spend.bands.map((b) => `<li>${htmlEscape(b.label)}：${number(b.median)}個（${b.count}件）</li>`).join("")}</ul></details>` : ""}${note}`;
}

export function comparisonMarkup(periods = []) {
  if (!periods.length) return "";
  return `<h3>来店期間で比較</h3><p class="section-note section-note-left">先着特典切替日を基準にしたサイト内比較です。ビッくらポン景品の公式な第1弾・第2弾・第3弾ではありません。</p><div class="comparison-grid">${periods.map((p) => `<article><h4>${htmlEscape(p.label)}</h4><small>${htmlEscape(p.startsOn.slice(5).replace("-", "/"))}〜${htmlEscape(p.endsOn.slice(5).replace("-", "/"))}</small><dl><div><dt>投稿</dt><dd>${p.reportCount}件</dd></div><div><dt>抽選景品</dt><dd>${p.drawPrizeCount}個</dd></div><div><dt>フィギュア</dt><dd>${p.figureCount}個</dd></div></dl></article>`).join("")}</div><p class="section-note section-note-left">フィギュアは抽選内訳が完全な投稿のみ。未報告・未来の期間の0件は「景品が出なかった」ことを意味しません。</p>`;
}
