import { normalizeSearchText } from "/lib/search.js";
import { hasEnoughPrizeData, hasEnoughRateData } from "/lib/stats.js";
import { validateReportPayload } from "/lib/validation.js";
import { getIdToken, initializeAuth, signIn, signOut } from "/auth.js";

const STORE_RENDER_BATCH_SIZE = 60;
const state = { stores: [], campaigns: [], campaign: null, stats: null, selectedStoreId: null, lastTrigger: null, visibleStoreCount: STORE_RENDER_BATCH_SIZE, auth: { enabled: false, authenticated: false }, posting: null };
let turnstileWidgetId = null;
let turnstileLoader = null;

const elements = {
  campaignSelect: document.querySelector("#campaign-select"),
  campaignTitle: document.querySelector("#campaign-title"),
  statsGrid: document.querySelector("#stats-grid"),
  prizeSummary: document.querySelector("#prize-summary"),
  search: document.querySelector("#store-search"),
  searchClear: document.querySelector("#search-clear"),
  prefecture: document.querySelector("#prefecture-filter"),
  storeCount: document.querySelector("#store-count"),
  storeStatus: document.querySelector("#store-status"),
  storeList: document.querySelector("#store-list"),
  storeLoadMore: document.querySelector("#store-load-more"),
  storeDialog: document.querySelector("#store-dialog"),
  storeDialogTitle: document.querySelector("#store-dialog-title"),
  storeDialogBody: document.querySelector("#store-dialog-body"),
  reportDialog: document.querySelector("#report-dialog"),
  reportForm: document.querySelector("#report-form"),
  reportStore: document.querySelector("#report-store"),
  reportCampaign: document.querySelector("#report-campaign"),
  visitDate: document.querySelector("#visit-date"),
  prizeFields: document.querySelector("#prize-fields"),
  formErrors: document.querySelector("#form-errors"),
  formStatus: document.querySelector("#form-status"),
  authControls: document.querySelector("#auth-controls"),
  authStatus: document.querySelector("#auth-status"),
  loginButton: document.querySelector("#login-button"),
  logoutButton: document.querySelector("#logout-button"),
  postingStatus: document.querySelector("#posting-status"),
};

function renderAuth(authState) {
  state.auth = authState;
  elements.authControls.hidden = !authState.enabled;
  elements.loginButton.hidden = !authState.enabled || authState.authenticated;
  elements.logoutButton.hidden = !authState.enabled || !authState.authenticated;
  elements.authStatus.textContent = authState.authenticated ? "ログイン中" : "匿名利用中";
  refreshPostingStatus();
}

async function authHeaders() {
  const token = await getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function refreshPostingStatus() {
  if (!elements.postingStatus) return;
  try {
    const response = await fetch("/api/posting-status", { headers: { Accept: "application/json", ...await authHeaders() }, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    state.posting = result;
    elements.postingStatus.textContent = result.accountStatus === "banned" || !result.canPost
      ? result.message
      : `${result.authenticated ? "ログイン投稿" : "匿名投稿"}：本日はあと${result.remainingToday}件投稿できます（上限${result.dailyLimit}件・日本時間0時に更新）。`;
  } catch {
    elements.postingStatus.textContent = state.auth.authenticated
      ? "投稿可能件数を確認できませんでした。"
      : "匿名投稿は1日5件までです。ログインすると1日20件まで投稿できます。";
  }
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

async function fetchJson(url, fallbackUrl) {
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (!fallbackUrl) throw error;
    const fallback = await fetch(fallbackUrl);
    if (!fallback.ok) throw error;
    return fallback.json();
  }
}

async function fetchStoresFromApi() {
  const stores = [];
  const seenCursors = new Set();
  let cursor = null;
  do {
    const params = new URLSearchParams({ limit: "100" });
    if (cursor) params.set("cursor", cursor);
    const page = await fetchJson(`/api/stores?${params}`);
    if (Array.isArray(page)) return page;
    stores.push(...(page.items ?? []));
    cursor = page.nextCursor;
    if (!cursor) return stores;
    if (seenCursors.has(cursor)) throw new Error("店舗一覧のページ情報が重複しています。");
    seenCursors.add(cursor);
  } while (cursor);
  return stores;
}

async function loadStoreMaster() {
  try {
    const stores = await fetchJson("/data/stores.json");
    if (!Array.isArray(stores)) throw new Error("店舗マスタの形式が不正です。");
    return stores;
  } catch {
    return fetchStoresFromApi();
  }
}

function getStats(store) {
  return store.stats ?? { reportCount: 0, totalDraws: 0, totalWins: 0, totalPrizeCount: 0, completeReportCount: 0, completePrizeCount: 0 };
}

function renderCampaigns() {
  elements.campaignSelect.innerHTML = state.campaigns.map((campaign) => `<option value="${escapeHtml(campaign.id)}">${escapeHtml(campaign.name)}</option>`).join("");
  elements.campaignSelect.disabled = state.campaigns.length < 2;
  if (state.campaign) {
    elements.campaignSelect.value = state.campaign.id;
    elements.campaignTitle.textContent = state.campaign.name;
    elements.reportCampaign.value = state.campaign.id;
    renderPrizeFields(state.campaign.prizeCategories ?? []);
  }
}

function renderStats() {
  const stats = state.stats ?? { reportCount: 0, totalDraws: 0, totalWins: 0, totalPrizeCount: 0, prizes: [] };
  const cards = [
    ["投稿件数", stats.reportCount, "件", "stat-card-featured"],
    ["総抽選回数", stats.totalDraws, "回", ""],
    ["総当たり数", stats.totalWins, "回", ""],
    ["景品報告数", stats.totalPrizeCount, "個", ""],
  ];
  elements.statsGrid.innerHTML = cards.map(([label, value, unit, className]) => `<article class="stat-card ${className}"><span>${label}</span><strong>${Number(value).toLocaleString("ja-JP")}</strong><small>${unit}</small></article>`).join("");
  elements.statsGrid.setAttribute("aria-busy", "false");
  const prizes = stats.prizes ?? state.campaign?.prizeCategories?.map((prize) => ({ name: prize.name, quantity: 0 })) ?? [];
  elements.prizeSummary.hidden = prizes.length === 0;
  const enoughPrizeData = hasEnoughPrizeData(stats);
  elements.prizeSummary.innerHTML = `<p class="prize-note">景品内訳をすべて入力した投稿のみ集計しています。${enoughPrizeData ? "" : " 現在は参考値として件数のみ表示します。"}</p><ul>${prizes.map((prize) => {
    const quantity = Number(prize.quantity ?? 0);
    const ratio = stats.completePrizeCount ? `（${(quantity / stats.completePrizeCount * 100).toFixed(1)}%）` : "";
    return `<li>${escapeHtml(prize.name)} <strong>${quantity.toLocaleString("ja-JP")}</strong>個${enoughPrizeData ? ratio : ""}</li>`;
  }).join("")}</ul>`;
}

function filteredStores() {
  const query = normalizeSearchText(elements.search.value);
  const prefecture = elements.prefecture.value;
  return state.stores.filter((store) => {
    const haystack = normalizeSearchText([store.name, store.prefecture, store.city, store.address].join(" "));
    return (!query || haystack.includes(query)) && (!prefecture || store.prefecture === prefecture);
  });
}

function renderStores() {
  const stores = filteredStores();
  const visibleStores = stores.slice(0, state.visibleStoreCount);
  elements.searchClear.hidden = !elements.search.value;
  elements.storeCount.textContent = visibleStores.length < stores.length ? `${visibleStores.length} / ${stores.length}店舗を表示` : `${stores.length}店舗を表示`;
  elements.storeStatus.textContent = state.stores.length ? "" : "現在、表示できる店舗データがありません。";
  elements.storeLoadMore.hidden = visibleStores.length >= stores.length;
  elements.storeLoadMore.textContent = `さらに表示（残り${Math.max(0, stores.length - visibleStores.length)}店舗）`;
  if (!stores.length) {
    elements.storeList.innerHTML = `<div class="empty-state"><strong>条件に合う店舗が見つかりませんでした</strong><br>検索語や都道府県を変えてお試しください。</div>`;
    return;
  }
  elements.storeList.innerHTML = visibleStores.map((store) => {
    const stats = getStats(store);
    const stateLabel = stats.reportCount === 0
      ? "まだデータがありません"
      : hasEnoughRateData(stats)
        ? `抽選 ${stats.totalDraws.toLocaleString("ja-JP")}回・当たり ${stats.totalWins.toLocaleString("ja-JP")}回`
        : "データ不足";
    return `<article class="store-card"><h3>${escapeHtml(store.name)}</h3><p class="store-location">${escapeHtml(store.prefecture)} ${escapeHtml(store.city)}</p><div class="store-meta"><span><strong>${Number(stats.reportCount).toLocaleString("ja-JP")}</strong> 投稿</span><span><strong>${Number(stats.totalDraws).toLocaleString("ja-JP")}</strong> 抽選</span></div><span class="data-state">${escapeHtml(stateLabel)}</span><button class="store-open" type="button" data-store-id="${escapeHtml(store.id)}">詳しく見る →</button></article>`;
  }).join("");
}

function resetStoreResults() {
  state.visibleStoreCount = STORE_RENDER_BATCH_SIZE;
  renderStores();
}

function populateStoreControls() {
  const prefectures = [...new Set(state.stores.map((store) => store.prefecture))].sort((a, b) => a.localeCompare(b, "ja"));
  elements.prefecture.insertAdjacentHTML("beforeend", prefectures.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join(""));
  elements.reportStore.insertAdjacentHTML("beforeend", state.stores.map((store) => `<option value="${escapeHtml(store.id)}">${escapeHtml(store.prefecture)}｜${escapeHtml(store.name)}</option>`).join(""));
}

function renderPrizeFields(prizes) {
  elements.prizeFields.innerHTML = prizes.map((prize) => `<label class="field" for="prize-${escapeHtml(prize.id)}"><span>${escapeHtml(prize.name)}</span><input id="prize-${escapeHtml(prize.id)}" name="prize:${escapeHtml(prize.id)}" type="number" min="0" max="300" inputmode="numeric" value="0" required></label>`).join("");
}

async function openStore(storeId, trigger) {
  const store = state.stores.find((item) => item.id === storeId);
  if (!store) return;
  state.selectedStoreId = storeId;
  state.lastTrigger = trigger ?? document.activeElement;
  const stats = getStats(store);
  elements.storeDialogTitle.textContent = store.name;
  elements.storeDialogBody.innerHTML = `<p class="detail-address">${escapeHtml(store.address)}</p><div class="period-tabs" aria-label="集計期間"><button type="button" data-store-period="all" aria-pressed="true">全期間</button><button type="button" data-store-period="7d" aria-pressed="false">直近7日</button></div><p id="detail-period-note" class="section-note section-note-left"></p><div class="detail-stats"><div class="detail-stat"><span>投稿</span><strong id="detail-report-count">${stats.reportCount}</strong>件</div><div class="detail-stat"><span>抽選</span><strong id="detail-draw-count">${stats.totalDraws}</strong>回</div><div class="detail-stat"><span>当たり</span><strong id="detail-win-count">${stats.totalWins}</strong>回</div><div class="detail-stat"><span>景品内訳</span><strong id="detail-prize-count">${stats.completePrizeCount ?? 0}</strong>個</div></div><div class="detail-actions"><button class="button button-primary" type="button" data-open-report data-store="${escapeHtml(store.id)}">この店舗の結果を投稿</button><button class="button button-secondary" type="button" data-share-store>この店舗を共有</button>${store.officialUrl ? `<a class="button button-secondary" href="${escapeHtml(store.officialUrl)}" target="_blank" rel="noreferrer">公式店舗情報</a>` : ""}</div><section class="detail-section"><h3>通常／ビッくらポン！プラス別の結果</h3><p id="detail-rate-note" class="section-note section-note-left"></p><div id="detail-usage" class="usage-breakdown"></div></section><section class="detail-section"><h3>景品別の報告数</h3><p id="detail-prize-note" class="section-note section-note-left">景品内訳をすべて入力した投稿のみ集計しています。</p><div id="detail-prizes">${state.campaign?.prizeCategories?.map((prize) => `<div class="recent-report"><p>${escapeHtml(prize.name)} <strong>0個</strong></p></div>`).join("") ?? ""}</div></section><section class="detail-section"><h3>最近の投稿</h3><div id="recent-reports"><p class="section-note section-note-left">投稿データはまだありません。</p></div></section>`;
  const url = new URL(location.href);
  url.searchParams.set("store", storeId);
  history.replaceState({}, "", url);
  elements.storeDialog.showModal();
  try {
    const detail = await fetchJson(`/api/stores/${encodeURIComponent(storeId)}?period=all`);
    updateStoreDialogStatsV2(detail);
    const reports = await fetchJson(`/api/stores/${encodeURIComponent(storeId)}/reports?limit=10`);
    renderRecentReports(reports.items ?? []);
  } catch { /* Static preview keeps the verified local data. */ }
}

function updateStoreDialogStatsV2(detail) {
  if (!detail?.stats) return;
  const values = {
    "#detail-report-count": detail.stats.reportCount,
    "#detail-draw-count": detail.stats.totalDraws,
    "#detail-win-count": detail.stats.totalWins,
    "#detail-prize-count": detail.stats.completePrizeCount,
  };
  for (const [selector, value] of Object.entries(values)) {
    const target = document.querySelector(selector);
    if (target) target.textContent = Number(value ?? 0).toLocaleString("ja-JP");
  }
  const periodNote = document.querySelector("#detail-period-note");
  if (periodNote) periodNote.textContent = detail.period === "7d" && detail.periodStart ? `${detail.periodStart.replaceAll("-", "/")}から今日まで` : "全期間の集計";
  const rateNote = document.querySelector("#detail-rate-note");
  if (rateNote) rateNote.textContent = hasEnoughRateData(detail.stats) ? "投稿データ上の集計です。" : "投稿数または抽選数が少ないため、当選率は表示していません。";
  const usageBox = document.querySelector("#detail-usage");
  if (usageBox) {
    const labels = { normal: "通常", plus: "ビッくらポン！プラス", unknown: "区分不明" };
    usageBox.innerHTML = (detail.usage ?? []).map((usage) => {
      const draws = Number(usage.panelDraws) + Number(usage.mobileDraws);
      const wins = Number(usage.panelWins) + Number(usage.mobileWins);
      const enoughRateData = hasEnoughRateData({ reportCount: usage.reportCount, totalDraws: draws });
      const rate = enoughRateData && draws > 0 ? `・当選率 ${(wins / draws * 100).toFixed(1)}%` : "";
      return `<article class="usage-card"><h4>${labels[usage.usageType] ?? "区分不明"}</h4><p>タッチパネル ${usage.panelDraws}回 / 当たり ${usage.panelWins}回</p><p>スマホ注文 ${usage.mobileDraws}回 / 当たり ${usage.mobileWins}回</p><p class="usage-total">合計 ${draws}回 / 当たり ${wins}回${rate}</p></article>`;
    }).join("");
  }
  const enoughPrizeData = hasEnoughPrizeData(detail.stats);
  const prizeNote = document.querySelector("#detail-prize-note");
  if (prizeNote) prizeNote.textContent = `景品内訳をすべて入力した投稿のみ集計しています。${enoughPrizeData ? "" : " 現在は参考値として件数のみ表示します。"}`;
  const prizeBox = document.querySelector("#detail-prizes");
  if (prizeBox && detail.prizes) prizeBox.innerHTML = detail.prizes.map((prize) => {
    const quantity = Number(prize.quantity ?? 0);
    const ratio = detail.stats.completePrizeCount ? `（${(quantity / detail.stats.completePrizeCount * 100).toFixed(1)}%）` : "";
    return `<div class="recent-report"><p>${escapeHtml(prize.name)} <strong>${quantity.toLocaleString("ja-JP")}個${enoughPrizeData ? ratio : ""}</strong></p></div>`;
  }).join("");
}

async function loadStorePeriod(period) {
  if (!state.selectedStoreId) return;
  const buttons = elements.storeDialog.querySelectorAll("[data-store-period]");
  buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.storePeriod === period)));
  try {
    const detail = await fetchJson(`/api/stores/${encodeURIComponent(state.selectedStoreId)}?period=${encodeURIComponent(period)}`);
    updateStoreDialogStatsV2(detail);
  } catch {
    const note = document.querySelector("#detail-period-note");
    if (note) note.textContent = "集計を読み込めませんでした。時間をおいて再度お試しください。";
  }
}

function renderRecentReports(reports) {
  const target = document.querySelector("#recent-reports");
  if (!target) return;
  if (!reports.length) { target.innerHTML = `<p class="section-note section-note-left">投稿データはまだありません。</p>`; return; }
  target.innerHTML = reports.map((report) => `<article class="recent-report"><p><strong>${escapeHtml(report.visitDate.replaceAll("-", "/"))}</strong>　${escapeHtml({ normal: "通常", plus: "プラス", unknown: "区分不明" }[report.usageType] ?? "区分不明")}</p><p>タッチパネル：${report.panelDraws}回 / ${report.panelWins}当たり</p><p>スマホ注文：${report.mobileDraws}回 / ${report.mobileWins}当たり</p><p>景品内訳：${escapeHtml({ complete: "すべて入力", partial: "一部不明", unknown: "未入力" }[report.prizeBreakdownStatus] ?? "未入力")}</p>${report.prizes?.length ? `<p>景品：${report.prizes.map((prize) => `${escapeHtml(prize.name)} ${prize.quantity}`).join("、")}</p>` : ""}</article>`).join("");
}

function closeStore() {
  elements.storeDialog.close();
  const url = new URL(location.href);
  url.searchParams.delete("store");
  history.replaceState({}, "", url);
  state.lastTrigger?.focus?.();
}

function openReport(storeId, trigger) {
  if (elements.storeDialog.open) elements.storeDialog.close();
  state.lastTrigger = trigger ?? document.activeElement;
  elements.reportStore.value = storeId ?? state.selectedStoreId ?? "";
  elements.visitDate.value = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  elements.visitDate.max = elements.visitDate.value;
  elements.formErrors.hidden = true;
  elements.formStatus.textContent = "";
  elements.reportDialog.showModal();
  refreshPostingStatus();
  ensureTurnstile();
}

function closeReport() { elements.reportDialog.close(); state.lastTrigger?.focus?.(); }

function validateForm(payload) {
  return validateReportPayload(payload, {
    storeIds: new Set(state.stores.map((store) => store.id)),
    campaign: state.campaign,
    prizeCategoryIds: new Set(state.campaign?.prizeCategories?.map((prize) => prize.id) ?? []),
  });
}

async function ensureTurnstile() {
  const container = document.querySelector("#turnstile-container");
  if (window.turnstile && turnstileWidgetId !== null) {
    window.turnstile.reset(turnstileWidgetId);
    return;
  }
  try {
    const config = await fetchJson("/api/config");
    if (!config.turnstileSiteKey) throw new Error("Turnstile が未設定です。");
    if (!turnstileLoader) {
      turnstileLoader = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
      });
    }
    await turnstileLoader;
    if (turnstileWidgetId === null) turnstileWidgetId = window.turnstile.render(container, { sitekey: config.turnstileSiteKey, theme: "light" });
  } catch {
    container.textContent = "投稿機能を利用するには Turnstile のローカル設定が必要です。";
  }
}

function formPayload() {
  const data = new FormData(elements.reportForm);
  return {
    storeId: data.get("storeId"), campaignId: data.get("campaignId"), visitDate: data.get("visitDate"), usageType: data.get("usageType"),
    prizeBreakdownStatus: data.get("prizeBreakdownStatus"),
    panelDraws: Number(data.get("panelDraws")), panelWins: Number(data.get("panelWins")), mobileDraws: Number(data.get("mobileDraws")), mobileWins: Number(data.get("mobileWins")), unknownPrizeCount: Number(data.get("unknownPrizeCount")),
    prizes: [...data.entries()].filter(([key]) => key.startsWith("prize:")).map(([key, value]) => ({ prizeCategoryId: key.slice(6), quantity: Number(value) })).filter((item) => item.quantity > 0),
    turnstileToken: data.get("cf-turnstile-response") ?? "",
  };
}

async function submitReport(event) {
  event.preventDefault();
  const payload = formPayload();
  const errors = validateForm(payload);
  if (errors.length) { elements.formErrors.hidden = false; elements.formErrors.innerHTML = `<strong>入力内容をご確認ください</strong><ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`; elements.formErrors.focus(); return; }
  const submit = elements.reportForm.querySelector('[type="submit"]');
  submit.disabled = true; elements.formStatus.textContent = "送信しています…";
  try {
    const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", ...await authHeaders() }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.errors?.join(" ") ?? result.error ?? "投稿を送信できませんでした。");
    state.posting = result.posting;
    elements.formErrors.hidden = true;
    elements.formStatus.textContent = result.status === "pending"
      ? "投稿ありがとうございます。内容を確認してから集計に反映します。"
      : "投稿ありがとうございました。集計への反映には少し時間がかかる場合があります。";
    if (result.posting) elements.postingStatus.textContent = `本日はあと${result.posting.remainingToday}件投稿できます。`;
    elements.reportForm.reset();
    elements.reportCampaign.value = state.campaign?.id ?? "";
    if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
    setTimeout(() => closeReport(), 1300);
  } catch (error) { elements.formErrors.hidden = false; elements.formErrors.textContent = error.message; elements.formStatus.textContent = ""; }
  finally { submit.disabled = false; }
}

async function shareStore() {
  const store = state.stores.find((item) => item.id === state.selectedStoreId);
  const url = new URL(location.href); url.searchParams.set("store", state.selectedStoreId);
  const shareData = { title: `${store.name}｜ビッくらポン！みんなの結果共有`, text: `${store.name}の利用者投稿データ`, url: url.toString() };
  try { if (navigator.share) await navigator.share(shareData); else { await navigator.clipboard.writeText(shareData.url); alert("共有URLをコピーしました。"); } } catch (error) { if (error.name !== "AbortError") alert("共有URLをコピーできませんでした。"); }
}

function bindEvents() {
  elements.search.addEventListener("input", resetStoreResults);
  elements.prefecture.addEventListener("change", resetStoreResults);
  elements.searchClear.addEventListener("click", () => { elements.search.value = ""; elements.search.focus(); resetStoreResults(); });
  elements.storeLoadMore.addEventListener("click", () => { state.visibleStoreCount += STORE_RENDER_BATCH_SIZE; renderStores(); });
  elements.storeList.addEventListener("click", (event) => { const button = event.target.closest("[data-store-id]"); if (button) openStore(button.dataset.storeId, button); });
  document.addEventListener("click", (event) => {
    const reportButton = event.target.closest("[data-open-report]");
    if (reportButton) openReport(reportButton.dataset.store, reportButton);
    if (event.target.closest("[data-close-dialog]")) closeStore();
    if (event.target.closest("[data-close-report]")) closeReport();
    if (event.target.closest("[data-share-store]")) shareStore();
    const periodButton = event.target.closest("[data-store-period]");
    if (periodButton) loadStorePeriod(periodButton.dataset.storePeriod);
  });
  elements.storeDialog.addEventListener("cancel", (event) => { event.preventDefault(); closeStore(); });
  elements.reportDialog.addEventListener("cancel", (event) => { event.preventDefault(); closeReport(); });
  elements.reportForm.addEventListener("submit", submitReport);
  elements.loginButton.addEventListener("click", async () => {
    elements.loginButton.disabled = true;
    try { await signIn(); } catch (error) { elements.authStatus.textContent = error.message; }
    finally { elements.loginButton.disabled = false; }
  });
  elements.logoutButton.addEventListener("click", async () => {
    elements.logoutButton.disabled = true;
    try { await signOut(); } catch (error) { elements.authStatus.textContent = error.message; }
    finally { elements.logoutButton.disabled = false; }
  });
}

async function loadData() {
  try {
    const [campaignData, storeData, stats] = await Promise.all([
      fetchJson("/api/campaigns", "/data/campaigns.json"), loadStoreMaster(), fetchJson("/api/stats", null).catch(() => null),
    ]);
    state.campaigns = campaignData.items ?? campaignData;
    state.campaign = state.campaigns[0] ?? null;
    const sparseStats = new Map((stats?.stores ?? []).map((entry) => [entry.storeId, entry]));
    state.stores = (storeData.items ?? storeData).map((store) => ({ ...store, stats: sparseStats.get(store.id) ?? getStats(store) }));
    state.stats = stats ?? { reportCount: 0, totalDraws: 0, totalWins: 0, totalPrizeCount: 0, completeReportCount: 0, completePrizeCount: 0, prizes: state.campaign?.prizeCategories?.map((prize) => ({ name: prize.name, quantity: 0 })) ?? [], usage: [], stores: [] };
    renderCampaigns(); renderStats(); populateStoreControls(); renderStores();
    const sharedStore = new URLSearchParams(location.search).get("store");
    if (sharedStore) requestAnimationFrame(() => openStore(sharedStore, document.querySelector(`[data-store-id="${CSS.escape(sharedStore)}"]`)));
  } catch { elements.storeStatus.textContent = "店舗データを読み込めませんでした。時間をおいて再度お試しください。"; elements.storeList.innerHTML = ""; renderStats(); }
}

bindEvents();
initializeAuth(renderAuth);
loadData();
