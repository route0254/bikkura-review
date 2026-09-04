import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
const itemMaster=JSON.parse(readFileSync(new URL("../data/benefit-items.json",import.meta.url)));
const benefits=JSON.parse(readFileSync(new URL("../data/benefits.json",import.meta.url))).map(b=>({...b,items:itemMaster.filter(i=>i.benefitId===b.id)}));
const selected=benefits[1],ids=selected.items.map(i=>i.id);
const latest={availability:"available",observationType:"received",observedAt:"2026-09-04T04:00:00.000Z",freshness:"24h"};
const states=[{latest,last24h:{available:3,unavailable:2,unknown:0},conflicting:true},{latest:{...latest,availability:"unavailable",observationType:"store_notice"},last24h:{available:0,unavailable:2,unknown:0},conflicting:false},{latest:null,last24h:{available:0,unavailable:0,unknown:0}},{latest:{...latest,observedAt:"2026-09-01T04:00:00.000Z",freshness:"stale"},last24h:{available:0,unavailable:0,unknown:0}}];
const rows=selected.items.slice(0,2).map((item,n)=>({storeId:"kura-664",storeName:"新宿靖国通り店",prefecture:"東京都",benefitItem:item,...states[n]}));
const errors=new WeakMap();
test.beforeEach(async({page})=>{
  const list=[];errors.set(page,list);page.on("pageerror",e=>list.push(e.message));page.on("console",m=>{if(m.type()==="error")list.push(m.text());});
  await page.clock.setFixedTime(new Date("2026-09-04T05:00:00.000Z"));
  await page.addInitScript(()=>{window.__BIKKURA_AUTH_MOCK__={enabled:true,user:null,token:"test",async signIn(){return {uid:"test"};}};});
  await page.route("**/api/posting-status",r=>r.fulfill({json:{authenticated:false,accountStatus:"active",dailyLimit:5,remainingToday:5,canPost:true}}));
  await page.route("https://challenges.cloudflare.com/**",r=>r.fulfill({contentType:"application/javascript",body:"window.turnstile={render(el,o){queueMicrotask(()=>o.callback?.('token'));return 1},reset(){},getResponse(){return 'token'}}"}));
  await page.route("**/api/benefits/latest?*",r=>{const p=new URL(r.request().url()).searchParams,b=benefits.find(b=>b.id===p.get("benefit"))??selected;return r.fulfill({json:{benefits,selected:b,hasMore:false,items:p.get("summary")==="1"?[]:rows.filter(x=>!p.get("item")||x.benefitItem.id===p.get("item")),itemSummary:b.items.map((i,n)=>({...i,unavailableStoreCount:n<2?2:0,conflictingStoreCount:n===0?1:0}))}});});
  await page.route("**/api/stores/kura-664/benefits?*",r=>{const b=benefits.find(b=>b.id===new URL(r.request().url()).searchParams.get("benefit"))??selected;return r.fulfill({json:{benefits,selected:b,items:[{...b,latest:{...latest,availability:"unavailable"},last24h:{available:0,unavailable:9,unknown:0},items:b.items.map((i,n)=>({...i,...states[n]}))}]}});});
  await page.route("**/api/me/benefit-reports?*",r=>r.fulfill({json:{items:[]}}));
});
test.afterEach(async({page})=>expect(errors.get(page)).toEqual([]));
async function openForm(page){await page.goto("/?store=kura-664");await page.locator(`[data-open-benefit="${selected.id}"]`).click();}
async function axe(page,selector){const r=await new AxeBuilder({page}).include(selector).analyze();expect(r.violations.filter(v=>["serious","critical"].includes(v.impact))).toEqual([]);}

test("top fetches only summary; design counts, links and item/prefecture/store-name filters",async({page},info)=>{
  await page.setViewportSize({width:390,height:844});const requests=[];page.on("request",r=>requests.push(r.url()));
  await page.goto("/");await expect(page.locator("#benefit-teaser .benefit-item-card")).toHaveCount(4);
  expect(requests.filter(u=>u.includes("/api/benefits/latest")).every(u=>u.includes("summary=1"))).toBe(true);
  expect(requests.some(u=>/\/api\/stores\/[^/]+\/benefits/.test(u))).toBe(false);
  await expect(page.locator("#benefit-teaser")).not.toContainText("新宿靖国通り店");
  await page.locator(`[data-benefit-filter-item="${ids[1]}"]`).click();
  await expect(page.locator("#benefit-item-select")).toHaveValue(ids[1]);await expect(page.locator("#benefit-overview-list .benefit-store-report")).toHaveCount(1);
  await expect(page.locator("#benefit-overview-list")).toContainText("ハチワレ");await expect(page.locator("#benefit-overview-list")).not.toContainText("直近の報告が分かれています");
  const filter=page.waitForRequest(r=>r.url().includes("/api/benefits/latest")&&r.url().includes("q="+encodeURIComponent("新宿")));
  await page.locator("#benefit-prefecture").selectOption("東京都");await page.locator("#benefit-search").fill("新宿");await page.locator("#benefit-search-submit").click();await filter;
  await page.screenshot({path:info.outputPath("benefit-design-search-mobile.png")});await axe(page,"#benefits-view");
});
test("image selection posts four designs once; received quantities, notice and unknown stay separate",async({page},info)=>{
  await page.setViewportSize({width:390,height:844});let posted,sends=0,release;let normal=0;
  await page.route("**/api/reports",r=>{normal++;return r.abort();});
  await page.route("**/api/benefit-reports",async r=>{sends++;posted=r.request().postDataJSON();await new Promise(resolve=>release=resolve);await r.fulfill({json:{id:"batch",status:"active"}});});
  await openForm(page);await expect(page.locator("#benefit-item-picker img")).toHaveCount(4);
  await page.locator("#benefit-item-picker img").first().click();await expect(page.locator(`[data-benefit-item-check="${ids[0]}"]`)).toBeChecked();
  for(let n=0;n<4;n++){
    if(n)await page.locator(`[data-benefit-item-check="${ids[n]}"]`).check();
    await page.locator(`[data-benefit-item-observation="${ids[n]}"]`).selectOption(["received","notice","ended","unknown"][n]);
  }
  await page.locator(`[data-benefit-item-quantity="${ids[0]}"]`).fill("2");
  await page.screenshot({path:info.outputPath("benefit-batch-form-mobile.png")});
  expect(await page.locator("#benefit-dialog").evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);await axe(page,"#benefit-dialog");
  await page.locator("#benefit-submit").focus();await page.keyboard.press("Enter");await expect.poll(()=>sends).toBe(1);await expect(page.locator("#benefit-submit")).toBeDisabled();
  await page.locator("#benefit-form").evaluate(f=>f.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));expect(sends).toBe(1);release();
  await expect(page.locator("#benefit-form-status")).toContainText("共有しました");expect(posted.items).toHaveLength(4);expect(posted.availability).toBeUndefined();
  expect(posted.items[0]).toMatchObject({benefitItemId:ids[0],availability:"available",observationType:"received",receivedQuantity:2});
  expect(posted.items[1]).toMatchObject({availability:"available",observationType:"store_notice",receivedQuantity:null});expect(posted.items[2].availability).toBe("unavailable");expect(normal).toBe(0);
});
test("unselected designs are omitted, empty/error focuses alert, legacy submission and missing-image fallback",async({page})=>{
  await page.setViewportSize({width:320,height:740});let payload;
  await page.route("**/api/benefit-reports",r=>{payload=r.request().postDataJSON();return r.fulfill({json:{id:"one",status:"active"}});});
  await openForm(page);await page.locator("#benefit-submit").click();await expect(page.locator("#benefit-errors")).toBeFocused();
  const image=page.locator("#benefit-item-picker img").first();await image.evaluate(i=>i.src="data:image/png;base64,broken");await expect(image).toHaveAttribute("src","/public/goods-placeholder.svg");
  const check=page.locator(`[data-benefit-item-check="${ids[2]}"]`);await check.focus();await page.keyboard.press("Space");await expect(check).toBeChecked();
  await page.locator(`[data-benefit-item-observation="${ids[2]}"]`).selectOption("ended");await page.locator("#benefit-submit").click();await expect(page.locator("#benefit-form-status")).toContainText("共有しました");expect(payload.items).toHaveLength(1);
  await page.getByRole("button",{name:"特典投稿を閉じる",exact:true}).click();await page.locator(`[data-open-benefit="${selected.id}"]`).click();
  await page.locator("#benefit-whole-report").check();await expect(page.locator("#benefit-item-picker")).toBeHidden();await page.locator("#benefit-availability").selectOption("unavailable");
  await page.locator("#benefit-submit").click();await expect(page.locator("#benefit-form-status")).toContainText("共有しました");expect(payload.items).toBeUndefined();expect(payload.availability).toBe("unavailable");await axe(page,"#benefit-dialog");
});
test("store design statuses never inherit legacy; all twelve images and campaign switch work",async({page},info)=>{
  await page.setViewportSize({width:390,height:844});await page.goto("/?store=kura-664");
  const chi=page.locator(`#store-benefits [data-benefit-design="${ids[0]}"]`),hachi=page.locator(`#store-benefits [data-benefit-design="${ids[1]}"]`);
  await expect(chi).toContainText("直近の報告が分かれています");await expect(hachi).not.toContainText("報告が分かれています");
  await expect(page.locator(`#store-benefits [data-benefit-design="${ids[2]}"]`)).toContainText("まだ報告がありません");
  await expect(page.locator(`#store-benefits [data-benefit-design="${ids[3]}"]`)).toContainText("古い情報です");
  await page.locator(".benefit-legacy-status > summary").click();await expect(page.locator(".benefit-legacy-status")).toContainText("配布終了 9件");
  for(const b of benefits){await page.locator("#store-benefit-select").selectOption(b.id);for(const i of b.items){const img=page.locator(`#store-benefits [data-benefit-design="${i.id}"] img`);await img.scrollIntoViewIfNeeded();await expect(img).toHaveAttribute("src",i.imageAsset);await expect(img).toHaveAttribute("alt",`${b.name} ${i.name}`);await expect.poll(()=>img.evaluate(e=>e.naturalWidth)).toBe(512);}}
  await page.screenshot({path:info.outputPath("benefit-store-items-mobile.png")});await axe(page,"#store-dialog");
});
test("my batch shows design names and withdraws whole report, keyboard and accessible",async({page})=>{
  let withdrawn=false;await page.route("**/api/me/reports?*",r=>r.fulfill({json:{items:[]}}));
  await page.route("**/api/me/benefit-reports?*",r=>r.fulfill({json:{items:[{id:"batch",storeName:"新宿靖国通り店",benefitName:selected.name,observedAt:latest.observedAt,status:withdrawn?"withdrawn":"active",items:selected.items.slice(0,2).map(i=>({...i,availability:"unavailable",observationType:"store_notice"}))}]}}));
  await page.route("**/api/me/benefit-reports/batch/withdraw",r=>{withdrawn=true;return r.fulfill({json:{id:"batch",status:"withdrawn"}});});
  await page.goto("/");await page.getByRole("button",{name:"Googleでログイン"}).click();await page.getByRole("button",{name:"自分の投稿",exact:true}).click();
  await expect(page.locator("#my-benefits-body")).toContainText("ちいかわ");await expect(page.locator("#my-benefits-body")).toContainText("ハチワレ");await expect(page.locator("#my-benefits-body")).toContainText("全絵柄が対象");
  page.once("dialog",async d=>{expect(d.message()).toContain("全絵柄");await d.accept();});await page.getByRole("button",{name:"特典報告を取り下げる"}).focus();await page.keyboard.press("Enter");await expect(page.locator("#my-benefits-body")).toContainText("取り下げ済み");await axe(page,"#my-reports-dialog");
});
