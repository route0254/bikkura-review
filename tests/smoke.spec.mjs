import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
});

test("トップページを表示し、店舗を検索・絞り込みできる", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "寄せられた結果" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "新宿靖国通り店" })).toBeVisible();
  await page.getByLabel("店舗名・地名").fill("新宿");
  await expect(page.getByRole("heading", { name: "新宿靖国通り店" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "なんば日本橋店" })).toBeHidden();
  await page.getByRole("button", { name: "検索をクリア" }).click();
  await page.getByLabel("都道府県").selectOption("大阪府");
  await expect(page.getByRole("heading", { name: "なんば日本橋店" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "新宿靖国通り店" })).toBeHidden();
});

test("店舗詳細を開閉し、フォーカスを戻す", async ({ page }) => {
  await page.goto("/");
  const trigger = page.locator('[data-store-id="kura-664"]');
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "新宿靖国通り店" })).toBeVisible();
  await page.getByRole("button", { name: "店舗詳細を閉じる" }).click();
  await expect(trigger).toBeFocused();
});

test("不正な回数は投稿前にエラーになる", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /結果を投稿/ }).first().click();
  await page.getByLabel("店舗 必須").selectOption("kura-664");
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
