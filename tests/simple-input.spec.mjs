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
    window.__BIKKURA_AUTH_MOCK__ = { enabled: true, user: null, token: "mock-firebase-token", async signIn() { return { uid: "mock-user" }; } };
  });
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page) ?? []).toEqual([]);
});

test("simple input is the default and submits spend, optional draws, and total prizes", async ({ page }) => {
  let submitted;
  await page.route("**/api/reports", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ code: "turnstile_failed", error: "投稿確認を更新しました。" }) });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /結果を投稿/ }).first().click();
  await expect(page.locator('[name="resultInputMode"][value="simple"]')).toBeChecked();
  await expect(page.locator("#simple-input-section")).toBeVisible();
  await expect(page.locator("#detailed-input-section")).toBeHidden();
  await page.getByLabel("都道府県 必須").selectOption("東京都");
  await page.getByLabel("店舗 必須").selectOption("kura-664");
  await page.getByLabel("使った金額 必須").fill("5000");
  await page.getByLabel("抽選した回数 任意").fill("10");
  await page.getByLabel("もらった景品の合計 必須").fill("3");
  await page.locator(".optional-prize-details summary").click();
  await page.locator("#simple-prize-chiikawa-2026-figure").fill("1");
  await page.locator("#simple-prize-chiikawa-2026-can-badge").fill("2");
  await page.getByRole("button", { name: "入力内容を確認" }).click();
  await page.getByRole("button", { name: "投稿する", exact: true }).click();

  const error = page.getByRole("alert");
  await expect(error).toBeVisible();
  await expect(error).toBeFocused();
  await expect.poll(() => error.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
  })).toBe(true);
  expect(submitted).toMatchObject({
    resultInputMode: "simple",
    spendAmountYen: 5000,
    reportedTotalDraws: 10,
    reportedPrizeCount: 3,
    usageType: "unknown",
    prizeInputMode: "total",
    guaranteedPrizeCount: 0,
    panelDraws: 0,
    panelWins: 0,
    mobileDraws: 0,
    mobileWins: 0,
    unknownPrizeCount: 0,
  });
  expect(submitted.prizes).toEqual([
    { acquisitionType: "total", prizeCategoryId: "chiikawa-2026-figure", quantity: 1 },
    { acquisitionType: "total", prizeCategoryId: "chiikawa-2026-can-badge", quantity: 2 },
  ]);
});

test("mobile form stays within the viewport and switches modes by keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: /結果を投稿/ }).first().click();
  const dialog = page.getByRole("dialog", { name: "結果を投稿する" });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel("使った金額 必須")).toBeVisible();
  await expect(page.getByLabel("もらった景品の合計 必須")).toBeVisible();
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);

  const detailed = page.locator('[name="resultInputMode"][value="detailed"]');
  await detailed.focus();
  await page.keyboard.press("Space");
  await expect(detailed).toBeChecked();
  await expect(page.locator("#simple-input-section")).toBeHidden();
  await expect(page.locator("#detailed-input-section")).toBeVisible();
  await expect(page.locator("#panel-draws")).toBeEnabled();

  const results = await new AxeBuilder({ page }).include("#report-dialog").analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact))).toEqual([]);
});

test("simple summaries are shown separately from draw statistics", async ({ page }) => {
  await page.route("**/api/stats?*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      reportCount: 2,
      totalDraws: 8,
      totalWins: 1,
      totalPrizeCount: 1,
      completeReportCount: 1,
      completePrizeCount: 1,
      prizes: [],
      usage: [],
      stores: [],
      coverage: {},
      simple: { reportCount: 1, spendAmountYen: 5000, reportedPrizeCount: 3, reportedDrawCount: 10, drawCountReportCount: 1 },
    }),
  }));
  await page.goto("/");
  await expect(page.locator("#simple-summary")).toBeVisible();
  await expect(page.locator("#simple-summary")).toContainText("5,000円");
  await expect(page.locator("#simple-summary")).toContainText("3個");
  await expect(page.locator("#simple-summary")).toContainText("10回");
  await expect(page.locator("#simple-summary")).toContainText("当選率や抽選景品ランキングとは分けて集計");
});
