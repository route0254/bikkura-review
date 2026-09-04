import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
const campaign=JSON.parse(readFileSync(new URL("../data/campaigns.json",import.meta.url)))[0];
const masters=JSON.parse(readFileSync(new URL("../data/benefits.json",import.meta.url)));
const chiikawa="chiikawa-2026-figure-chiikawa",usagi="chiikawa-2026-figure-usagi";
const errors=new WeakMap();
const goods={reportCount:5,totalPrizes:5,categories:campaign.prizeCategories.map((c)=>({id:c.id,name:c.name,quantity:c.sortOrder===1?5:0,unknownDesignQuantity:0,items:campaign.prizeItems.filter((i)=>i.prizeCategoryId===c.id).map((i)=>({...i,quantity:i.id===chiikawa?2:i.id===usagi?3:0,share:null}))}))};
const selected=masters[1];
const benefitRow={storeId:"kura-664",storeName:"新宿靖国通り店",prefecture:"東京都",latest:{availability:"available",observedAt:"2026-09-04T04:00:00.000Z",freshness:"24h"},last24h:{available:3,unavailable:2,unknown:0},conflicting:true};
test.beforeEach(async({page})=>{
  const list=[];errors.set(page,list);page.on("pageerror",e=>list.push(e.message));page.on("console",m=>{if(m.type()==="error")list.push(m.text());});
  await page.clock.setFixedTime(new Date("2026-09-04T05:00:00.000Z"));
  await page.addInitScript(()=>{window.__BIKKURA_AUTH_MOCK__={enabled:true,user:null,token:"test",async signIn(){return {uid:"test-user"}}};});
  await page.route("**/api/posting-status",r=>r.fulfill({json:{authenticated:false,accountStatus:"active",dailyLimit:5,remainingToday:5,canPost:true}}));
  await page.route("https://challenges.cloudflare.com/**",r=>r.fulfill({contentType:"application/javascript",body:"window.turnstile={render(el,o){queueMicrotask(()=>o.callback?.('token'));return 1},reset(){},getResponse(){return 'token'}}"}));
  await page.route("**/api/stats/items?*",r=>r.fulfill({json:goods}));
  await page.route("**/api/benefits/latest?*",r=>r.fulfill({json:{benefits:masters,selected,items:[benefitRow],hasMore:false}}));
  await page.route("**/api/me/benefit-reports?*",r=>r.fulfill({json:{items:[]}}));
});
test.afterEach(async({page})=>expect(errors.get(page)).toEqual([]));
async function openGoods(page){
  await page.goto("/");await expect(page.locator("#national-goods .goods-card").first()).toBeVisible();
  await page.getByRole("button",{name:"グッズの結果を投稿",exact:true}).click();
  await page.locator("#report-prefecture").selectOption("東京都");await page.locator("#report-store").selectOption("kura-664");await page.locator("#visit-date").fill("2026-09-04");
}
async function chooseGoods(page){
  await page.getByRole("button",{name:"フィギュア ちいかわを1個増やす",exact:true}).click();
  await page.getByRole("button",{name:"フィギュア うさぎを1個増やす",exact:true}).click({clickCount:2});
}
test("top is goods-first, current period, scope filters, light initial requests and mobile",async({page},info)=>{
  await page.setViewportSize({width:390,height:844});const requests=[];page.on("request",r=>requests.push(r.url()));
  await page.goto("/");await expect(page.locator("#current-period")).toContainText("第2期間");
  await expect(page.locator("#national-goods [data-goods-item='"+chiikawa+"']")).toContainText("2");
  await expect(page.locator("#national-goods img").first()).toHaveAttribute("alt","フィギュア ちいかわ");
  await expect(page.locator("#stats-grid")).toBeHidden();
  const firstQuantity=await page.locator("#national-goods .goods-quantity").first().boundingBox();
  expect(firstQuantity.y+firstQuantity.height).toBeLessThanOrEqual(844);
  expect(requests.some(u=>/\/api\/(?:stores\/[^/]+\/(?:external-reports|benefits)|recent-reports)(?:\?|$)/.test(u))).toBe(false);
  await page.screenshot({path:info.outputPath("mobile-goods-home.png")});
  const region=page.waitForRequest(r=>r.url().includes("/api/stats/items?")&&new URL(r.url()).searchParams.get("prefecture")==="東京都");await page.locator("#goods-prefecture").selectOption("東京都");await region;
  const period=page.waitForRequest(r=>r.url().includes("/api/stats/items?")&&r.url().includes("period=period2"));await page.locator('[data-global-period="period2"]').click();await period;
  await page.locator('#national-goods [data-goods-tab="chiikawa-2026-can-badge"]').focus();await page.keyboard.press("Enter");
  await expect(page.locator('#national-goods [data-goods-panel="chiikawa-2026-can-badge"]')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const axe=await new AxeBuilder({page}).analyze();expect(axe.violations.filter(v=>["serious","critical"].includes(v.impact))).toEqual([]);
});
test("goods +/−, category and grand totals, optional spend, confirmation, single send and follow-up",async({page},info)=>{
  await page.setViewportSize({width:390,height:844});let posted,submissions=0,release;
  await page.route("**/api/reports",async r=>{posted=r.request().postDataJSON();submissions++;await new Promise(resolve=>release=resolve);await r.fulfill({json:{id:"test-report",status:"active"}});});
  await openGoods(page);await expect(page.locator('[name="resultInputMode"][value="goods"]')).toBeChecked();
  await expect(page.getByRole("button",{name:"フィギュア ちいかわを1個減らす",exact:true})).toBeDisabled();
  await chooseGoods(page);await expect(page.locator("#goods-totals")).toContainText("グッズ合計 3個");
  const minus=page.getByRole("button",{name:"フィギュア うさぎを1個減らす",exact:true});await minus.focus();await page.keyboard.press("Enter");await expect(page.locator("#goods-totals")).toContainText("グッズ合計 2個");await page.getByRole("button",{name:"フィギュア うさぎを1個増やす",exact:true}).click();
  const plusBox=await minus.boundingBox();expect(plusBox.width).toBeGreaterThanOrEqual(44);expect(plusBox.height).toBeGreaterThanOrEqual(44);
  await page.locator("#goods-guaranteed-known").check();await page.locator(`[data-goods-guaranteed="${usagi}"]`).fill("1");await expect(page.locator("#goods-totals")).toContainText("抽選由来 2個");
  await page.locator("#goods-spend").fill("5200");await page.locator("#report-benefit-followup").check();
  await page.getByRole("button",{name:"入力内容を確認",exact:true}).click();await expect(page.locator("#confirmation-goods article")).toHaveCount(2);await expect(page.locator("#confirmation-values")).toContainText("3個");
  await page.screenshot({path:info.outputPath("mobile-goods-confirm.png")});
  const axe=await new AxeBuilder({page}).include("#report-dialog").analyze();expect(axe.violations.filter(v=>["serious","critical"].includes(v.impact))).toEqual([]);
  await page.getByRole("button",{name:"投稿する",exact:true}).click();await expect.poll(()=>submissions).toBe(1);await expect(page.locator("#report-submit")).toBeDisabled();
  await page.locator("#report-form").evaluate(f=>f.dispatchEvent(new Event("submit",{cancelable:true,bubbles:true})));expect(submissions).toBe(1);release();
  await expect(page.locator("#report-success")).toBeVisible();expect(posted.goodsInput).toBe(true);expect(posted.reportedPrizeCount).toBeUndefined();expect(posted.spendAmountYen).toBe(5200);expect(posted.drawDetails).toBeNull();
  await page.getByRole("button",{name:"続けて先着特典の状況を報告"}).click();await expect(page.locator("#benefits-view")).toBeVisible();await expect(page.locator("#benefit-post-store")).toHaveValue("kura-664");
});
test("optional detailed draws remain and counts are validated without duplicate totals",async({page})=>{
  let posted;await page.route("**/api/reports",r=>{posted=r.request().postDataJSON();return r.fulfill({json:{id:"detail",status:"active"}});});
  await openGoods(page);await chooseGoods(page);await page.locator("#goods-draw-details > summary").click();await expect(page.locator("#goods-guaranteed-known")).toBeChecked();
  await page.locator("#goods-panel-draws").fill("10");await page.locator("#goods-panel-wins").fill("2");
  await page.getByRole("button",{name:"入力内容を確認",exact:true}).click();await expect(page.locator("#form-errors")).toContainText("一致しません");await expect(page.locator("#form-errors")).toBeFocused();
  await page.locator(`[data-goods-guaranteed="${usagi}"]`).fill("1");await page.getByRole("button",{name:"入力内容を確認",exact:true}).click();await page.getByRole("button",{name:"投稿する",exact:true}).click();
  await expect(page.locator("#report-success")).toBeVisible();expect(posted.drawDetails.panelDraws).toBe(10);expect(posted.spendAmountYen).toBeNull();
});
test("benefit overview shows disagreement, ended reports, searchable posting and separate quantity",async({page},info)=>{
  await page.setViewportSize({width:390,height:844});let benefit,normal=0;
  await page.route("**/api/reports",r=>{normal++;return r.abort();});await page.route("**/api/benefit-reports",r=>{benefit=r.request().postDataJSON();return r.fulfill({json:{id:"benefit",status:"active"}});});
  await page.goto("/");await expect(page.locator("#benefit-teaser")).toContainText("配布終了の報告");await expect(page.locator("#benefit-teaser")).toContainText("新宿靖国通り店");
  await page.locator("[data-benefits-view]").first().click();await expect(page.locator("#benefit-overview-list")).toContainText("直近の報告が分かれています");await expect(page.locator("#benefit-overview-list")).toContainText("受け取れた 3件 / 配布終了 2件");
  await page.locator("#benefit-prefecture").selectOption("東京都");await page.locator("#benefit-post-store").selectOption("kura-664");await page.locator("#benefit-post-start").click();
  await page.locator("#benefit-availability").selectOption("available");await page.locator("#benefit-quantity").fill("2");await page.locator("#benefit-submit").click();await expect(page.locator("#benefit-form-status")).toContainText("共有しました");
  expect(benefit.receivedQuantity).toBe(2);expect(normal).toBe(0);await page.screenshot({path:info.outputPath("mobile-benefit.png")});
  const axe=await new AxeBuilder({page}).include("#benefit-dialog").analyze();expect(axe.violations.filter(v=>["serious","critical"].includes(v.impact))).toEqual([]);
});
test("own benefit withdrawal is accessible and store keeps goods plus legacy statistics",async({page})=>{
  let withdrawn=false;await page.route("**/api/me/reports?*",r=>r.fulfill({json:{items:[]}}));
  await page.route("**/api/me/benefit-reports?*",r=>r.fulfill({json:{items:[{id:"own",storeName:"新宿靖国通り店",benefitName:"第2弾 湯呑み",observedAt:"2026-09-04T04:00:00.000Z",availability:"unavailable",status:withdrawn?"withdrawn":"active"}]}}));
  await page.route("**/api/me/benefit-reports/own/withdraw",r=>{withdrawn=true;return r.fulfill({json:{id:"own",status:"withdrawn"}});});
  await page.goto("/");await page.getByRole("button",{name:"Googleでログイン"}).click();await page.getByRole("button",{name:"自分の投稿",exact:true}).click();
  page.once("dialog",d=>d.accept());await page.getByRole("button",{name:"特典報告を取り下げる",exact:true}).click();await expect(page.locator("#my-benefits-body")).toContainText("取り下げ済み");
  await page.goto("/?store=kura-664");await expect(page.locator("#store-goods .goods-card").first()).toBeVisible();await expect(page.locator("#detail-draw-count")).toBeVisible();await expect(page.locator("#detail-usage")).toBeVisible();
  await expect(page.locator("#external-reports-title")).toBeVisible();
  const axe=await new AxeBuilder({page}).include("#store-dialog").analyze();expect(axe.violations.filter(v=>["serious","critical"].includes(v.impact))).toEqual([]);
});
test("320px card taps stay usable and missing image falls back",async({page})=>{
  await page.setViewportSize({width:320,height:740});await openGoods(page);
  expect(await page.locator("#report-dialog").evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  const first=page.locator("#goods-input-cards img").first();await first.evaluate(img=>{img.src="data:image/png;base64,broken";});await expect(first).toHaveAttribute("src","/public/goods-placeholder.svg");
  const axe=await new AxeBuilder({page}).include("#report-dialog").analyze();expect(axe.violations.filter(v=>["serious","critical"].includes(v.impact))).toEqual([]);
});

test("real local D1 aggregate APIs stay bounded and do not expose report identities",async({request})=>{
  for(const path of ["/api/stats/items?period=all","/api/stats/items?store=kura-664&period=period2","/api/benefits/latest?limit=5"]){
    const response=await request.get(path);expect(response.status()).toBe(200);
    const data=await response.json();
    if(data.categories){expect(data.categories).toHaveLength(3);expect(data.categories.flatMap(c=>c.items)).toHaveLength(21);expect(data.totalPrizes).toBeGreaterThanOrEqual(0);}
    else expect(data.items.length).toBeLessThanOrEqual(5);
    expect(JSON.stringify(data)).not.toMatch(/daily_rate_hash|user_id|abuse_hash|turnstileToken/);
  }
});
