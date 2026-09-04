import { BENEFIT_LABELS, validateBenefit } from "./benefits.js";
import { htmlEscape as escape } from "./insights-ui.js";
import { goodsImage } from "./goods-ui.js";

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

export async function loadStoreBenefits(store, campaign) {
  const seq = ++sequence;
  current = { store, campaign, items: [] };
  try {
    const data = await api.fetchJson(`/api/stores/${encodeURIComponent(store.id)}/benefits?campaign=${encodeURIComponent(campaign.id)}`);
    if (seq !== sequence) return;
    current.items = data.items ?? [];
    const target = $("#store-benefits");
    if (!target) return;
    target.innerHTML = current.items.map((benefit) => {
      const latest = benefit.latest;
      const freshness = { "24h": "24時間以内の報告", "48h": "48時間以内の報告", stale: "古い情報です", unknown: "確認日時不明" }[latest?.freshness];
      const future = benefit.startsOn > localDay();
      const canPost = !future && (!benefit.endsOn || benefit.endsOn >= localDay()) && campaign.endsOn >= localDay();
      return `<article class="benefit-card ${latest?.freshness === "stale" ? "benefit-stale" : ""}">${goodsImage(benefit)}<h4>${escape(benefit.name)}</h4><small>${escape(benefit.startsOn.replaceAll("-", "/"))}〜${benefit.endsOn ? escape(benefit.endsOn.replaceAll("-", "/")) : "無くなり次第終了"}</small>${latest ? `<p class="benefit-latest">${benefit.conflicting ? "直近の報告が分かれています" : `最新報告：${escape(BENEFIT_LABELS[latest.availability] ?? BENEFIT_LABELS.unknown)}`}</p><time datetime="${escape(latest.observedAt)}">${escape(localTime(new Date(latest.observedAt)).replace("T", " "))} 確認（日本時間）</time><p class="benefit-freshness">${escape(freshness)}</p><p>過去24時間：受け取れた ${benefit.last24h.available}件 / 配布終了の案内 ${benefit.last24h.unavailable}件 / 不明 ${benefit.last24h.unknown}件</p>` : `<p>${future ? "開始前です" : "まだ報告がありません"}</p>`}<details><summary>配布条件・公式情報</summary><p>${escape(benefit.conditions)}</p><a href="${escape(benefit.sourceUrl)}" target="_blank" rel="noopener noreferrer">公式情報を見る</a></details>${canPost ? `<button class="button button-secondary" type="button" data-open-benefit="${escape(benefit.id)}">この特典の状況を投稿</button>` : ""}</article>`;
    }).join("") || "登録された先着特典はありません。";
  } catch {
    if (seq === sequence && $("#store-benefits")) $("#store-benefits").textContent = "特典情報を読み込めませんでした。店舗詳細を開き直してお試しください。";
  }
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
      availability: $("#benefit-availability").value,
      receivedQuantity: $("#benefit-quantity").value === "" ? null : Number($("#benefit-quantity").value),
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
      if (current?.store.id === selection.store.id) await loadStoreBenefits(selection.store, selection.campaign);
      document.dispatchEvent(new Event("benefit-updated"));
    } catch (error) { $("#benefit-form-status").textContent = ""; showError(error.message); }
    finally { sending = false; $("#benefit-submit").disabled = submitted; }
  });
}

export function openBenefitForm(store, campaign, benefit, trigger) {
  if (sending) return;
  lastTrigger=trigger; selection={store,campaign,benefit}; submitted=false;
  $("#benefit-form").reset();
  $("#benefit-quantity-field").hidden=true;
  $("#benefit-store-name").textContent=store.name; $("#benefit-name").textContent=benefit.name;
  $("#benefit-observed-at").value=localTime(); $("#benefit-observed-at").max=localTime();
  $("#benefit-errors").hidden=true; $("#benefit-form-status").textContent=""; $("#benefit-submit").disabled=false;
  $("#benefit-dialog").showModal(); ensureBenefitTurnstile(true);
}
