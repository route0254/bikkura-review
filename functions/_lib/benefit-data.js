import { benefitFreshness, conflictingBenefits } from "../../lib/benefits.js";

export async function readBenefitMasters(db, campaignId) {
  const [benefits, items] = await Promise.all([
    db.prepare("SELECT id,name,starts_on,ends_on,conditions,source_url,image_asset FROM benefit_campaigns WHERE campaign_id=? AND active=1 ORDER BY starts_on,id LIMIT 20").bind(campaignId).all(),
    db.prepare(`SELECT i.* FROM benefit_items i JOIN benefit_campaigns b ON b.id=i.benefit_id
      WHERE b.campaign_id=? AND b.active=1 AND i.active=1 ORDER BY i.sort_order,i.id LIMIT 240`).bind(campaignId).all(),
  ]);
  return benefits.results.map((b)=>({id:b.id,name:b.name,startsOn:b.starts_on,endsOn:b.ends_on,conditions:b.conditions,sourceUrl:b.source_url,imageAsset:b.image_asset,
    items:items.results.filter((i)=>i.benefit_id===b.id).map((i)=>({id:i.id,benefitId:i.benefit_id,slug:i.slug,name:i.name,imageAsset:i.image_asset,sortOrder:i.sort_order})),
  }));
}

function scope(benefitId, {now, store, item, prefecture, q}) {
  return {
    sql: `SELECT r.*,s.name AS store_name,s.prefecture FROM public_benefit_observations r JOIN stores s ON s.id=r.store_id AND s.active=1
      WHERE r.benefit_id=? AND r.observed_at<=?${store?" AND r.store_id=?":""}${item==="legacy"?" AND r.benefit_item_id IS NULL":item?" AND r.benefit_item_id=?":""}${prefecture?" AND s.prefecture=?":""}${q?" AND s.name LIKE ?":""}`,
    bindings:[benefitId,now.toISOString(),...(store?[store]:[]),...(item&&item!=="legacy"?[item]:[]),...(prefecture?[prefecture]:[]),...(q?[`%${q}%`]:[])],
  };
}

export function mapBenefitStatus(row, now) {
  const last24h={available:Number(row?.available_count??0),unavailable:Number(row?.unavailable_count??0),unknown:Number(row?.unknown_count??0)};
  return {latest:row?{availability:row.availability,observationType:row.observation_type??null,receivedQuantity:row.received_quantity??null,observedAt:row.observed_at,freshness:benefitFreshness(row.observed_at,now)}:null,
    last24h,conflicting:conflictingBenefits(last24h)};
}

export async function readBenefitRows(db, benefitId, options) {
  const {now,limit=60,offset=0,unavailableOnly=false}=options;
  const scoped=scope(benefitId,options), cutoff=new Date(now.getTime()-86400000).toISOString();
  const rows=await db.prepare(`WITH scoped AS (${scoped.sql}), ranked AS (
    SELECT *,ROW_NUMBER() OVER(PARTITION BY store_id,benefit_item_id ORDER BY observed_at DESC,created_at DESC,report_id DESC) AS position FROM scoped
  ), counts AS (
    SELECT store_id,benefit_item_id,SUM(availability='available') AS available_count,SUM(availability='unavailable') AS unavailable_count,SUM(availability='unknown') AS unknown_count
    FROM scoped WHERE observed_at>=? GROUP BY store_id,benefit_item_id
  ) SELECT r.*,COALESCE(c.available_count,0) AS available_count,COALESCE(c.unavailable_count,0) AS unavailable_count,COALESCE(c.unknown_count,0) AS unknown_count
    FROM ranked r LEFT JOIN counts c ON c.store_id=r.store_id AND c.benefit_item_id IS r.benefit_item_id
    WHERE r.position=1${unavailableOnly?" AND c.unavailable_count>0":""}
    ORDER BY r.observed_at DESC,r.store_id,r.benefit_item_id LIMIT ? OFFSET ?`).bind(...scoped.bindings,cutoff,limit,offset).all();
  return rows.results;
}

export async function readBenefitItemSummary(db, benefit, now) {
  const scoped=scope(benefit.id,{now});
  const rows=(await db.prepare(`WITH counts AS (
    SELECT store_id,benefit_item_id,SUM(availability='available') AS available_count,SUM(availability='unavailable') AS unavailable_count
    FROM (${scoped.sql}) WHERE observed_at>=? AND benefit_item_id IS NOT NULL GROUP BY store_id,benefit_item_id
  ) SELECT benefit_item_id,SUM(available_count>0) AS available_stores,SUM(unavailable_count>0) AS unavailable_stores,
    SUM(available_count>0 AND unavailable_count>0) AS conflicting_stores FROM counts GROUP BY benefit_item_id`)
    .bind(...scoped.bindings,new Date(now.getTime()-86400000).toISOString()).all()).results;
  return benefit.items.map((i)=>{const r=rows.find((r)=>r.benefit_item_id===i.id);return {...i,availableStoreCount:Number(r?.available_stores??0),unavailableStoreCount:Number(r?.unavailable_stores??0),conflictingStoreCount:Number(r?.conflicting_stores??0)};});
}
