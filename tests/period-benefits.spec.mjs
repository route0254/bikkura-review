import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const errors = new WeakMap();
const campaign = "chiikawa-kurasushi-2026-summer";
const spend = { reportCount: 6, minimum: 5, metrics: {
  spend: { count: 6, median: 5200 }, prizes: { count: 6, median: 5 }, perPrize: { count: 5, median: 1040 },
  per1000: { count: 6, median: 0.96 }, drawn: { count: 5, median: 4 }, guaranteed: { count: 5, median: 1 },
}, bands: [{ id: "3000to5999", label: "3,000〜5,999円", count: 5, median: 5 }] };

test.beforeEach(async ({ page }) => {
  const runtime = []; errors.set(page, runtime);
  page.on("pageerror", (error) => runtime.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") runtime.push(message.text()); });
  await page.clock.setFixedTime(new Date("2026-09-06T03:00:00.000Z"));
  await page.addInitScript(() => {
    window.__BIKKURA_AUTH_MOCK__ = { enabled: true, user: null, token: "test-token", async signIn() { return { uid: "private-uid", email: "private@example.test", displayName: "PRIVATE NAME" }; } };
  });
  await page.route("https://challenges.cloudflare.com/**", (route) => route.fulfill({ contentType: "application/javascript", body: "window.turnstile={render(el,options){queueMicrotask(()=>options.callback?.('test-token'));return 1},reset(){},getResponse(){return 'test-token'}}" }));
});
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));

async function openStore(page) {
  await page.goto("/?store=kura-664");
  await expect(page.locator("#store-dialog")).toBeVisible();
  await expect(page.locator("#detail-period-note")).toContainText("全期間");
}

async function fillSimple(page) {
  await page.goto("/");
  await page.getByRole("button", { name: /結果を投稿/ }).first().click();
  await page.locator("#report-prefecture").selectOption("東京都");
  await page.locator("#report-store").selectOption("kura-664");
  await page.locator("#visit-date").fill("2026-09-04");
  await page.locator("#spend-amount").fill("5200");
  await page.locator("#reported-prize-count").fill("5");
  await page.locator("#simple-guaranteed-count").fill("1");
}

test("top intro, period filter, ranking explanation and prefecture queries stay scoped", async ({ page }) => {
  const requests = [];
  page.on("request", (r) => { if (r.url().includes("/api/")) requests.push(r.url()); });
  await page.goto("/");
  await expect(page.locator("#period-filter button")).toHaveCount(5);
  await expect(page.getByRole("heading", { name: "このサイトでわかること" })).toBeVisible();
  expect(requests.some((url) => /\/benefits|external-reports/.test(url))).toBe(false);
  for (const period of ["period1", "period2", "period3", "7d"]) {
    await page.locator(`[data-global-period="${period}"]`).click();
    await expect(page.locator(`[data-global-period="${period}"]`)).toHaveAttribute("aria-pressed", "true");
    expect(requests.some((url) => url.includes("/api/stats?") && url.includes(`period=${period}`))).toBe(true);
  }
  await page.getByRole("tab", { name: "フィギュアランキング" }).click();
  await expect(page.locator(".ranking-method")).toContainText("サンプル数");
  await expect(page.locator("#ranking-status")).toContainText("現在ランキング対象");
  await page.getByRole("tab", { name: "都道府県別集計" }).click();
  await expect(page.locator("#prefecture-stats-status")).toContainText("まだありません");
  expect(requests.some((url) => url.includes("/api/stats/prefectures?") && url.includes("period=7d"))).toBe(true);
});

test("store periods, comparison, median spending and mobile layout are accessible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/stores/kura-664?*", async (route) => {
    const response = await route.fetch(); const body = await response.json();
    await route.fulfill({ json: { ...body, spend } });
  });
  await openStore(page);
  await expect(page.locator("#detail-comparison .comparison-grid article")).toHaveCount(3);
  await expect(page.locator("#detail-spend")).toContainText("5,200円");
  await expect(page.locator("#detail-spend")).toContainText("1,040円");
  await expect(page.locator("#detail-spend")).toContainText("0.96個");
  await expect(page.locator("#detail-spend")).toContainText("価格改定");
  const period = page.locator('[data-store-period="period2"]');
  await period.focus(); await page.keyboard.press("Enter");
  await expect(page.locator("#detail-period-note")).toContainText("2026/09/04〜2026/09/17");
  expect(await page.locator("#store-dialog").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  const axe = await new AxeBuilder({ page }).include("#store-dialog").analyze();
  expect(axe.violations.filter((v) => ["serious", "critical"].includes(v.impact))).toEqual([]);
});

test("confirmation supports editing, unknown/zero, single submission, success and private sharing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let submissions = 0; let payload; let release;
  await page.route("**/api/reports", async (route) => {
    submissions++; payload = route.request().postDataJSON();
    await new Promise((resolve) => { release = resolve; });
    await route.fulfill({ json: { id: "test", status: "active", posting: { remainingToday: 4 } } });
  });
  await fillSimple(page);
  await expect(page.locator("#report-edit")).toBeHidden();
  await expect(page.locator("#report-cancel")).toBeVisible();
  await page.getByRole("button", { name: "入力内容を確認" }).click();
  await expect(page.locator("#report-cancel")).toBeHidden();
  await expect(page.locator("#report-edit")).toBeVisible();
  await expect(page.locator("#report-confirmation")).toContainText("4個");
  await expect(page.locator("#report-confirmation")).toContainText("不明");
  await expect(page.locator("#confirmation-title")).toBeFocused();
  await expect(page.locator("#report-confirmation")).not.toContainText("private");
  await page.getByRole("button", { name: "戻って修正" }).click();
  await expect(page.locator("#report-edit")).toBeHidden();
  await expect(page.locator("#report-cancel")).toBeVisible();
  await page.locator("#simple-guaranteed-count").fill("0");
  await page.getByRole("button", { name: "入力内容を確認" }).click();
  await expect(page.locator("#report-confirmation")).toContainText("0個");
  const axe = await new AxeBuilder({ page }).include("#report-dialog").analyze();
  expect(axe.violations.filter((v) => ["serious", "critical"].includes(v.impact))).toEqual([]);
  await page.getByRole("button", { name: "投稿する", exact: true }).click();
  await expect.poll(() => submissions).toBe(1);
  await expect(page.locator("#report-submit")).toBeDisabled();
  await page.locator("#report-form").evaluate((form) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(submissions).toBe(1); release();
  await expect(page.locator("#report-success")).toBeVisible();
  expect(payload.simpleGuaranteedPrizeCount).toBe(0);
  const x = page.getByRole("link", { name: "Xで共有" });
  const text = new URL(await x.getAttribute("href")).searchParams.get("text");
  expect(text).toContain("新宿靖国通り店"); expect(text).toContain("store=kura-664");
  expect(text).not.toMatch(/5200|5,200|private/);
  await expect(x).toHaveAttribute("rel", "noopener noreferrer");
  await page.evaluate(() => { Object.defineProperty(navigator, "share", { configurable: true, value: async (data) => { window.sharedResult = data; } }); });
  await page.getByRole("button", { name: "共有・URLコピー" }).click();
  expect(await page.evaluate(() => window.sharedResult.text)).toContain("投稿しました");
  expect(await page.locator("#report-dialog").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test("benefit freshness, latest counts, separate posting, keyboard and axe", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let posted;
  const benefits = [
    { id: "b1", name: "第1弾 ミニ巾着", startsOn: "2026-08-21", endsOn: null, conditions: "税込3,000円ごと・無くなり次第終了", sourceUrl: "https://www.kurasushi.co.jp/author/008384.html", latest: { availability: "available", observedAt: "2026-09-03T00:00:00.000Z", freshness: "stale" }, last24h: { available: 0, unavailable: 0, unknown: 0 } },
    { id: "b2", name: "第2弾 湯呑み", startsOn: "2026-09-04", endsOn: null, conditions: "税込3,000円ごと・無くなり次第終了", sourceUrl: "https://www.kurasushi.co.jp/author/008384.html", latest: { availability: "available", observedAt: "2026-09-06T02:00:00.000Z", freshness: "24h" }, last24h: { available: 3, unavailable: 0, unknown: 0 } },
  ];
  await page.route("**/api/stores/kura-664/benefits?*", (route) => route.fulfill({ json: { items: benefits } }));
  await page.route("**/api/benefit-reports", async (route) => { posted = route.request().postDataJSON(); await route.fulfill({ json: { id: "test-benefit", status: "active", remainingToday: 4 } }); });
  await openStore(page);
  await expect(page.locator("#store-benefits")).toContainText("古い情報です");
  await expect(page.locator("#store-benefits")).toContainText("受け取れた 3件");
  await page.locator('[data-open-benefit="b2"]').click();
  await page.locator("#benefit-availability").selectOption("unavailable");
  const submit = page.getByRole("button", { name: "特典の状況を送信" });
  await submit.focus();
  const axe = await new AxeBuilder({ page }).include("#benefit-dialog").analyze();
  expect(axe.violations.filter((v) => ["serious", "critical"].includes(v.impact))).toEqual([]);
  await page.keyboard.press("Enter");
  await expect(page.locator("#benefit-form-status")).toContainText("共有しました");
  expect(posted).toMatchObject({ storeId: "kura-664", benefitId: "b2", availability: "unavailable" });
  expect(posted.observedAt).toBe("2026-09-06T03:00:00.000Z");
  await expect(submit).toBeDisabled();
  expect(await page.locator("#benefit-dialog").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test("period APIs reject invalid periods and keep external-only stores in the list", async ({ request }) => {
  for (const path of ["stats", "stats/prefectures", "rankings/figure", "stores/kura-664", "stores/kura-664/reports", "recent-reports"]) {
    expect((await request.get(`/api/${path}?campaign=${campaign}&period=invalid`)).status()).toBe(400);
  }
  const data = await (await request.get(`/api/stats?campaign=${campaign}&period=period2`)).json();
  expect(data.reportCount).toBe(0);
  expect(data.stores.some((s) => s.externalCollectionCount > 0)).toBe(true);
});
