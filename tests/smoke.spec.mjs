import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
});

test("トップページを表示し、店舗を検索・絞り込みできる", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "寄せられた結果" })).toBeVisible();
  await page.getByLabel("店舗名・地名").fill("新宿");
  await expect(page.getByRole("heading", { name: "新宿靖国通り店" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "なんば日本橋店" })).toBeHidden();
  await page.getByRole("button", { name: "検索をクリア" }).click();
  await page.getByLabel("都道府県").selectOption("大阪府");
  await expect(page.getByRole("heading", { name: "なんば日本橋店" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "新宿靖国通り店" })).toBeHidden();
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
  expect(functionRequests.sort()).toEqual(["/api/campaigns", "/api/stats"]);
  expect(storeMasterRequests).toBe(1);
  expect(functionRequests).not.toContain("/api/stores");
  await expect(page.locator(".store-card")).toHaveCount(60);
  await page.getByRole("button", { name: /さらに表示/ }).click();
  await expect(page.locator("#store-count")).toHaveText("120 / 552店舗を表示");
  await page.getByLabel("店舗名・地名").fill("旭川4条通");
  await expect(page.getByRole("heading", { name: "旭川4条通店" })).toBeVisible();
  await expect(page.locator("#store-count")).toHaveText("1店舗を表示");
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
  await page.getByLabel("店舗 必須").selectOption("kura-664");
  await page.getByLabel("景品の内訳をすべて入力できていますか？ 必須").selectOption("partial");
  await page.getByLabel("抽選回数").first().fill("1");
  await page.getByLabel("当たり回数").first().fill("2");
  await page.getByRole("button", { name: "この内容で投稿" }).click();
  await expect(page.getByRole("alert")).toContainText("抽選回数以下");
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
