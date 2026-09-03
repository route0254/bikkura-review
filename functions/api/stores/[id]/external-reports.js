import { getCampaign } from "../../../_lib/data.js";
import { apiError, boundedLimit, cacheHeaders, json, unavailable } from "../../../_lib/http.js";
import { EXTERNAL_PLATFORM_LABELS } from "../../../../lib/external-reports.js";

function nullableNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

export async function onRequestGet({ request, env, params }) {
  try {
    const url = new URL(request.url);
    const campaign = await getCampaign(env.DB, url.searchParams.get("campaign"));
    if (!campaign) return apiError("キャンペーンが見つかりません。", 404);
    const store = await env.DB.prepare("SELECT id FROM stores WHERE id = ? AND active = 1").bind(params.id).first();
    if (!store) return apiError("店舗が見つかりません。", 404);
    const limit = boundedLimit(url.searchParams.get("limit"), 10, 25);
    const reports = (await env.DB.prepare(`
      SELECT id, visit_date, visit_date_label, external_platform, external_url,
        external_observed_at, evidence_quality, result_precision, usage_type,
        panel_draws, panel_wins, mobile_draws, mobile_wins,
        total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind
      FROM external_reports
      WHERE store_id = ? AND campaign_id = ? AND source_type = 'external'
        AND status = 'active'
      ORDER BY COALESCE(visit_date, external_observed_at) DESC, created_at DESC, id DESC
      LIMIT ?
    `).bind(params.id, campaign.id, limit).all()).results;

    let prizes = [];
    let prizeItems = [];
    if (reports.length) {
      const placeholders = reports.map(() => "?").join(",");
      const reportIds = reports.map((report) => report.id);
      [prizes, prizeItems] = await Promise.all([
        env.DB.prepare(`
          SELECT external.external_report_id, category.id, category.name,
            external.quantity, external.quantity_kind, external.acquisition_type
          FROM external_report_prizes external
          JOIN prize_categories category ON category.id = external.prize_category_id
          WHERE external.external_report_id IN (${placeholders})
          ORDER BY category.sort_order, category.id
        `).bind(...reportIds).all().then((result) => result.results),
        env.DB.prepare(`
          SELECT external.external_report_id, external.prize_category_id,
            category.name AS category_name, item.id, item.name,
            external.quantity, external.quantity_kind, external.acquisition_type
          FROM external_report_items external
          JOIN prize_items item ON item.id = external.prize_item_id
          JOIN prize_categories category ON category.id = external.prize_category_id
          WHERE external.external_report_id IN (${placeholders})
          ORDER BY category.sort_order, item.sort_order, item.id
        `).bind(...reportIds).all().then((result) => result.results),
      ]);
    }

    return json({
      items: reports.map((report) => ({
        id: report.id,
        sourceType: "external",
        visitDate: report.visit_date,
        visitDateLabel: report.visit_date_label,
        externalPlatform: report.external_platform,
        externalPlatformLabel: EXTERNAL_PLATFORM_LABELS[report.external_platform] ?? "その他",
        externalUrl: report.external_url,
        externalObservedAt: report.external_observed_at,
        evidenceQuality: report.evidence_quality,
        resultPrecision: report.result_precision,
        usageType: report.usage_type,
        panelDraws: nullableNumber(report.panel_draws),
        panelWins: nullableNumber(report.panel_wins),
        mobileDraws: nullableNumber(report.mobile_draws),
        mobileWins: nullableNumber(report.mobile_wins),
        totalPrizes: nullableNumber(report.total_prizes),
        totalPrizesKind: report.total_prizes_kind,
        spendAmountYen: nullableNumber(report.spend_amount_yen),
        spendAmountKind: report.spend_amount_kind,
        prizes: prizes.filter((prize) => prize.external_report_id === report.id).map((prize) => ({
          id: prize.id,
          name: prize.name,
          quantity: nullableNumber(prize.quantity),
          quantityKind: prize.quantity_kind,
          acquisitionType: prize.acquisition_type,
        })),
        items: prizeItems.filter((item) => item.external_report_id === report.id).map((item) => ({
          id: item.id,
          name: item.name,
          prizeCategoryId: item.prize_category_id,
          prizeCategoryName: item.category_name,
          quantity: Number(item.quantity),
          quantityKind: item.quantity_kind,
          acquisitionType: item.acquisition_type,
        })),
      })),
    }, { headers: cacheHeaders(60) });
  } catch (error) { return unavailable(error); }
}
