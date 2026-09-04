import { benefitStatusLabel, conflictingBenefits } from "./benefits.js";
import { htmlEscape as escape } from "./insights-ui.js";
import { goodsImage } from "./goods-ui.js";

export const BENEFIT_IMAGE_NOTICE='<p class="image-availability-note">画像は識別用イラストです。実物の写真ではありません。特典名・絵柄名もご確認ください。</p>';
export function benefitStatusMarkup(row, item=false) {
  const latest=row?.latest,counts=row?.last24h??{},conflict=row?.conflicting??conflictingBenefits(counts);
  if(!latest)return '<p class="benefit-empty">まだ報告がありません。在庫があることを意味しません。</p>';
  const freshness={"24h":"24時間以内の報告","48h":"48時間以内の報告",stale:"古い情報です。現在の状況は未確認です。",unknown:"確認日時不明"}[latest.freshness];
  const time=new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(latest.observedAt));
  return `${conflict?'<p class="benefit-conflict">直近の報告が分かれています</p>':""}<p class="benefit-latest">最新報告：${escape(benefitStatusLabel(latest))}</p><time datetime="${escape(latest.observedAt)}">${escape(time)} 確認（日本時間）</time><p class="benefit-freshness">${escape(freshness??"")}</p><p>過去24時間：${item?"受取・配布中":"受け取れた"} ${counts.available??0}件 / 配布終了 ${counts.unavailable??0}件 / 不明 ${counts.unknown??0}件</p>`;
}
export function benefitItemCard(item, benefitName, content) {
  return `<article class="benefit-item-card ${item.latest?.freshness==="stale"?"benefit-stale":""}" data-benefit-design="${escape(item.id)}">${goodsImage(item,`${benefitName} ${item.name}`)}<h4>${escape(item.name)}</h4>${content??benefitStatusMarkup(item,true)}</article>`;
}
