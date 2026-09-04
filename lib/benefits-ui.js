import { BENEFIT_OBSERVATIONS, validateBenefit } from "./benefits.js";
import { htmlEscape as escape } from "./insights-ui.js";
import { goodsImage } from "./goods-ui.js";
import { benefitStatusMarkup, benefitItemCard, BENEFIT_IMAGE_NOTICE } from "./benefit-display.js";

let api;
let current;
let sequence = 0;
let widget = null;
let loading = null;
let sending = false;
let submitted = false;
let selection = null;
let lastTrigger;
const $ = (selector) => document.querySelector(selector);
const localDay = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
const localTime = (date = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date).replace(" ", "T");

export async function loadStoreBenefits(store, campaign, benefitId="") {
  const seq=++sequence;
  current={store,campaign,items:[]};
  try {
    const query=new URLSearchParams({campaign:campaign.id,...(benefitId?{benefit:benefitId}:{current:"1"})});
    const data=await api.fetchJson(`/api/stores/${encodeURIComponent(store.id)}/benefits?${query}`);
    if(seq!==sequence)return;
    current.items=data.items??[];
    const target=$("#store-benefits");if(!target)return;
    const masters=data.benefits??current.items;
    target.innerHTML=(masters.length?`<label class="field">確認する先着特典<select id="store-benefit-select">${masters.map((b)=>`<option value="${escape(b.id)}" ${b.id===(benefitId||data.selected?.id||current.items[0]?.id)?"selected":""}>${escape(b.name)}</option>`).join("")}</select></label>`:"")+
      current.items.map((benefit)=>{
        const future=benefit.startsOn>localDay(),canPost=!future&&(!benefit.endsOn||benefit.endsOn>=localDay())&&campaign.endsOn>=localDay();
        const designs=benefit.items??[];
        return `<article class="benefit-card"><h4>${escape(benefit.name)}</h4><small>${escape(benefit.startsOn.replaceAll("-","/"))}〜${benefit.endsOn?escape(benefit.endsOn.replaceAll("-","/")):"無くなり次第終了"}</small>${designs.length?`<div class="benefit-design-grid">${designs.map((i)=>benefitItemCard(i,benefit.name)).join("")}</div>${BENEFIT_IMAGE_NOTICE}<details class="benefit-legacy-status"><summary>絵柄不明・特典全体の報告（各柄へ振り分けません）</summary>${benefitStatusMarkup(benefit)}</details>`:benefitStatusMarkup(benefit)}<details><summary>配布条件・公式情報</summary><p>${escape(benefit.conditions)}</p><a href="${escape(benefit.sourceUrl)}" target="_blank" rel="noopener noreferrer">公式情報を見る</a></details>${canPost?`<button class="button button-secondary" type="button" data-open-benefit="${escape(benefit.id)}">この特典の状況を投稿</button>`:""}</article>`;
      }).join("")||"登録された先着特典はありません。";
  }catch{if(seq===sequence&&$("#store-benefits"))$("#store-benefits").textContent="特典情報を読み込めませんでした。店舗詳細を開き直してお試しください。";}
}

function renderBenefitChoices(benefit) {
  const items=benefit.items??[];
  $("#benefit-whole-report").checked=!items.length;
  $("#benefit-scope-option").hidden=!items.length;
  $("#benefit-item-picker").innerHTML=items.length?`<p>実際に確認した絵柄を選んでください。未選択の絵柄は送信しません。</p><div class="benefit-design-grid">${items.map((i)=>`<article class="benefit-item-input"><label class="benefit-image-choice">${goodsImage(i,`${benefit.name} ${i.name}`)}<span><input type="checkbox" data-benefit-item-check="${escape(i.id)}"> ${escape(i.name)}</span></label><div data-benefit-item-fields="${escape(i.id)}" hidden><label class="field">確認した状態<select data-benefit-item-observation="${escape(i.id)}" aria-label="${escape(i.name)}の確認した状態"><option value="">選択してください</option>${Object.entries(BENEFIT_OBSERVATIONS).map(([value,v])=>`<option value="${value}">${escape(v.label)}</option>`).join("")}</select></label><label class="field" data-benefit-item-quantity-field="${escape(i.id)}" hidden>受取個数（任意）<input data-benefit-item-quantity="${escape(i.id)}" aria-label="${escape(i.name)}の受取個数" type="number" min="1" max="300" inputmode="numeric" placeholder="不明なら空欄"></label></div></article>`).join("")}</div>${BENEFIT_IMAGE_NOTICE}`:"";
  updateBenefitScope();
}
function updateBenefitScope() {
  const whole=$("#benefit-whole-report").checked;
  $("#benefit-item-picker").hidden=whole;
  $("#benefit-legacy-fields").hidden=!whole;
  $("#benefit-submit").textContent=whole?"特典の状況を送信":"選んだ絵柄をまとめて投稿";
}
function readBenefitItems() {
  return [...document.querySelectorAll("[data-benefit-item-check]:checked")].map((check)=>{
    const id=check.dataset.benefitItemCheck,choice=$(`[data-benefit-item-observation="${CSS.escape(id)}"]`).value;
    const state=BENEFIT_OBSERVATIONS[choice];
    const quantity=$(`[data-benefit-item-quantity="${CSS.escape(id)}"]`).value;
    return {benefitItemId:id,availability:state?.availability??"",observationType:state?.observationType??"",receivedQuantity:choice==="received"&&quantity!==""?Number(quantity):null};
  });
}

async function ensureBenefitTurnstile(reset = false) {
  const status = $("#benefit-turnstile-status");
  try {
    if (window.turnstile && widget !== null) {
      if (reset) window.turnstile.reset(widget);
      return;
    }
    if (!loading) loading = (async () => {
      const config = await api.fetchJson("/api/config");
      if (!config.turnstileSiteKey) throw new Error();
      if (!window.turnstile) await new Promise((resolve, reject) => {
        let script = document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]');
        const isNew = !script;
        if (isNew) { script = document.createElement("script"); script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; script.async = true; }
        script.addEventListener("load", resolve, { once: true });
        script.addEventListener("error", reject, { once: true });
        if (isNew) document.head.append(script);
      });
      widget = window.turnstile.render($("#benefit-turnstile"), {
        sitekey: config.turnstileSiteKey, size: "flexible", action: "benefit_submit", retry: "auto",
        callback: () => { status.textContent = "投稿確認が完了しました。"; },
        "expired-callback": () => { status.textContent = "投稿確認を更新しています。"; window.turnstile.reset(widget); },
        "timeout-callback": () => { status.textContent = "投稿確認を更新しています。"; window.turnstile.reset(widget); },
        "error-callback": () => { status.textContent = "投稿確認を再試行しています。通信状況をご確認ください。"; return true; },
      });
    })();
    await loading;
  } catch { loading = null; status.textContent = "投稿確認を読み込めません。ページを再読み込みしてください。"; }
}

function showError(message) {
  const error = $("#benefit-errors");
  error.textContent = message; error.hidden = false;
  error.focus(); error.scrollIntoView({ block: "center" });
}

export function initializeBenefitUI(dependencies) {
  api = dependencies;
  const dialog = $("#benefit-dialog");
  const form = $("#benefit-form");
  $("#benefit-availability").addEventListener("change",()=>{$("#benefit-quantity-field").hidden=$("#benefit-availability").value!=="available";if($("#benefit-quantity-field").hidden)$("#benefit-quantity").value="";});
  $("#benefit-whole-report").addEventListener("change",updateBenefitScope);
  $("#benefit-item-picker").addEventListener("change",(event)=>{
    const check=event.target.closest("[data-benefit-item-check]"),select=event.target.closest("[data-benefit-item-observation]");
    if(check){$(`[data-benefit-item-fields="${CSS.escape(check.dataset.benefitItemCheck)}"]`).hidden=!check.checked;check.closest("article").classList.toggle("is-selected",check.checked);}
    if(select){const field=$(`[data-benefit-item-quantity-field="${CSS.escape(select.dataset.benefitItemObservation)}"]`);field.hidden=select.value!=="received";if(field.hidden)field.querySelector("input").value="";}
  });
  document.addEventListener("change",(event)=>{if(event.target.id==="store-benefit-select"&&current)loadStoreBenefits(current.store,current.campaign,event.target.value);});
  const close = () => { if (!sending) { dialog.close(); (document.querySelector(`[data-open-benefit="${CSS.escape(selection?.benefit.id ?? "")}"]`) ?? lastTrigger)?.focus(); } };
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-benefit]")) close();
    const button = event.target.closest("[data-open-benefit]");
    if (!button || sending) return;
    const benefit = current?.items.find((item) => item.id === button.dataset.openBenefit);
    if (!benefit) return;
    openBenefitForm(current.store, current.campaign, benefit, button);
  });
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending || submitted || !selection) return;
    const parsed = new Date(`${$("#benefit-observed-at").value}:00+09:00`);
    const payload = { storeId: selection.store.id, benefitId: selection.benefit.id,
      observedAt: Number.isFinite(parsed.getTime()) ? parsed.toISOString() : "",
      ...($("#benefit-whole-report").checked?{
        availability:$("#benefit-availability").value,
        receivedQuantity:$("#benefit-availability").value==="available"&&$("#benefit-quantity").value!==""?Number($("#benefit-quantity").value):null,
      }:{items:readBenefitItems()}),
      turnstileToken: widget !== null ? window.turnstile?.getResponse(widget) : "",
    };
    const errors = validateBenefit(payload, selection.benefit);
    if (errors.length) return showError(errors.join(" "));
    if (!payload.turnstileToken) { showError("投稿確認が完了するまでお待ちください。"); await ensureBenefitTurnstile(true); return; }
    sending = true;
    $("#benefit-submit").disabled = true;
    $("#benefit-form-status").textContent = "送信しています…";
    try {
      const response = await fetch("/api/benefit-reports", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", ...await api.authHeaders() }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { await ensureBenefitTurnstile(true); throw new Error(result.error ?? "投稿を送信できませんでした。"); }
      submitted = true;
      $("#benefit-errors").hidden = true;
      $("#benefit-form-status").textContent = result.status === "pending" ? "投稿ありがとうございます。確認後に公開します。" : "特典の状況を共有しました。ありがとうございます。";
      $("#benefit-form-status").focus();
      if (current?.store.id === selection.store.id) await loadStoreBenefits(selection.store, selection.campaign, selection.benefit.id);
      document.dispatchEvent(new Event("benefit-updated"));
    } catch (error) { $("#benefit-form-status").textContent = ""; showError(error.message); }
    finally { sending = false; $("#benefit-submit").disabled = submitted; }
  });
}

export function openBenefitForm(store, campaign, benefit, trigger) {
  if (sending) return;
  lastTrigger=trigger; selection={store,campaign,benefit}; submitted=false;
  $("#benefit-form").reset();
  renderBenefitChoices(benefit);
  $("#benefit-quantity-field").hidden=true;
  $("#benefit-store-name").textContent=store.name; $("#benefit-name").textContent=benefit.name;
  $("#benefit-observed-at").value=localTime(); $("#benefit-observed-at").max=localTime();
  $("#benefit-errors").hidden=true; $("#benefit-form-status").textContent=""; $("#benefit-submit").disabled=false;
  $("#benefit-dialog").showModal(); ensureBenefitTurnstile(true);
}
