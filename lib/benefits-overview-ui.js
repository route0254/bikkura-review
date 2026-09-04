import { BENEFIT_LABELS, conflictingBenefits } from "./benefits.js";
import { htmlEscape as escape } from "./insights-ui.js";
import { goodsImage } from "./goods-ui.js";
import { openBenefitForm } from "./benefits-ui.js";
import { sortPrefectures } from "./prefectures.js";
const $=(s)=>document.querySelector(s);
let api,master=[],selected=null,offset=0,sequence=0,teaserSequence=0,masterCampaign=null;
const time=(iso)=>new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(iso));
export function benefitReportMarkup(row) {
  const conflict=row.conflicting??conflictingBenefits(row.last24h);
  const stale=row.latest?.freshness==="stale";
  return `<article class="benefit-store-report ${stale?"benefit-stale":""}"><h3>${escape(row.prefecture)}・${escape(row.storeName)}</h3>${conflict?'<p class="benefit-conflict">直近の報告が分かれています</p>':`<p>${escape(BENEFIT_LABELS[row.latest?.availability]??"まだ報告がありません")}</p>`}${row.latest?`<time datetime="${escape(row.latest.observedAt)}">${escape(time(row.latest.observedAt))} 確認（日本時間）</time>`:""}${stale?'<p>古い情報です</p>':""}<p>過去24時間：受け取れた ${row.last24h?.available??0}件 / 配布終了 ${row.last24h?.unavailable??0}件</p><button type="button" class="button button-secondary" data-benefit-store="${escape(row.storeId)}">この店舗の状況を投稿</button></article>`;
}
export async function loadBenefitTeaser(campaign) {
  const seq=++teaserSequence;
  try{
    const data=await api.fetchJson(`/api/benefits/latest?campaign=${encodeURIComponent(campaign.id)}&unavailable=1&limit=5`);
    if(seq!==teaserSequence)return;
    const previous=masterCampaign===campaign.id ? $("#benefit-select").value : "";
    masterCampaign=campaign.id;master=data.benefits??[];selected=data.selected;
    $("#benefit-select").innerHTML=master.map((b)=>`<option value="${escape(b.id)}">${escape(b.name)}</option>`).join("");
    if(master.some((b)=>b.id===previous))$("#benefit-select").value=previous;
    else if(selected)$("#benefit-select").value=selected.id;
    $("#benefit-teaser-body").innerHTML=selected?`<div class="benefit-feature">${goodsImage(selected)}<div><h3>${escape(selected.name)}</h3><p>過去24時間に配布終了の報告があった店舗</p>${data.items?.length?`<ul>${data.items.map((r)=>`<li>${escape(r.prefecture)}・${escape(r.storeName)}${r.conflicting?"（報告が分かれています）":""} <small>${escape(time(r.latest.observedAt))}確認</small></li>`).join("")}</ul>`:"<p>現在、該当する報告はありません。在庫があることを意味しません。</p>"}</div></div>`:"<p>現在の先着特典はありません。専用ビューから過去の情報を確認できます。</p>";
  }catch{if(seq===teaserSequence)$("#benefit-teaser-body").textContent="先着特典の概要を取得できませんでした。専用ビューで再度お試しください。";}
}
function populateStores(preselected="") {
  const {stores}=api.context();const prefecture=$("#benefit-prefecture").value;
  const options=stores.filter((s)=>!prefecture||s.prefecture===prefecture);
  $("#benefit-post-store").innerHTML='<option value="">店舗を選択してください</option>'+options.map((s)=>`<option value="${escape(s.id)}">${escape(s.prefecture)}・${escape(s.name)}</option>`).join("");
  if(preselected)$("#benefit-post-store").value=preselected;
}
export async function loadBenefitOverview(more=false) {
  const {campaign}=api.context();if(!campaign)return;
  if(!master.length||masterCampaign!==campaign.id)await loadBenefitTeaser(campaign);
  const seq=++sequence;if(!more){offset=0;$("#benefit-overview-list").textContent="読み込み中…";}
  const query=new URLSearchParams({campaign:campaign.id,benefit:$("#benefit-select").value,prefecture:$("#benefit-prefecture").value,q:$("#benefit-search").value,limit:"20",offset:String(offset)});
  try{const data=await api.fetchJson(`/api/benefits/latest?${query}`);if(seq!==sequence)return;selected=data.selected;
    const markup=(data.items??[]).map(benefitReportMarkup).join("")||'<p>条件に合う報告はまだありません。上の店舗選択から状況を報告できます。</p>';
    if(more)$("#benefit-overview-list").insertAdjacentHTML("beforeend",markup);else $("#benefit-overview-list").innerHTML=markup;
    offset+=(data.items??[]).length;$("#benefit-load-more").hidden=!data.hasMore;
  }catch{if(seq===sequence)$("#benefit-overview-list").textContent="読み込めませんでした。絞り込むボタンで再度お試しください。";}
}
export function startBenefitForStore(storeId,trigger) {
  const {stores,campaign}=api.context(),store=stores.find((s)=>s.id===storeId),benefit=master.find((b)=>b.id===$("#benefit-select").value)??selected;
  if(!store||!benefit){$("#benefit-picker-status").textContent="店舗と特典を選んでください。";return;}
  const today=new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Tokyo"});
  if(benefit.startsOn>today || (benefit.endsOn&&benefit.endsOn<today) || campaign.endsOn<today){$("#benefit-picker-status").textContent="この特典は投稿受付期間外です。過去の情報は一覧で確認できます。";return;}
  $("#benefit-picker-status").textContent="";openBenefitForm(store,campaign,benefit,trigger);
}
export async function showBenefitView(storeId) {
  api.showView();
  if(storeId){const s=api.context().stores.find((s)=>s.id===storeId);if(s)$("#benefit-prefecture").value=s.prefecture;}
  populateStores(storeId);await loadBenefitOverview();$("#benefits-tab").scrollIntoView({block:"start"});
  if(storeId)$("#benefit-post-store").focus({preventScroll:true});
}
export function initializeBenefitOverview(dependencies) {
  api=dependencies;
  $("#benefit-search-submit").addEventListener("click",()=>loadBenefitOverview());
  $("#benefit-select").addEventListener("change",()=>loadBenefitOverview());
  $("#benefit-prefecture").addEventListener("change",()=>{populateStores();loadBenefitOverview();});
  $("#benefit-load-more").addEventListener("click",()=>loadBenefitOverview(true));
  $("#benefit-post-start").addEventListener("click",(e)=>startBenefitForStore($("#benefit-post-store").value,e.currentTarget));
  document.addEventListener("click",(e)=>{if(e.target.closest("[data-benefits-view]"))showBenefitView();const b=e.target.closest("[data-benefit-store]");if(b)startBenefitForStore(b.dataset.benefitStore,b);});
  document.addEventListener("benefit-updated",()=>{loadBenefitTeaser(api.context().campaign);if(!$("#benefits-view").hidden)loadBenefitOverview();});
}
export function populateBenefitPrefectures(stores) {
  $("#benefit-prefecture").innerHTML='<option value="">全国</option>'+sortPrefectures(stores.map((s)=>s.prefecture)).map((p)=>`<option>${escape(p)}</option>`).join("");populateStores();
}
