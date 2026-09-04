import { htmlEscape as escape } from "./insights-ui.js";
import { openBenefitForm } from "./benefits-ui.js";
import { benefitStatusMarkup, benefitItemCard, BENEFIT_IMAGE_NOTICE } from "./benefit-display.js";
import { sortPrefectures } from "./prefectures.js";
const $=(s)=>document.querySelector(s);
let api,master=[],selected=null,offset=0,sequence=0,teaserSequence=0,masterCampaign=null;
export function benefitReportMarkup(row, benefitName="") {
  const item=row.benefitItem;
  return `<article class="benefit-store-report ${row.latest?.freshness==="stale"?"benefit-stale":""}"><h3>${escape(row.prefecture)}・${escape(row.storeName)}</h3>${item?benefitItemCard(item,benefitName,benefitStatusMarkup(row,true)):`<p class="section-note section-note-left">絵柄不明・特典全体の報告（各柄へ振り分けません）</p>${benefitStatusMarkup(row)}`}<button type="button" class="button button-secondary" data-benefit-store="${escape(row.storeId)}">この店舗の状況を投稿</button></article>`;
}
function populateDesignFilter() {
  const value=$("#benefit-item-select").value,b=master.find((b)=>b.id===$("#benefit-select").value);
  $("#benefit-item-select").innerHTML='<option value="">全絵柄</option>'+(b?.items??[]).map((i)=>`<option value="${escape(i.id)}">${escape(i.name)}</option>`).join("")+'<option value="legacy">絵柄不明・特典全体</option>';
  if(value==="legacy"||b?.items?.some((i)=>i.id===value))$("#benefit-item-select").value=value;
}
export async function loadBenefitTeaser(campaign) {
  const seq=++teaserSequence;
  try {
    const data=await api.fetchJson(`/api/benefits/latest?campaign=${encodeURIComponent(campaign.id)}&summary=1`);
    if(seq!==teaserSequence)return;
    const previous=masterCampaign===campaign.id?$("#benefit-select").value:"";
    masterCampaign=campaign.id;master=data.benefits??[];selected=data.selected;
    $("#benefit-select").innerHTML=master.map((b)=>`<option value="${escape(b.id)}">${escape(b.name)}</option>`).join("");
    if(master.some((b)=>b.id===previous))$("#benefit-select").value=previous;
    else if(selected)$("#benefit-select").value=selected.id;
    populateDesignFilter();
    $("#benefit-teaser-body").innerHTML=selected?`<h3>${escape(selected.name)}の最新報告</h3><p>過去24時間の絵柄別報告です。0店舗でも在庫があるとは限りません。</p><div class="benefit-design-grid">${(data.itemSummary??selected.items??[]).map((i)=>benefitItemCard(i,selected.name,`<p>配布終了報告のある店舗<br><strong>${i.unavailableStoreCount??0}</strong> 店</p>${i.conflictingStoreCount?'<p class="benefit-conflict">報告が分かれている店舗 '+i.conflictingStoreCount+'店</p>':""}<button class="button button-secondary" type="button" data-benefit-filter-item="${escape(i.id)}" data-benefit-filter-campaign="${escape(selected.id)}">${escape(i.name)}の店舗別情報</button>`)).join("")}</div>${BENEFIT_IMAGE_NOTICE}`:"<p>現在の先着特典はありません。専用ビューから過去の情報を確認できます。</p>";
  }catch{if(seq===teaserSequence)$("#benefit-teaser-body").textContent="先着特典の概要を取得できませんでした。専用ビューで再度お試しください。";}
}
function populateStores(preselected="") {
  const {stores}=api.context(),prefecture=$("#benefit-prefecture").value;
  const options=stores.filter((s)=>!prefecture||s.prefecture===prefecture);
  $("#benefit-post-store").innerHTML='<option value="">店舗を選択してください</option>'+options.map((s)=>`<option value="${escape(s.id)}">${escape(s.prefecture)}・${escape(s.name)}</option>`).join("");
  if(preselected)$("#benefit-post-store").value=preselected;
}
function selectedStoreMarkup(store,benefit,chosen) {
  const designs=(benefit.items??[]).filter((i)=>!chosen||i.id===chosen);
  const title=`<h3>${escape(store.name)}の先着特典</h3><p><strong>${escape(benefit.name)}</strong></p><p class="section-note section-note-left">この店舗で確認された報告です。報告なしは「配布終了」ではなく、在庫状況が未確認という意味です。</p>`;
  const today=new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Tokyo"});
  const future=benefit.startsOn>today?`<p>この特典は${escape(benefit.startsOn.replaceAll("-","/"))}から開始予定です。</p>`:"";
  const legacy=`<details class="benefit-legacy-status" ${chosen==="legacy"?"open":""}><summary>絵柄不明・特典全体の報告（各柄へ振り分けません）</summary>${benefitStatusMarkup(benefit)}</details>`;
  return title+future+(chosen==="legacy"?"":`<div class="benefit-design-grid">${designs.map((i)=>benefitItemCard(i,benefit.name)).join("")}</div>${designs.length?BENEFIT_IMAGE_NOTICE:'<p>この特典の絵柄情報はまだ登録されていません。</p>'}`)+legacy;
}
export async function loadBenefitOverview(more=false) {
  const {campaign}=api.context();if(!campaign)return;
  if(!master.length||masterCampaign!==campaign.id)await loadBenefitTeaser(campaign);
  const seq=++sequence;
  const store=api.context().stores.find((s)=>s.id===$("#benefit-post-store").value);
  const panel=$("#benefit-selected-store-status"),benefitId=$("#benefit-select").value,chosen=$("#benefit-item-select").value;
  selected=master.find((b)=>b.id===benefitId)??null;
  $("#benefit-post-start").disabled=!store||!selected;
  $("#benefit-picker-status").textContent="";
  panel.hidden=!store;
  $("#benefit-selected-designs").hidden=Boolean(store);
  $("#benefit-overview-list").hidden=Boolean(store);
  $("#benefit-load-more").hidden=true;
  if(store){
    offset=0;panel.setAttribute("aria-busy","true");
    panel.innerHTML=`<h3>${escape(store.name)}の先着特典</h3><p>この店舗の状況を読み込み中…</p>`;
    try{
      const query=new URLSearchParams({campaign:campaign.id,benefit:benefitId});
      const data=await api.fetchJson(`/api/stores/${encodeURIComponent(store.id)}/benefits?${query}`);
      if(seq!==sequence)return;
      const benefit=data.items?.find((b)=>b.id===benefitId);
      if(!benefit)throw new Error("Benefit information unavailable");
      panel.innerHTML=selectedStoreMarkup(store,benefit,chosen);
    }catch{
      if(seq===sequence)panel.innerHTML=`<h3>${escape(store.name)}の先着特典</h3><p role="alert">この店舗の状況を取得できませんでした。報告の有無はまだ確認できていません。</p><button type="button" class="button button-secondary" data-benefit-store-retry>状況を再読み込み</button>`;
    }finally{if(seq===sequence)panel.setAttribute("aria-busy","false");}
    return;
  }
  panel.innerHTML="";panel.setAttribute("aria-busy","false");
  if(!more){offset=0;$("#benefit-overview-list").textContent="読み込み中…";}
  const query=new URLSearchParams({campaign:campaign.id,benefit:$("#benefit-select").value,item:$("#benefit-item-select").value,prefecture:$("#benefit-prefecture").value,q:$("#benefit-search").value,limit:"20",offset:String(offset)});
  try {
    const data=await api.fetchJson(`/api/benefits/latest?${query}`);if(seq!==sequence)return;selected=data.selected;
    const chosen=$("#benefit-item-select").value;
    $("#benefit-selected-designs").innerHTML=selected?`<div class="benefit-design-grid">${(selected.items??[]).filter((i)=>!chosen||i.id===chosen).map((i)=>benefitItemCard(i,selected.name,"")).join("")}</div>`:"";
    const markup=(data.items??[]).map((r)=>benefitReportMarkup(r,selected?.name)).join("")||'<p>条件に合う報告はまだありません。在庫があることを意味しません。上の店舗選択から状況を報告できます。</p>';
    if(more)$("#benefit-overview-list").insertAdjacentHTML("beforeend",markup);else $("#benefit-overview-list").innerHTML=markup;
    offset+=(data.items??[]).length;$("#benefit-load-more").hidden=!data.hasMore;
  }catch{if(seq===sequence)$("#benefit-overview-list").textContent="読み込めませんでした。絞り込むボタンで再度お試しください。";}
}
export function startBenefitForStore(storeId,trigger) {
  const {stores,campaign}=api.context(),store=stores.find((s)=>s.id===storeId),benefit=master.find((b)=>b.id===$("#benefit-select").value)??selected;
  if(!store||!benefit){$("#benefit-picker-status").textContent="店舗と特典を選んでください。";return;}
  const today=new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Tokyo"});
  if(benefit.startsOn>today||(benefit.endsOn&&benefit.endsOn<today)||campaign.endsOn<today){$("#benefit-picker-status").textContent="この特典は投稿受付期間外です。過去の情報は一覧で確認できます。";return;}
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
  $("#benefit-search-submit").addEventListener("click",()=>{$("#benefit-post-store").value="";loadBenefitOverview();});
  $("#benefit-post-store").addEventListener("change",()=>loadBenefitOverview());
  $("#benefit-select").addEventListener("change",()=>{populateDesignFilter();loadBenefitOverview();});
  $("#benefit-item-select").addEventListener("change",()=>loadBenefitOverview());
  $("#benefit-prefecture").addEventListener("change",()=>{populateStores();loadBenefitOverview();});
  $("#benefit-load-more").addEventListener("click",()=>loadBenefitOverview(true));
  $("#benefit-post-start").addEventListener("click",(e)=>startBenefitForStore($("#benefit-post-store").value,e.currentTarget));
  document.addEventListener("click",(e)=>{
    if(e.target.closest("[data-benefit-store-retry]")){loadBenefitOverview();return;}
    const filter=e.target.closest("[data-benefit-filter-item]");
    if(filter){$("#benefit-select").value=filter.dataset.benefitFilterCampaign;populateDesignFilter();$("#benefit-item-select").value=filter.dataset.benefitFilterItem;showBenefitView();return;}
    if(e.target.closest("[data-benefits-view]"))showBenefitView();
    const b=e.target.closest("[data-benefit-store]");if(b)startBenefitForStore(b.dataset.benefitStore,b);
  });
  document.addEventListener("benefit-updated",async()=>{await loadBenefitTeaser(api.context().campaign);if(!$("#benefits-view").hidden)loadBenefitOverview();});
}
export function populateBenefitPrefectures(stores) {
  $("#benefit-prefecture").innerHTML='<option value="">全国</option>'+sortPrefectures(stores.map((s)=>s.prefecture)).map((p)=>`<option>${escape(p)}</option>`).join("");populateStores();
}
