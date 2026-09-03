import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const runtimeErrors = new WeakMap();

test.beforeEach(async ({ page }) => {
  const errors = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) errors.push(`console.error: ${message.text()}`);
  });
  await page.route("https://challenges.cloudflare.com/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: "window.turnstile={render(element,options){this.options=options;queueMicrotask(()=>options.callback?.('test-token'));return 1},reset(){queueMicrotask(()=>this.options?.callback?.('test-token'))},getResponse(){return 'test-token'}};",
  }));
  await page.addInitScript(() => {
    window.__BIKKURA_AUTH_MOCK__ = {
      enabled: true,
      user: null,
      token: "mock-firebase-token",
      async signIn() { return { uid: "mock-user" }; },
    };
  });
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page) ?? []).toEqual([]);
});

test("トップページを表示し、店舗を検索・絞り込みできる", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "寄せられた結果" })).toBeVisible();
  await expect(page.locator(".store-card h3").first()).toHaveText("北本店");
  await page.getByLabel("店舗名・地名").fill("新宿");
  await expect(page.getByRole("heading", { name: "新宿靖国通り店" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "なんば日本橋店" })).toBeHidden();
  await page.getByRole("button", { name: "検索をクリア" }).click();
  await page.locator("#prefecture-filter").selectOption("大阪府");
  await expect(page.getByRole("heading", { name: "なんば日本橋店" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "新宿靖国通り店" })).toBeHidden();
});

test("都道府県を北海道から沖縄県の順で表示する", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#prefecture-filter option")).toHaveCount(48);
  const listOptions = await page.locator("#prefecture-filter option").allTextContents();
  expect(listOptions.slice(1, 4)).toEqual(["北海道", "青森県", "岩手県"]);
  expect(listOptions.at(-1)).toBe("沖縄県");
  await page.getByRole("button", { name: /結果を投稿/ }).first().click();
  const reportOptions = await page.getByLabel("都道府県 必須").locator("option").allTextContents();
  expect(reportOptions.slice(1, 4)).toEqual(["北海道", "青森県", "岩手県"]);
  expect(reportOptions.at(-1)).toBe("沖縄県");
});

test("全国店舗を段階表示し、一覧の全店舗を検索できる", async ({ page }) => {
  const functionRequests = [];
  let storeMasterRequests = 0;
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/")) functionRequests.push(url.pathname);
    if (url.pathname === "/data/stores.json") storeMasterRequests += 1;
  });
  await page.goto("/");
  await expect(page.locator("#store-count")).toHaveText("60 / 552店舗を表示");
  expect(functionRequests.sort()).toEqual(["/api/campaigns", "/api/posting-status", "/api/recent-reports", "/api/stats"]);
  expect(storeMasterRequests).toBe(1);
  expect(functionRequests).not.toContain("/api/stores");
  await expect(page.locator(".store-card")).toHaveCount(60);
  await page.getByRole("button", { name: /さらに表示/ }).click();
  await expect(page.locator("#store-count")).toHaveText("120 / 552店舗を表示");
  await page.getByLabel("店舗名・地名").fill("旭川4条通");
  await expect(page.getByRole("heading", { name: "旭川4条通店" })).toBeVisible();
  await expect(page.locator("#store-count")).toHaveText("1店舗を表示");
});

test("初期表示をサイト内投稿と外部収集の合計件数順にする", async ({ page }) => {
  await page.route("**/api/stats?*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      reportCount: 2, totalDraws: 10, totalWins: 1, totalPrizeCount: 1,
      completeReportCount: 1, completePrizeCount: 1, prizes: [], usage: [],
      coverage: { reportingStoreCount: 1, totalStoreCount: 552, reportingPrefectureCount: 1, totalPrefectureCount: 47 },
      stores: [
        { storeId: "kura-648", reportCount: 2, externalCollectionCount: 0, totalDraws: 10, totalWins: 1, totalPrizeCount: 1, completeReportCount: 1, completePrizeCount: 1, prizes: [] },
        { storeId: "kura-660", reportCount: 0, externalCollectionCount: 3, totalDraws: 0, totalWins: 0, totalPrizeCount: 0, completeReportCount: 0, completePrizeCount: 0, prizes: [] },
      ],
    }),
  }));
  await page.goto("/");
  await expect(page.locator("#store-sort")).toHaveValue("default");
  await expect(page.locator("#store-sort option:checked")).toHaveText("投稿・外部情報が多い順");
  await expect(page.locator(".store-card h3").nth(0)).toHaveText("メモリアル店 なんば千日前");
  await expect(page.locator(".store-card h3").nth(1)).toHaveText("船橋フェイス店");
  await expect(page.locator(".store-card").nth(0)).toContainText("3 件の情報");
  await expect(page.locator(".store-card").nth(0)).toContainText("サイト内投稿 0件・外部収集 3件");
  await expect(page.locator(".store-card").nth(1)).toContainText("2 件の情報");
  await expect(page.locator(".store-card").nth(1)).toContainText("サイト内投稿 2件・外部収集 0件");
});

test("店舗詳細を開閉し、フォーカスを戻す", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("店舗名・地名").fill("新宿靖国通り");
  const trigger = page.locator('[data-store-id="kura-664"]');
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "新宿靖国通り店" })).toBeVisible();
  await expect(page.getByRole("button", { name: "全期間" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#detail-period-note")).toHaveText("全期間の集計");
  await expect(page.getByRole("heading", { name: "通常", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "ビッくらポン！プラス", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "直近7日" }).click();
  await expect(page.getByRole("button", { name: "直近7日" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#detail-period-note")).toContainText("から今日まで");
  await page.getByRole("button", { name: "店舗詳細を閉じる" }).click();
  await expect(trigger).toBeFocused();
});

test("不正な回数は投稿前にエラーになる", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /結果を投稿/ }).first().click();
  await page.locator('[name="resultInputMode"][value="detailed"]').check();
  await page.getByLabel("都道府県 必須").selectOption("東京都");
  await page.getByLabel("店舗 必須").selectOption("kura-664");
  await page.getByLabel("景品の内訳をどこまで入力できますか？ 必須").selectOption("partial");
  await page.locator("#panel-draws").fill("1");
  await page.locator("#panel-wins").fill("2");
  await page.getByRole("button", { name: "この内容で投稿" }).click();
  await expect(page.getByRole("alert")).toContainText("抽選回数以下");
});

test("投稿フォームで都道府県から店舗を絞り込み、個別景品内訳を任意入力できる", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /結果を投稿/ }).first().click();
  await page.locator('[name="resultInputMode"][value="detailed"]').check();
  const storeSelect = page.getByLabel("店舗 必須");
  await expect(storeSelect).toBeDisabled();
  await page.getByLabel("都道府県 必須").selectOption("東京都");
  await expect(storeSelect).toBeEnabled();
  await expect(storeSelect.locator('option[value="kura-664"]')).toHaveText("新宿靖国通り店");
  await expect(storeSelect.locator('option[value="kura-547"]')).toHaveCount(0);

  await page.locator("#prize-total\\:chiikawa-2026-figure").fill("2");
  const toggle = page.locator('[data-item-toggle="total:chiikawa-2026-figure"]');
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.locator("#item-total-chiikawa-2026-figure-chiikawa").fill("1");
  await expect(page.locator('[data-item-status="total:chiikawa-2026-figure"]')).toContainText("一部入力");
  await page.locator("#item-total-chiikawa-2026-figure-hachiware").fill("1");
  await expect(page.locator('[data-item-status="total:chiikawa-2026-figure"]')).toContainText("すべて入力");
});

test("店舗詳細でカテゴリ割合・全国比較・個別景品割合とデータ不足を表示する", async ({ page }) => {
  await page.route("**/api/stores/kura-664?period=all*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      stats: { reportCount: 8, totalDraws: 120, totalWins: 20, completeReportCount: 5, completePrizeCount: 20 },
      period: "all", periodStart: null,
      usage: [{ usageType: "normal", reportCount: 8, panelDraws: 120, panelWins: 20, mobileDraws: 0, mobileWins: 0 }],
      prizes: [{ id: "chiikawa-2026-figure", name: "フィギュア", quantity: 8 }, { id: "chiikawa-2026-can-badge", name: "缶バッジ", quantity: 7 }, { id: "chiikawa-2026-acrylic-magnet", name: "アクリルマグネット", quantity: 5 }],
      national: { stats: { completeReportCount: 20, completePrizeCount: 100 }, prizes: [{ id: "chiikawa-2026-figure", quantity: 30 }, { id: "chiikawa-2026-can-badge", quantity: 40 }, { id: "chiikawa-2026-acrylic-magnet", quantity: 30 }] },
      itemPrizes: [{ prizeCategoryId: "chiikawa-2026-figure", completeReportCount: 3, completeItemCount: 10, items: [{ id: "chiikawa-2026-figure-chiikawa", name: "ちいかわ", quantity: 4 }, { id: "chiikawa-2026-figure-hachiware", name: "ハチワレ", quantity: 6 }] }],
    }),
  }));
  await page.goto("/");
  await page.getByLabel("店舗名・地名").fill("新宿靖国通り");
  await page.locator('[data-store-id="kura-664"]').click();
  await expect(page.getByRole("heading", { name: "抽選で当たった景品カテゴリ" })).toBeVisible();
  await expect(page.locator("#detail-prizes")).toContainText("40.0%");
  await expect(page.locator("#detail-prizes")).toContainText("+10.0pt");
  const itemToggle = page.getByRole("button", { name: /フィギュア内訳/ });
  await itemToggle.click();
  await expect(itemToggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#detail-item-prizes")).toContainText("ちいかわ");
  await expect(page.locator("#detail-item-prizes")).toContainText("40.0%");
});

test("店舗詳細で通常投稿と外部参考情報を分離し、0・不明・partial・出典を表示する", async ({ page }) => {
  await page.route("**/api/stores/kura-664/external-reports**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ items: [
      {
        id: "external-x", sourceType: "external", visitDate: "2026-08-21", visitDateLabel: null,
        externalPlatform: "x", externalPlatformLabel: "X", externalUrl: "https://example.com/source",
        resultPrecision: "partial", usageType: "unknown", totalPrizes: 0, totalPrizesKind: "exact",
        spendAmountYen: 5000, spendAmountKind: "approx",
        prizes: [{ id: "figure", name: "フィギュア", quantity: 0, quantityKind: "exact" }], items: [],
      },
      {
        id: "external-tabelog", sourceType: "external", visitDate: null, visitDateLabel: "2026年8月23日頃",
        externalPlatform: "tabelog", externalPlatformLabel: "食べログ", externalUrl: "https://example.com/tabelog-source",
        resultPrecision: "partial", usageType: "plus", totalPrizes: null, totalPrizesKind: "unknown",
        prizes: [{ id: "figure", name: "フィギュア", quantity: 1, quantityKind: "at_least" }],
        items: [{ id: "figure-chiikawa", name: "ちいかわ", prizeCategoryName: "フィギュア", quantity: 1, quantityKind: "at_least" }],
      },
      {
        id: "external-no-url", sourceType: "external", visitDate: "2026-08-24", visitDateLabel: null,
        externalPlatform: "blog", externalPlatformLabel: "ブログ", externalUrl: null,
        resultPrecision: "partial", usageType: "unknown", totalPrizes: 2, totalPrizesKind: "exact",
        prizes: [{ id: "figure", name: "フィギュア", quantity: 0, quantityKind: "exact" }], items: [],
      },
    ] }),
  }));
  await page.goto("/");
  await page.getByLabel("店舗名・地名").fill("新宿靖国通り");
  await page.locator('[data-store-id="kura-664"]').click();
  await expect(page.getByRole("heading", { name: "みんなの投稿" })).toBeVisible();
  const external = page.locator("#external-reports");
  await expect(page.getByRole("heading", { name: "外部で確認された参考情報" })).toBeVisible();
  await expect(page.locator(".external-reference-section")).toContainText("全国統計やランキングには含めていません");
  await expect(external).toContainText("0個");
  await expect(external).toContainText("不明");
  await expect(external).toContainText("1個以上");
  await expect(external).toContainText("約5,000円");
  await expect(external).toContainText("一部情報のみ");
  await expect(external).toContainText("2026年8月23日頃");
  await expect(external).toContainText("出典URL確認中");
  await expect(page.getByRole("link", { name: /出典を見る/ })).toHaveCount(2);
  const source = page.getByRole("link", { name: /出典を見る/ }).first();
  await expect(source).toHaveAttribute("href", "https://example.com/source");
  await expect(source).toHaveAttribute("target", "_blank");
  await expect(source).toHaveAttribute("rel", "noopener noreferrer");
  await source.focus();
  await expect(source).toBeFocused();
  const results = await new AxeBuilder({ page }).include("#store-dialog").analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact))).toEqual([]);
});

test("外部参考情報が0件の店舗を中立的に表示し、モバイル幅でも読める", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/stores/kura-547/external-reports**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ items: [] }),
  }));
  await page.goto("/?store=kura-547");
  await expect(page.getByRole("dialog", { name: "なんば日本橋店" })).toBeVisible();
  await expect(page.locator("#external-reports")).toHaveText("この店舗の外部参考情報はありません。");
});

test("実DBの外部seedを取得しても全国統計とランキングは0件のまま", async ({ request }) => {
  const [externalResponse, statsResponse, rankingResponse] = await Promise.all([
    request.get("/api/stores/kura-660/external-reports?limit=10"),
    request.get("/api/stats"),
    request.get("/api/rankings/figure"),
  ]);
  expect(externalResponse.ok()).toBeTruthy();
  expect(statsResponse.ok()).toBeTruthy();
  expect(rankingResponse.ok()).toBeTruthy();
  const external = await externalResponse.json();
  const stats = await statsResponse.json();
  const ranking = await rankingResponse.json();
  expect(external.items).toHaveLength(2);
  expect(external.items.every((item) => item.externalUrl?.startsWith("https://"))).toBeTruthy();
  expect(stats.reportCount).toBe(0);
  expect(stats.totalPrizeCount).toBe(0);
  expect(stats.stores.find((store) => store.storeId === "kura-87")).toMatchObject({ reportCount: 0, externalCollectionCount: 2 });
  expect(ranking.items).toEqual([]);
});

test("出典URL確認中の外部収集情報を店舗詳細で公開する", async ({ page }) => {
  await page.goto("/");
  const firstCard = page.locator(".store-card").first();
  await expect(firstCard.getByRole("heading")).toHaveText("北本店");
  await expect(firstCard).toContainText("2 件の情報");
  await expect(firstCard).toContainText("サイト内投稿 0件・外部収集 2件");
  await firstCard.getByRole("button", { name: /結果を見る/ }).click();
  await expect(page.locator("#external-reports .external-report-card")).toHaveCount(2);
  await expect(page.locator("#external-reports")).toContainText("食べログ");
  await expect(page.locator("#external-reports").getByRole("link", { name: /出典を見る/ })).toHaveCount(2);
});

test("本人投稿APIは未認証アクセスを拒否する", async ({ request }) => {
  const [list, withdraw, restore] = await Promise.all([
    request.get("/api/me/reports"),
    request.post("/api/me/reports/not-found/withdraw"),
    request.post("/api/me/reports/not-found/restore"),
  ]);
  expect(list.status()).toBe(401);
  expect(withdraw.status()).toBe(401);
  expect(restore.status()).toBe(401);
});

test("投稿0件とサンプル不足の店舗カードを中立的に表示する", async ({ page }) => {
  await page.route("**/api/stats?*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ reportCount: 2, totalDraws: 18, totalWins: 2, totalPrizeCount: 2, completeReportCount: 1, completePrizeCount: 2, prizes: [], stores: [{ storeId: "kura-664", reportCount: 2, totalDraws: 18, totalWins: 2, completeReportCount: 1, completePrizeCount: 2, prizes: [] }] }),
  }));
  await page.goto("/");
  await page.getByLabel("店舗名・地名").fill("新宿靖国通り");
  await expect(page.locator(".store-card")).toContainText("まだデータが少ないです");
  await page.getByLabel("店舗名・地名").fill("なんば日本橋");
  await expect(page.locator(".store-card")).toContainText("まだ情報がありません");
  await expect(page.getByRole("button", { name: /結果を投稿/ }).last()).toBeVisible();
});

test("ランキングを遅延取得し、対象店舗の詳細を開ける", async ({ page }) => {
  await page.route("**/api/rankings/figure?campaign=*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ minimums: { completeReports: 5, completePrizes: 50 }, items: [{ rank: 1, storeId: "kura-664", storeName: "新宿靖国通り店", prefecture: "東京都", city: "新宿区", share: 0.283, completePrizeCount: 113, completeReportCount: 12 }] }),
  }));
  await page.goto("/");
  await expect(page.locator(".store-card").first()).toBeVisible();
  await expect(page.locator("#store-browser")).toBeVisible();
  await expect(page.locator("#figure-ranking")).toBeHidden();
  const rankingResponse = page.waitForResponse((response) => response.url().includes("/api/rankings/figure?campaign="));
  await page.getByRole("tab", { name: "フィギュアランキング" }).click();
  await rankingResponse;
  await expect(page.getByRole("tab", { name: "フィギュアランキング" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#store-browser")).toBeHidden();
  await expect(page.locator("#figure-ranking")).toBeVisible();
  const rankingButton = page.getByRole("button", { name: /1位.*新宿靖国通り店/ });
  await expect(rankingButton).toBeVisible();
  await rankingButton.click();
  await expect(page.getByRole("dialog", { name: "新宿靖国通り店" })).toBeVisible();
});

test("表示タブをキーボードで切り替えられる", async ({ page }) => {
  await page.goto("/");
  const storeTab = page.getByRole("tab", { name: "店舗を探す" });
  const rankingTab = page.getByRole("tab", { name: "フィギュアランキング" });
  await storeTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(rankingTab).toBeFocused();
  await expect(rankingTab).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(storeTab).toBeFocused();
  await expect(page.locator("#store-browser")).toBeVisible();
});

test("共有URLから店舗詳細を直接開ける", async ({ page }) => {
  await page.goto("/?store=kura-547");
  await expect(page.getByRole("dialog", { name: "なんば日本橋店" })).toBeVisible();
});

test("スマートフォン幅でも主要操作ができる", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: /結果を投稿/ }).first()).toBeVisible();
  await page.getByLabel("店舗名・地名").fill("福岡");
  await expect(page.getByRole("heading", { name: "福岡高木店" })).toBeVisible();
});

test("キーボード操作と重大なアクセシビリティ違反を確認する", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "本文へ移動" })).toBeFocused();
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
  expect(serious).toEqual([]);
});

test("Googleログインは任意で匿名状態とログイン状態を切り替えられる", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#auth-status")).toHaveText("匿名利用中");
  await page.getByRole("button", { name: "Googleでログイン" }).click();
  await expect(page.locator("#auth-status")).toHaveText("ログイン中");
  await expect(page.getByRole("button", { name: "ログアウト" })).toBeVisible();
});

test("投稿画面に日次上限の状態を表示する", async ({ page }) => {
  await page.route("**/api/posting-status", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ authenticated: false, accountStatus: "active", dailyLimit: 5, usedToday: 5, remainingToday: 0, canPost: false, message: "本日の匿名投稿上限（5件）に達しました。ログインすると1日20件まで投稿できます。" }),
  }));
  await page.goto("/");
  await page.getByRole("button", { name: /結果を投稿/ }).first().click();
  await expect(page.locator("#posting-status")).toContainText("本日の匿名投稿上限（5件）");
});

test("BAN中は投稿できない理由を表示する", async ({ page }) => {
  await page.route("**/api/posting-status", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ authenticated: true, accountStatus: "banned", dailyLimit: 0, usedToday: 0, remainingToday: 0, canPost: false, message: "このアカウントからは現在投稿できません。" }),
  }));
  await page.goto("/");
  await page.getByRole("button", { name: /結果を投稿/ }).first().click();
  await expect(page.locator("#posting-status")).toHaveText("このアカウントからは現在投稿できません。");
});

test("確定セット等をパネル・スマホと同列で入力し、景品内訳は合計だけ入力する", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /結果を投稿/ }).first().click();
  await page.locator('[name="resultInputMode"][value="detailed"]').check();
  await expect(page.getByRole("group", { name: "タッチパネル" })).toBeVisible();
  await expect(page.getByRole("group", { name: "スマホ注文" })).toBeVisible();
  await expect(page.getByRole("group", { name: "抽選なしでもらった景品" })).toBeVisible();
  await page.getByLabel("確定セット・対象商品など").fill("2");
  await expect(page.getByRole("group", { name: "今回もらった景品の合計" }).getByRole("spinbutton")).toHaveCount(4);
});

test("投稿時に合計景品を送信し、Turnstile失敗時は確認を更新する", async ({ page }) => {
  let submitted;
  await page.route("**/api/reports", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ code: "turnstile_failed", error: "投稿確認を更新したので、もう一度投稿してください。" }),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /結果を投稿/ }).first().click();
  await page.locator('[name="resultInputMode"][value="detailed"]').check();
  await page.getByLabel("都道府県 必須").selectOption("東京都");
  await page.getByLabel("店舗 必須").selectOption("kura-664");
  await page.locator("#panel-draws").fill("1");
  await page.locator("#panel-wins").fill("1");
  await page.getByLabel("確定セット・対象商品など").fill("1");
  await page.getByLabel("景品の内訳をどこまで入力できますか？ 必須").selectOption("complete");
  await page.locator("#prize-total\\:chiikawa-2026-figure").fill("2");
  await page.getByRole("button", { name: "この内容で投稿" }).click();
  const formError = page.getByRole("alert");
  await expect(formError).toContainText("投稿確認を更新");
  await expect(formError).toBeFocused();
  await expect.poll(() => formError.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
  })).toBe(true);
  expect(submitted.prizeInputMode).toBe("total");
  expect(submitted.guaranteedPrizeCount).toBe(1);
  expect(submitted.prizes).toEqual([{ acquisitionType: "total", prizeCategoryId: "chiikawa-2026-figure", quantity: 2 }]);
});

test("都道府県別集計をタブで遅延取得する", async ({ page }) => {
  await page.route("**/api/stats/prefectures?*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ items: [{ prefecture: "東京都", reportCount: 3, reportingStoreCount: 2, totalDraws: 20, totalWins: 4 }] }),
  }));
  await page.goto("/");
  await page.getByRole("tab", { name: "都道府県別集計" }).click();
  await expect(page.locator("#prefecture-stats")).toContainText("東京都");
  await expect(page.locator("#prefecture-stats")).toContainText("20回");
});

test("ログインユーザーは自分の投稿を確認し、取り下げ状態を区別できる", async ({ page }) => {
  await page.route("**/api/me/reports?*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ items: [{ id: "report-1", storeName: "新宿靖国通り店", campaignName: "テスト", visitDate: "2026-09-02", panelDraws: 5, panelWins: 1, mobileDraws: 0, mobileWins: 0, status: "withdrawn", moderationStatus: "active", prizes: [{ id: "figure", name: "フィギュア", quantity: 1, acquisitionType: "draw" }] }] }),
  }));
  await page.goto("/");
  await page.getByRole("button", { name: "Googleでログイン" }).click();
  await page.getByRole("button", { name: "自分の投稿" }).click();
  const dialog = page.getByRole("dialog", { name: "自分の投稿" });
  await expect(dialog).toContainText("新宿靖国通り店");
  await expect(dialog).toContainText("取り下げ済み");
  await expect(dialog.getByRole("button", { name: "取り下げを解除" })).toBeVisible();
});
