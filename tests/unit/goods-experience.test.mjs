import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sqliteFixture, addReport, campaignId, storeId, categoryId } from "../helpers/sqlite.mjs";
import { changeItemCount, normalizeGoodsPayload } from "../../lib/goods.js";
import { validateReportPayload } from "../../lib/validation.js";
import { safeImageAsset, goodsMarkup, goodsConfirmationMarkup, PLACEHOLDER_IMAGE } from "../../lib/goods-ui.js";
import { assessReportRisk } from "../../lib/risk.js";
import { currentBenefit, conflictingBenefits, validateBenefit } from "../../lib/benefits.js";
import { handleReportPost } from "../../functions/_lib/report-submission.js";
import { onRequestGet as itemsGet } from "../../functions/api/stats/items.js";
import { onRequestGet as latestGet } from "../../functions/api/benefits/latest.js";
import { onRequestGet as storeBenefitsGet } from "../../functions/api/stores/[id]/benefits.js";
import { onRequestPost as withdrawalPost, withdrawBenefitReport } from "../../functions/api/me/benefit-reports/[id]/withdraw.js";
import { onRequestGet as rankingGet } from "../../functions/api/rankings/figure.js";
import { readSpendStats } from "../../functions/_lib/period-stats.js";
import { resolvePeriod } from "../../lib/periods.js";

const campaign=JSON.parse(readFileSync(new URL("../../data/campaigns.json",import.meta.url)))[0];
const chiikawa="chiikawa-2026-figure-chiikawa",usagi="chiikawa-2026-figure-usagi";
const context={campaign,storeIds:new Set([storeId]),prizeCategoryIds:new Set(campaign.prizeCategories.map((c)=>c.id)),prizeItems:new Map(campaign.prizeItems.map((i)=>[i.id,i])),today:"2026-09-04"};
const payload={goodsInput:true,storeId,campaignId,visitDate:"2026-09-04",goodsItems:[{prizeItemId:chiikawa,quantity:1,guaranteedQuantity:0},{prizeItemId:usagi,quantity:2,guaranteedQuantity:1}],guaranteedKnown:true,goodsUnknown:[],spendAmountYen:null};
const get=async(handler,db,query="")=>{const r=await handler({request:new Request(`https://example.test/api?campaign=${campaignId}&${query}`),env:{DB:db},params:{id:storeId}});assert.equal(r.status,200,await r.clone().text());return r.json();};

test("カード加減算は0〜300、合計・カテゴリ・確定分を自動計算し二重入力不要",()=>{
  assert.equal(changeItemCount(0,-1),0);assert.equal(changeItemCount(300,1),300);assert.equal(changeItemCount(1,1),2);
  const n=normalizeGoodsPayload(payload,context);assert.deepEqual(n.totals,{total:3,guaranteed:1,draw:2});
  assert.equal(n.report.prizes.find((p)=>p.prizeCategoryId===categoryId).quantity,3);
  assert.deepEqual(validateReportPayload(payload,context),[]);
  assert.equal(normalizeGoodsPayload({...payload,guaranteedKnown:false},context).totals.draw,null);
  assert.deepEqual(validateReportPayload({...payload,goodsItems:[],guaranteedKnown:false},context),[]);
  for(const bad of [{quantity:-1},{quantity:301},{quantity:1.2},{quantity:1,guaranteedQuantity:2},{prizeItemId:"foreign"}])assert.ok(validateReportPayload({...payload,goodsItems:[{...payload.goodsItems[0],...bad}]},context).length);
  assert.ok(validateReportPayload({...payload,goodsItems:[payload.goodsItems[0],payload.goodsItems[0]]},context).length);
});
test("デザイン不明を保ち、任意金額・抽選詳細の整合性を検証する",()=>{
  const p={...payload,goodsUnknown:[{prizeCategoryId:categoryId,quantity:2,guaranteedQuantity:0}],goodsUncategorized:1};
  assert.equal(normalizeGoodsPayload(p,context).totals.total,6);assert.equal(normalizeGoodsPayload(p,context).report.itemBreakdowns[0].status,"partial");
  assert.deepEqual(validateReportPayload(p,context),[]);
  const details={usageType:"plus",panelDraws:10,panelWins:2,mobileDraws:0,mobileWins:0};
  assert.deepEqual(validateReportPayload({...payload,spendAmountYen:5200,drawDetails:details},context),[]);
  assert.ok(validateReportPayload({...payload,guaranteedKnown:false,drawDetails:details},context).length);
  assert.ok(validateReportPayload({...payload,drawDetails:{...details,panelWins:4}},context).length);
  assert.ok(validateReportPayload({...payload,spendAmountYen:0},context).length);
});
test("画像参照と確認表示は安全なマスター参照、0個・個人情報を表示しない",()=>{
  assert.equal(safeImageAsset(null),PLACEHOLDER_IMAGE);assert.equal(safeImageAsset("javascript:alert(1)"),PLACEHOLDER_IMAGE);
  assert.equal(safeImageAsset("/public/goods/one.webp"),"/public/goods/one.webp");
  const html=goodsConfirmationMarkup({...payload,email:"private@example.test"},campaign);
  assert.match(html,/ちいかわ/);assert.match(html,/×2/);assert.doesNotMatch(html,/private@example|ハチワレ/);
  assert.match(html,/width="160" height="120"/);
});
test("0011は既存投稿・景品を変えない追加型migration",()=>{
  const f=sqliteFixture({beforeGoods:true});try{
    addReport(f.sqlite);const before=f.sqlite.prepare("SELECT * FROM reports").get();
    const sql=readFileSync(new URL("../../migrations/0011_goods_experience.sql",import.meta.url),"utf8");
    assert.doesNotMatch(sql,/DROP\s+(TABLE|COLUMN)|DELETE\s+FROM\s+(reports|report_prizes)/i);f.sqlite.exec(sql);
    const after=f.sqlite.prepare("SELECT * FROM reports").get();delete after.goods_input;assert.deepEqual(after,before);
    assert.equal(f.sqlite.prepare("SELECT SUM(quantity) n FROM active_draw_prizes").get().n,5);
    assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM benefit_withdrawals").get().n,0);
  }finally{f.close();}
});
test("実POSTで金額なしカード入力と抽選詳細を保存、確定分・外部・特典を抽選へ混ぜない",async(t)=>{
  const f=sqliteFixture();t.after(()=>f.close());const native=globalThis.fetch;t.after(()=>globalThis.fetch=native);
  globalThis.fetch=async()=>Response.json({success:true,action:"report_submit"});
  const day=new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Tokyo"});f.sqlite.exec("UPDATE campaigns SET ends_on='2999-12-31'");
  const env={DB:f.db,TURNSTILE_SECRET_KEY:"test",RATE_LIMIT_SALT:"test-salt"};
  const post=async(p)=>{const r=await handleReportPost({env,request:new Request("https://example.test/api/reports",{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://example.test"},body:JSON.stringify({...p,visitDate:day,turnstileToken:"token"})})});assert.equal(r.status,201,await r.clone().text());return (await r.json()).id;};
  const id=await post(payload);
  const row=f.sqlite.prepare("SELECT * FROM reports WHERE id=?").get(id);assert.equal(row.goods_input,1);assert.equal(row.result_input_mode,"simple");assert.equal(row.spend_amount_yen,null);assert.equal(row.reported_prize_count,3);assert.equal(row.panel_wins,0);
  assert.equal(f.sqlite.prepare("SELECT SUM(quantity) n FROM report_goods_guaranteed_items").get().n,1);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM active_draw_prize_reports").get().n,0);
  await post({...payload,spendAmountYen:5200,drawDetails:{usageType:"plus",panelDraws:10,panelWins:2,mobileDraws:0,mobileWins:0}});
  assert.equal(f.sqlite.prepare("SELECT SUM(total_panel_draws) n FROM store_campaign_usage_stats").get().n,10);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM active_draw_prize_reports").get().n,0);
  assert.equal((await readSpendStats(f.db,campaignId,resolvePeriod(campaignId))).metrics.spend.median,5200);
  assert.equal((await get(itemsGet,f.db)).totalPrizes,6);assert.equal((await get(rankingGet,f.db)).items.length,0);
  f.sqlite.prepare("INSERT INTO report_withdrawals(report_id,withdrawn_at) VALUES(?,?)").run(id,new Date().toISOString());
  assert.equal((await get(itemsGet,f.db)).totalPrizes,3);
});
test("全国・店舗・都道府県・期間のグッズ数と完全内訳割合、pending/hidden/withdrawn・外部を除外",async()=>{
  const f=sqliteFixture();try{
    for(let i=0;i<3;i++){addReport(f.sqlite,{id:`r${i}`,visitDate:"2026-09-04",prizes:5});f.sqlite.prepare("INSERT INTO report_prize_item_breakdowns VALUES(?,?,'complete')").run(`r${i}`,categoryId);f.sqlite.prepare("INSERT INTO report_prize_items VALUES(?,?,?,5)").run(`r${i}`,categoryId,chiikawa);}
    addReport(f.sqlite,{id:"partial",simple:true,prizes:7});addReport(f.sqlite,{id:"hidden",prizes:9,status:"hidden"});addReport(f.sqlite,{id:"pending",prizes:9,status:"pending"});
    const p2=await get(itemsGet,f.db,`period=period2&store=${storeId}`);assert.equal(p2.totalPrizes,15);assert.equal(p2.categories[0].items[0].share,1);
    assert.equal((await get(itemsGet,f.db,"prefecture=東京都")).totalPrizes,22);assert.equal((await get(itemsGet,f.db,"prefecture=大阪府")).totalPrizes,0);
    assert.equal((await get(itemsGet,f.db,"period=period1")).categories[0].unknownDesignQuantity,7);
    const before=await get(itemsGet,f.db);
    for(let i=0;i<100;i++)f.sqlite.prepare("INSERT INTO external_reports(id,store_id,campaign_id,external_platform,external_observed_at,evidence_quality,result_precision,total_prizes,total_prizes_kind) VALUES(?,?,?,'x','2026-09-04','B','partial',200,'exact')").run(`ext${i}`,storeId,campaignId);
    assert.deepEqual(await get(itemsGet,f.db),before);
    f.sqlite.exec("INSERT INTO report_withdrawals(report_id,withdrawn_at) VALUES('r0','2026-09-04')");
    const after=await get(itemsGet,f.db);assert.equal(after.totalPrizes,17);assert.equal(after.categories[0].items[0].share,null);
    assert.match(goodsMarkup(after),/デザイン未確認 7個/);
  }finally{f.close();}
});
test("特典の現在弾、食い違い、本人取り下げは全公開APIから即除外、原本・投稿枠保持",async()=>{
  const f=sqliteFixture();try{
    const now=new Date(),date=now.toISOString();f.sqlite.exec("INSERT INTO users(id,status,created_at,last_seen_at) VALUES('owner','active','2026-09-04','2026-09-04')");
    for(const [id,state,status,user] of [["a","available","active",null],["b","unavailable","active","owner"],["hidden","available","hidden",null],["pending","available","pending",null]])f.sqlite.prepare("INSERT INTO benefit_reports(id,store_id,benefit_id,observed_at,availability,status,user_id,created_at) VALUES(?,?,'chiikawa-2026-benefit-2',?,?,?,?,?)").run(id,storeId,date,state,status,user,date);
    f.sqlite.exec("INSERT INTO benefit_fingerprints VALUES('finger','b',9999999999); INSERT INTO benefit_submission_slots VALUES('actor','2026-09-04',1,'b','2026-09-04')");
    let data=await get(latestGet,f.db,"benefit=chiikawa-2026-benefit-2&unavailable=1");assert.equal(data.items.length,1);assert.equal(data.items[0].conflicting,true);assert.equal(data.items[0].last24h.available,1);
    assert.equal((await withdrawBenefitReport({DB:f.db},"b","other")).status,404);
    assert.equal((await withdrawalPost({request:new Request("https://example.test/api",{method:"POST",headers:{Origin:"https://example.test"}}),env:{DB:f.db},params:{id:"b"}})).status,401);
    assert.equal((await withdrawBenefitReport({DB:f.db},"b","owner")).status,200);assert.equal((await withdrawBenefitReport({DB:f.db},"b","owner")).status,200);
    assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM benefit_withdrawals").get().n,1);assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM benefit_reports").get().n,4);assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM benefit_submission_slots").get().n,1);assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM benefit_fingerprints").get().n,0);
    assert.equal((await get(latestGet,f.db,"benefit=chiikawa-2026-benefit-2&unavailable=1")).items.length,0);
    const store=(await get(storeBenefitsGet,f.db)).items.find((i)=>i.id.endsWith("-2"));assert.equal(store.latest.availability,"available");assert.equal(store.conflicting,false);
    const masters=[{id:1,startsOn:"2026-08-21"},{id:2,startsOn:"2026-09-04"},{id:3,startsOn:"2026-09-18"}];assert.equal(currentBenefit(masters,"2026-09-04").id,2);assert.equal(currentBenefit(masters,"2026-09-18").id,3);assert.equal(conflictingBenefits({available:1,unavailable:0}),false);
  }finally{f.close();}
});
test("金額riskは単一要因でreject/pendingにせず、繰り返しと複数要因を加点",()=>{
  const p={resultInputMode:"simple",spendAmountYen:150000,reportedPrizeCount:1,reportedTotalDraws:0};
  assert.equal(assessReportRisk(p).status,"active");assert.ok(assessReportRisk(p).reasons.includes("very_large_spend"));
  assert.equal(assessReportRisk({...p,spendAmountYen:100,reportedPrizeCount:100}).status,"active");
  assert.equal(assessReportRisk(p,{recentExtremeSpendCount:2,sameStoreRecentCount:4}).status,"pending");
});

test("先着特典の受取個数は任意、受け取れた状態以外や不正個数を拒否",()=>{
  const now=new Date("2026-09-04T05:00:00Z"),benefit={id:"test-benefit",startsOn:"2026-09-04",endsOn:"2026-09-17"};
  const p={storeId,benefitId:benefit.id,observedAt:now.toISOString(),availability:"available",receivedQuantity:2};
  assert.deepEqual(validateBenefit(p,benefit,now),[]);
  assert.deepEqual(validateBenefit({...p,receivedQuantity:null},benefit,now),[]);
  for(const receivedQuantity of [-1,0,301,1.2])assert.ok(validateBenefit({...p,receivedQuantity},benefit,now).length);
  assert.ok(validateBenefit({...p,availability:"unavailable"},benefit,now).length);
});
