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
function emptyStoreResponse(url){
  const b=benefits.find(b=>b.id===new URL(url).searchParams.get("benefit"))??selected;
  const empty={latest:null,last24h:{available:0,unavailable:0,unknown:0},conflicting:false};
  return {benefits,selected:b,items:[{...b,...empty,items:b.items.map(i=>({...i,...empty}))}]};
}

test("selected store with no reports shows every design as unconfirmed; mobile, keyboard and posting remain usable",async({page},info)=>{
  await page.setViewportSize({width:390,height:844});
  await page.route("**/api/stores/kura-77/benefits?*",r=>r.fulfill({json:emptyStoreResponse(r.request().url())}));
  await page.goto("/");await page.locator("#benefits-tab").click();
  await expect(page.locator("#benefit-post-start")).toBeDisabled();
  await page.getByLabel("状況を見る・投稿する店舗").selectOption("kura-77");
  const panel=page.locator("#benefit-selected-store-status");
  await expect(panel.getByRole("heading",{name:"川越店の先着特典"})).toBeVisible();
  await expect(panel.locator(".benefit-item-card")).toHaveCount(4);
  for(const i of selected.items){
    const card=panel.locator(`[data-benefit-design="${i.id}"]`);
    await expect(card).toContainText("報告なし");await expect(card).toContainText("在庫状況は未確認です");
    await expect(card).not.toContainText("最新報告：");await expect(card.locator("img")).toHaveAttribute("src",i.imageAsset);
  }
  await expect(page.locator("#benefit-overview-list")).toBeHidden();
  await expect(page.locator("#benefit-selected-designs")).toBeHidden();
  await panel.scrollIntoViewIfNeeded();
  await panel.locator("img").evaluateAll(async imgs=>{await Promise.all(imgs.map(i=>i.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  await page.screenshot({path:info.outputPath("selected-store-no-reports-mobile.png")});await axe(page,"#benefits-view");
  await page.setViewportSize({width:320,height:740});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.locator("#benefit-post-start").focus();await page.keyboard.press("Enter");
  await expect(page.locator("#benefit-dialog")).toBeVisible();await expect(page.locator("#benefit-dialog")).toContainText("川越店");
  await expect(page.locator("#benefit-item-picker img")).toHaveCount(4);
  await page.keyboard.press("Escape");await expect(page.locator("#benefit-post-start")).toBeFocused();
  await page.locator("#benefit-post-store").selectOption("");
  await expect(panel).toBeHidden();await expect(page.locator("#benefit-overview-list")).toBeVisible();await expect(page.locator("#benefit-post-start")).toBeDisabled();
});

test("selected-store statuses follow design and benefit filters, keep legacy separate, and refresh after posting",async({page})=>{
  await page.goto("/");await page.locator("#benefits-tab").click();await page.locator("#benefit-post-store").selectOption("kura-664");
  const panel=page.locator("#benefit-selected-store-status");
  await expect(panel).toContainText("新宿靖国通り店の先着特典");
  await expect(panel.locator(`[data-benefit-design="${ids[0]}"]`)).toContainText("直近の報告が分かれています");
  await expect(panel.locator(`[data-benefit-design="${ids[1]}"]`)).toContainText("最新報告：配布終了");
  await expect(panel.locator(`[data-benefit-design="${ids[2]}"]`)).toContainText("報告なし");
  await expect(panel.locator(`[data-benefit-design="${ids[3]}"]`)).toContainText("古い情報です");
  await page.locator("#benefit-item-select").selectOption(ids[1]);
  await expect(panel.locator(".benefit-item-card")).toHaveCount(1);await expect(panel.locator(".benefit-item-card")).toContainText("ハチワレ");
  await page.locator("#benefit-item-select").selectOption("legacy");
  await expect(panel.locator(".benefit-item-card")).toHaveCount(0);await expect(panel.locator(".benefit-legacy-status")).toHaveAttribute("open","");
  await expect(panel).toContainText("配布終了 9件");
  await page.locator("#benefit-item-select").selectOption("");
  await page.locator("#benefit-select").selectOption(benefits[2].id);
  await expect(page.locator("#benefit-post-store")).toHaveValue("kura-664");
  await expect(panel.locator(`[data-benefit-design="${benefits[2].items[0].id}"]`)).toBeVisible();await expect(panel).toContainText("から開始予定です");
  await page.locator("#benefit-select").selectOption(selected.id);
  await expect(panel.locator(`[data-benefit-design="${ids[0]}"]`)).toContainText("直近の報告が分かれています");
  await page.route("**/api/stores/kura-664/benefits?*",r=>r.fulfill({json:emptyStoreResponse(r.request().url())}));
  await page.evaluate(()=>document.dispatchEvent(new Event("benefit-updated")));
  await expect(panel.locator(`[data-benefit-design="${ids[0]}"]`)).toContainText("報告なし");
  await expect(page.locator("#benefit-post-store")).toHaveValue("kura-664");
  await page.locator("#benefit-search-submit").click();await expect(panel).toBeHidden();await expect(page.locator("#benefit-post-store")).toHaveValue("");
});

test("stale store responses cannot replace current selection; failure is distinct from no reports and can retry",async({page})=>{
  let release,failed=true;
  await page.route("**/api/stores/kura-77/benefits?*",async r=>{await new Promise(resolve=>release=resolve);await r.fulfill({json:emptyStoreResponse(r.request().url())});});
  await page.goto("/");await page.locator("#benefits-tab").click();
  const pending=page.waitForRequest(r=>r.url().includes("/api/stores/kura-77/benefits"));
  await page.locator("#benefit-post-store").selectOption("kura-77");await pending;
  const panel=page.locator("#benefit-selected-store-status");await expect(panel).toHaveAttribute("aria-busy","true");
  await page.locator("#benefit-post-store").selectOption("kura-664");
  await expect(panel).toContainText("直近の報告が分かれています");
  const finished=page.waitForResponse(r=>r.url().includes("/api/stores/kura-77/benefits"));release();await finished;
  await expect(panel).not.toContainText("川越店");await expect(panel).toContainText("新宿靖国通り店");
  await page.route("**/api/stores/kura-77/benefits?*",r=>r.fulfill({json:failed?{items:[]}:emptyStoreResponse(r.request().url())}));
  await page.locator("#benefit-post-store").selectOption("kura-77");
  await expect(panel.getByRole("alert")).toContainText("報告の有無はまだ確認できていません");
  await expect(panel.locator(".benefit-empty")).toHaveCount(0);await expect(panel).toHaveAttribute("aria-busy","false");
  failed=false;await panel.getByRole("button",{name:"状況を再読み込み"}).focus();await page.keyboard.press("Enter");
  await expect(panel.locator(".benefit-item-card")).toHaveCount(4);await expect(panel).toContainText("在庫状況は未確認です");await expect(panel.getByRole("alert")).toHaveCount(0);
});

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
