import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sqliteFixture, addReport, campaignId, storeId } from "../helpers/sqlite.mjs";
import { validateBenefit, benefitFingerprint } from "../../lib/benefits.js";
import { onRequestGet as latestGet } from "../../functions/api/benefits/latest.js";
import { onRequestGet as storeGet } from "../../functions/api/stores/[id]/benefits.js";
import { onRequestPost as postBenefit } from "../../functions/api/benefit-reports.js";
import { withdrawBenefitReport } from "../../functions/api/me/benefit-reports/[id]/withdraw.js";
import { onRequestGet as goodsGet } from "../../functions/api/stats/items.js";
import { onRequestGet as statsGet } from "../../functions/api/stats.js";
import { onRequestGet as rankingGet } from "../../functions/api/rankings/figure.js";

const master=JSON.parse(readFileSync(new URL("../../data/benefit-items.json",import.meta.url)));
const benefitId="chiikawa-2026-benefit-2", ids=master.filter((i)=>i.benefitId===benefitId).map((i)=>i.id);
const get=async(handler,db,query="")=>{const r=await handler({env:{DB:db},params:{id:storeId},request:new Request(`https://example.test/api?campaign=${campaignId}&${query}`)});assert.equal(r.status,200,await r.clone().text());return r.json();};
function addBenefit(f,id,items,{hours=1,status="active",store=storeId,user=null,legacy=null}={}) {
  const date=new Date(Date.now()-hours*3600000).toISOString();
  f.sqlite.prepare("INSERT INTO benefit_reports(id,store_id,benefit_id,observed_at,availability,status,user_id,created_at) VALUES(?,?,?,?,?,?,?,?)").run(id,store,benefitId,date,legacy??"unknown",status,user,date);
  for(const [item,availability] of items)f.sqlite.prepare("INSERT INTO benefit_report_items(report_id,benefit_id,benefit_item_id,availability,observation_type) VALUES(?,?,?,?,?)").run(id,benefitId,item,availability,availability==="available"?"received":"store_notice");
}

test("個別特典12種は明示マッピング・同じ弾・名前・512px PNG",()=>{
  const expected=[
    [1,"bonus_pouch",["chiikawa","hachiware","usagi","momonga"],["ちいかわ","ハチワレ","うさぎ","モモンガ"]],
    [2,"bonus_yunomi",["chiikawa","hachiware","usagi","minna"],["ちいかわ","ハチワレ","うさぎ","みんな"]],
    [3,"bonus_plate",["chiikawa","hachiware","usagi","minna"],["ちいかわ","ハチワレ","うさぎ","みんな"]],
  ];
  assert.equal(master.length,12);assert.equal(new Set(master.map((i)=>i.id)).size,12);
  for(const [n,folder,slugs,names] of expected)slugs.forEach((slug,j)=>{
    const id=`chiikawa-2026-benefit-${n}-${slug}`,i=master.find((i)=>i.id===id);
    assert.equal(i.benefitId,`chiikawa-2026-benefit-${n}`);assert.equal(i.name,names[j]);assert.equal(i.slug,slug);
    assert.equal(i.imageAsset,`/public/bonuses/${folder}/${slug}.png`);
    const png=readFileSync(new URL(`../../${i.imageAsset.slice(1)}`,import.meta.url));
    assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a");assert.equal(png.readUInt32BE(16),512);assert.equal(png.readUInt32BE(20),512);
  });
});
test("0012追加migrationは既存投稿・景品・特典報告を無損失で保持しbackfillしない",()=>{
  const f=sqliteFixture({beforeBenefitItems:true});try{
    addReport(f.sqlite);addBenefit(f,"legacy",[],{legacy:"available"});
    const tables=["reports","report_prizes","report_total_items","benefit_reports","prize_items"];
    const before=tables.map(t=>f.sqlite.prepare(`SELECT * FROM ${t}`).all());
    const sql=readFileSync(new URL("../../migrations/0012_benefit_items.sql",import.meta.url),"utf8");
    assert.doesNotMatch(sql,/DROP\s|DELETE\s|UPDATE\s+(?:reports|benefit_reports)/i);f.sqlite.exec(sql);
    const after=tables.map(t=>f.sqlite.prepare(`SELECT * FROM ${t}`).all());after[3].forEach(r=>delete r.risk_reasons);assert.deepEqual(after,before);
    assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM benefit_report_items").get().n,0);
    assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM public_benefit_observations WHERE benefit_item_id IS NULL").get().n,1);
    assert.equal(f.sqlite.prepare("SELECT SUM(quantity) n FROM active_draw_prizes").get().n,5);
  }finally{f.close();}
});
test("複合FK・UNIQUE・状態/個数制約で異なる弾や絵柄重複・矛盾した受取個数を拒否",()=>{
  const f=sqliteFixture();try{
    addBenefit(f,"parent",[[ids[0],"available"]]);
    const insert=f.sqlite.prepare("INSERT INTO benefit_report_items(report_id,benefit_id,benefit_item_id,availability,observation_type,received_quantity) VALUES('parent',?,?,?,?,?)");
    assert.throws(()=>insert.run(benefitId,ids[0],"available","received",1),/UNIQUE/);
    assert.throws(()=>insert.run(benefitId,master[0].id,"available","received",1),/FOREIGN KEY/);
    assert.throws(()=>insert.run(master[0].benefitId,master[0].id,"available","received",1),/FOREIGN KEY/);
    for(const row of [["unavailable","received",null],["available","observed",1],["available","received",0],["available","received",301]])assert.throws(()=>insert.run(benefitId,ids[1],...row),/CHECK/);
  }finally{f.close();}
});
test("複数柄の検証：未選択・異なる弾・重複・不正値を拒否、旧payloadも維持",async()=>{
  const now=new Date(),benefit={id:benefitId,startsOn:"2000-01-01",endsOn:"2999-01-01",items:master.filter(i=>i.benefitId===benefitId)};
  const p={benefitId,storeId,observedAt:now.toISOString(),items:[{benefitItemId:ids[0],availability:"available",observationType:"received",receivedQuantity:2},{benefitItemId:ids[1],availability:"unavailable",observationType:"store_notice",receivedQuantity:null}]};
  assert.deepEqual(validateBenefit(p,benefit,now),[]);
  for(const items of [[],null,[null],[{...p.items[0],benefitItemId:master[0].id}],[p.items[0],p.items[0]],[{...p.items[0],observationType:"observed"}],[{...p.items[1],receivedQuantity:1}]])assert.ok(validateBenefit({...p,items},benefit,now).length);
  assert.ok(validateBenefit({...p,availability:"available"},benefit,now).length);
  const legacy={benefitId,observedAt:now.toISOString(),availability:"available"};assert.deepEqual(validateBenefit(legacy,benefit,now),[]);
  assert.equal(await benefitFingerprint("actor",p),await benefitFingerprint("actor",{...p,items:[...p.items].reverse()}));
  assert.notEqual(await benefitFingerprint("actor",p),await benefitFingerprint("actor",{...p,items:[p.items[0]]}));
});
test("同一店舗の別絵柄を混ぜず矛盾判定、24h/48h/古い情報、過去全体報告を分離",async()=>{
  const f=sqliteFixture();try{
    addBenefit(f,"a",[[ids[0],"available"],[ids[1],"unavailable"]]);
    addBenefit(f,"b",[[ids[0],"unavailable"]],{hours:0.5});
    addBenefit(f,"48h",[[ids[2],"available"]],{hours:30});
    addBenefit(f,"stale",[[ids[3],"unavailable"]],{hours:60});
    addBenefit(f,"legacy",[],{legacy:"unavailable",hours:0.1});
    for(const status of ["hidden","pending"])addBenefit(f,status,[[ids[1],"available"]],{status,hours:0});
    const data=await get(storeGet,f.db,`benefit=${benefitId}`),b=data.items[0];
    assert.equal(b.latest.availability,"unavailable");assert.equal(b.conflicting,false);
    assert.equal(b.items[0].conflicting,true);assert.deepEqual(b.items[0].last24h,{available:1,unavailable:1,unknown:0});
    assert.equal(b.items[1].conflicting,false);assert.equal(b.items[1].last24h.available,0);
    assert.equal(b.items[2].latest.freshness,"48h");assert.equal(b.items[3].latest.freshness,"stale");
    const summary=await get(latestGet,f.db,`benefit=${benefitId}&summary=1`);assert.equal(summary.items.length,0);
    assert.deepEqual(summary.itemSummary.map(i=>i.unavailableStoreCount),[1,1,0,0]);assert.equal(summary.itemSummary[0].conflictingStoreCount,1);
    const filtered=await get(latestGet,f.db,`benefit=${benefitId}&item=${ids[1]}&unavailable=1&prefecture=東京都&q=新宿`);
    assert.equal(filtered.items.length,1);assert.equal(filtered.items[0].benefitItem.id,ids[1]);assert.equal(filtered.items[0].conflicting,false);
    assert.equal((await get(latestGet,f.db,`benefit=${benefitId}&item=legacy`)).items.length,1);
    assert.doesNotMatch(JSON.stringify(data),/risk_reasons|abuse_hash|user_id|daily_rate_hash/);
    const bad=await latestGet({env:{DB:f.db},request:new Request(`https://example.test/api?benefit=${benefitId}&item=${master[0].id}`)});assert.equal(bad.status,400);
  }finally{f.close();}
});
test("取り下げは本人の親報告単位で全柄を即除外、原本保持・重複なし・復旧可能",async()=>{
  const f=sqliteFixture();try{
    f.sqlite.exec("INSERT INTO users(id,status,created_at,last_seen_at) VALUES('owner','active','2026-09-04','2026-09-04')");
    addBenefit(f,"batch",[[ids[0],"available"],[ids[1],"unavailable"]],{user:"owner"});
    assert.equal((await withdrawBenefitReport({DB:f.db},"batch","other")).status,404);
    for(let n=0;n<2;n++)assert.equal((await withdrawBenefitReport({DB:f.db},"batch","owner")).status,200);
    assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM benefit_withdrawals").get().n,1);
    assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM benefit_report_items").get().n,2);
    assert.equal((await get(latestGet,f.db,`benefit=${benefitId}`)).items.length,0);
    assert((await get(storeGet,f.db,`benefit=${benefitId}`)).items[0].items.every(i=>i.latest===null));
    assert((await get(latestGet,f.db,`benefit=${benefitId}&summary=1`)).itemSummary.every(i=>i.unavailableStoreCount===0));
    f.sqlite.exec("DELETE FROM benefit_withdrawals WHERE report_id='batch'");
    assert.equal((await get(latestGet,f.db,`benefit=${benefitId}`)).items.length,2);
  }finally{f.close();}
});
test("特典100報告400明細を追加しても通常グッズ・全国統計・ランキング不変",async()=>{
  const f=sqliteFixture();try{
    addReport(f.sqlite);const handlers=[goodsGet,statsGet,rankingGet],before=await Promise.all(handlers.map(h=>get(h,f.db)));
    for(let n=0;n<100;n++)addBenefit(f,`bonus${n}`,ids.map(id=>[id,"available"]));
    const after=await Promise.all(handlers.map(h=>get(h,f.db)));assert.deepEqual(after,before);
  }finally{f.close();}
});
test("実POSTは4柄で1投稿枠、重複拒否・不正時の部分保存なし・変化許容・反転連投risk",async(t)=>{
  const f=sqliteFixture();t.after(()=>f.close());const native=globalThis.fetch;t.after(()=>globalThis.fetch=native);
  globalThis.fetch=async()=>Response.json({success:true,action:"benefit_submit"});
  f.sqlite.exec("UPDATE campaigns SET ends_on='2999-01-01'; UPDATE benefit_campaigns SET starts_on='2000-01-01',ends_on='2999-01-01'");
  const env={DB:f.db,TURNSTILE_SECRET_KEY:"test",RATE_LIMIT_SALT:"test-salt"};
  const p={storeId,benefitId,observedAt:new Date().toISOString(),turnstileToken:"token",items:ids.map(id=>({benefitItemId:id,availability:"available",observationType:"received",receivedQuantity:null}))};
  const post=payload=>postBenefit({env,request:new Request("https://example.test/api/benefit-reports",{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://example.test"},body:JSON.stringify(payload)})});
  const first=await post(p);assert.equal(first.status,201,await first.clone().text());assert.equal((await first.json()).status,"active");
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM benefit_submission_slots").get().n,1);assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM benefit_report_items").get().n,4);
  assert.equal((await post(p)).status,409);assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM benefit_reports").get().n,1);
  assert.equal((await post({...p,items:[...p.items,{...p.items[0],benefitItemId:"invalid"}]})).status,400);assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM benefit_reports").get().n,1);
  const ended={...p,items:[{...p.items[0],availability:"unavailable",observationType:"store_notice"}]};
  assert.equal((await (await post(ended)).json()).status,"active");
  f.sqlite.exec("UPDATE benefit_fingerprints SET expires_at=0");
  assert.equal((await (await post({...p,items:[p.items[0]]})).json()).status,"active");
  const risky=await post(ended);assert.equal(risky.status,201);assert.equal((await risky.json()).status,"pending");
  assert.match(f.sqlite.prepare("SELECT risk_reasons FROM benefit_reports WHERE status='pending'").get().risk_reasons,/repeated_item_reversal/);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM reports").get().n,0);
});
