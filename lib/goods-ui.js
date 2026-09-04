import { htmlEscape as escape } from "./insights-ui.js";
import { changeItemCount, normalizeGoodsPayload } from "./goods.js";

export const PLACEHOLDER_IMAGE = "/public/goods-placeholder.svg";
export function safeImageAsset(asset) {
  return typeof asset === "string" && /^\/(?!\/)[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|avif|svg)$/i.test(asset) && !asset.includes("..") ? asset : PLACEHOLDER_IMAGE;
}
export function goodsImage(item, label = item.name, eager = false) {
  return `<img class="goods-image" src="${escape(safeImageAsset(item.imageAsset))}" alt="${escape(label)}" width="160" height="120" loading="${eager ? "eager" : "lazy"}" decoding="async" data-goods-image>`;
}
export function goodsMarkup(data, prefix = "national") {
  const categories = data?.categories ?? [];
  if (!categories.length) return '<p class="section-note section-note-left">グッズ情報を読み込めませんでした。</p>';
  return `<div class="goods-dashboard"><div class="goods-category-tabs" role="group" aria-label="グッズカテゴリ">${categories.map((c,i)=>`<button type="button" data-goods-tab="${escape(c.id)}" aria-controls="${prefix}-${escape(c.id)}" aria-pressed="${i===0}">${escape(c.name)} <span>${c.quantity}個</span></button>`).join("")}</div>${categories.map((c,categoryIndex)=>`<section id="${prefix}-${escape(c.id)}" data-goods-panel="${escape(c.id)}" ${categoryIndex ? "hidden" : ""}><h3>${escape(c.name)} <small>報告合計 ${c.quantity}個</small></h3><div class="goods-grid">${c.items.map((item,i)=>`<article class="goods-card" data-goods-item="${escape(item.id)}">${goodsImage(item,`${c.name} ${item.name}`,prefix==="national"&&categoryIndex===0&&i<2)}<h4>${escape(item.name)}</h4><p class="goods-quantity"><strong>${item.quantity}</strong>個</p>${item.share==null ? "" : `<p class="goods-share">内訳が揃った報告中 ${(item.share*100).toFixed(1)}%</p>`}</article>`).join("")}</div>${c.unknownDesignQuantity>0?`<p class="goods-unknown">デザイン未確認 ${c.unknownDesignQuantity}個（各グッズへ推測で振り分けません）</p>`:""}<p class="section-note section-note-left">個数は確認できた報告の合計。割合はカテゴリの個別内訳が揃う3投稿・10個以上の場合だけ表示します。</p></section>`).join("")}</div>`;
}

let campaign;
const $=(s)=>document.querySelector(s);
export function renderGoodsInput(nextCampaign) {
  if(campaign?.id===nextCampaign.id)return;
  campaign=nextCampaign;
  const categories=campaign.prizeCategories ?? [],items=campaign.prizeItems ?? [];
  $("#goods-input-cards").innerHTML=categories.map((c,index)=>`<details class="goods-input-category" ${index===0?"open":""}><summary>${escape(c.name)} <span data-goods-category-total="${escape(c.id)}">0個</span></summary><div class="goods-grid">${items.filter((i)=>i.prizeCategoryId===c.id).map((item)=>`<article class="goods-card goods-input-card">${goodsImage(item,`${c.name} ${item.name}`)}<h4>${escape(item.name)}</h4>${stepper(item.id,`${c.name} ${item.name}`,"item")}<label class="goods-guaranteed" hidden>うち確定セット分<input type="number" inputmode="numeric" min="0" max="300" value="0" data-goods-guaranteed="${escape(item.id)}" aria-label="${escape(c.name)} ${escape(item.name)}の確定セット分"></label></article>`).join("")}</div><div class="goods-unknown-input"><span>${escape(c.name)}：デザイン不明</span>${stepper(c.id,`${c.name} デザイン不明`,"unknown")}<label class="goods-guaranteed" hidden>うち確定セット分<input type="number" inputmode="numeric" min="0" max="300" value="0" data-goods-unknown-guaranteed="${escape(c.id)}" aria-label="${escape(c.name)} デザイン不明の確定セット分"></label></div></details>`).join("");
  updateGoodsTotals();
}
function stepper(id,label,type) {
  return `<div class="goods-stepper"><button type="button" data-goods-step="-1" aria-label="${escape(label)}を1個減らす" disabled>−</button><input type="number" inputmode="numeric" min="0" max="300" value="0" data-goods-${type}="${escape(id)}" aria-label="${escape(label)}の個数"><button type="button" data-goods-step="1" aria-label="${escape(label)}を1個増やす">＋</button></div>`;
}
export function goodsFormPayload(base={}) {
  const number=(selector)=>{const value=$(selector)?.value??"";return value===""?null:Number(value)};
  const detail=$("#goods-draw-details").open;
  return {...base,goodsInput:true,goodsItems:[...document.querySelectorAll("[data-goods-item-input],input[data-goods-item]")].map((i)=>({prizeItemId:i.dataset.goodsItem,quantity:Number(i.value),guaranteedQuantity:number(`[data-goods-guaranteed="${CSS.escape(i.dataset.goodsItem)}"]`)})),
    goodsUnknown:[...document.querySelectorAll("input[data-goods-unknown]")].map((i)=>({prizeCategoryId:i.dataset.goodsUnknown,quantity:Number(i.value),guaranteedQuantity:number(`[data-goods-unknown-guaranteed="${CSS.escape(i.dataset.goodsUnknown)}"]`)})),
    goodsUncategorized:number("#goods-uncategorized")??0,goodsUncategorizedGuaranteed:number("#goods-uncategorized-guaranteed")??0,
    guaranteedKnown:$("#goods-guaranteed-known").checked,spendAmountYen:number("#goods-spend"),
    drawDetails:detail?{usageType:$("#goods-usage").value,panelDraws:number("#goods-panel-draws"),panelWins:number("#goods-panel-wins"),mobileDraws:number("#goods-mobile-draws"),mobileWins:number("#goods-mobile-wins")}:null};
}
export function goodsContext(value=campaign) {
  return {prizeCategoryIds:new Set((value?.prizeCategories??[]).map((p)=>p.id)),prizeItems:new Map((value?.prizeItems??[]).map((i)=>[i.id,i]))};
}
export function updateGoodsTotals() {
  if(!campaign)return;
  const input=goodsFormPayload(), {report,totals}=normalizeGoodsPayload(input,goodsContext());
  for(const c of report.prizes){const target=$(`[data-goods-category-total="${CSS.escape(c.prizeCategoryId)}"]`);if(target)target.textContent=`${c.quantity}個`;}
  $("#goods-totals").textContent=`グッズ合計 ${totals.total}個 ｜ 抽選由来 ${totals.draw??"不明"}${totals.draw===null?"":"個"} ｜ 確定セット ${totals.guaranteed??"不明"}${totals.guaranteed===null?"":"個"}`;
  document.querySelectorAll(".goods-stepper").forEach((s)=>{const n=Number(s.querySelector("input").value);s.querySelector('[data-goods-step="-1"]').disabled=n<=0;s.querySelector('[data-goods-step="1"]').disabled=n>=300;});
  document.querySelectorAll(".goods-guaranteed").forEach((el)=>{el.hidden=!input.guaranteedKnown;});
}
export function goodsConfirmationMarkup(payload, selectedCampaign) {
  const masters=selectedCampaign.prizeItems??[];
  return `<div class="confirmation-goods">${(payload.goodsItems??[]).filter((i)=>i.quantity>0).map((entry)=>{const item=masters.find((i)=>i.id===entry.prizeItemId);if(!item)return "";const c=selectedCampaign.prizeCategories.find((c)=>c.id===item.prizeCategoryId);return `<article>${goodsImage(item,`${c?.name??""} ${item.name}`)}<span>${escape(c?.name)}・${escape(item.name)} <strong>×${entry.quantity}</strong></span></article>`;}).join("")}</div>`;
}
export function initializeGoodsUI() {
  document.addEventListener("error",(event)=>{if(event.target.matches?.("img[data-goods-image]")&&!event.target.src.endsWith(PLACEHOLDER_IMAGE))event.target.src=PLACEHOLDER_IMAGE;},true);
  document.addEventListener("click",(event)=>{
    const tab=event.target.closest("[data-goods-tab]");
    if(tab){const root=tab.closest(".goods-dashboard");root.querySelectorAll("[data-goods-tab]").forEach((b)=>b.setAttribute("aria-pressed",String(b===tab)));root.querySelectorAll("[data-goods-panel]").forEach((p)=>p.hidden=p.dataset.goodsPanel!==tab.dataset.goodsTab);}
    const button=event.target.closest("[data-goods-step]");if(!button)return;
    const input=button.parentElement.querySelector("input");input.value=changeItemCount(Number(input.value),Number(button.dataset.goodsStep));updateGoodsTotals();
  });
  $("#goods-input-section").addEventListener("input",updateGoodsTotals);
  $("#goods-draw-details").addEventListener("toggle",()=>{if($("#goods-draw-details").open)$("#goods-guaranteed-known").checked=true;updateGoodsTotals();});
  $("#report-form").addEventListener("reset",()=>queueMicrotask(updateGoodsTotals));
}
