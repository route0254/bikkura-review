import { getCampaign, mapCampaign, mapSummary, mapUsageStats } from "../_lib/data.js";
import { apiError, cacheHeaders, json, unavailable } from "../_lib/http.js";

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const campaign = await getCampaign(env.DB, url.searchParams.get("campaign"));
    if (!campaign) return apiError("キャンペーンが見つかりません。", 404);
    const [totals, prizes, breakdown, usageRows, storeRows, storePrizeRows, coverage] = await Promise.all([
      env.DB.prepare(`
        SELECT
          COALESCE(SUM(report_count), 0) AS report_count,
          COALESCE(SUM(total_panel_draws + total_mobile_draws), 0) AS total_draws,
          COALESCE(SUM(total_panel_wins + total_mobile_wins), 0) AS total_wins,
          COALESCE(SUM(total_prize_count), 0) AS total_prize_count
        FROM store_campaign_stats WHERE campaign_id = ?
      `).bind(campaign.id).first(),
      env.DB.prepare(`
        SELECT pc.id, pc.name, COALESCE(SUM(scps.reported_quantity), 0) AS quantity
        FROM prize_categories pc
        LEFT JOIN store_campaign_prize_stats scps ON scps.prize_category_id = pc.id AND scps.campaign_id = pc.campaign_id
        WHERE pc.campaign_id = ? AND pc.active = 1
        GROUP BY pc.id, pc.name, pc.sort_order
        ORDER BY pc.sort_order, pc.id
      `).bind(campaign.id).all(),
      env.DB.prepare(`
        SELECT COUNT(*) AS complete_report_count
        FROM active_user_reports
        WHERE campaign_id = ? AND prize_breakdown_status = 'complete'
      `).bind(campaign.id).first(),
      env.DB.prepare(`
        SELECT
          usage_type,
          SUM(report_count) AS report_count,
          SUM(total_panel_draws) AS total_panel_draws,
          SUM(total_panel_wins) AS total_panel_wins,
          SUM(total_mobile_draws) AS total_mobile_draws,
          SUM(total_mobile_wins) AS total_mobile_wins
        FROM store_campaign_usage_stats
        WHERE campaign_id = ?
        GROUP BY usage_type
      `).bind(campaign.id).all(),
      env.DB.prepare(`
        SELECT
          scs.store_id,
          scs.report_count,
          scs.total_panel_draws + scs.total_mobile_draws AS total_draws,
          scs.total_panel_wins + scs.total_mobile_wins AS total_wins,
          scs.total_prize_count,
          COALESCE(complete.complete_report_count, 0) AS complete_report_count,
          latest.latest_report_at
        FROM store_campaign_stats scs
        LEFT JOIN (
          SELECT store_id, COUNT(*) AS complete_report_count
          FROM active_user_reports
          WHERE campaign_id = ? AND prize_breakdown_status = 'complete'
          GROUP BY store_id
        ) complete ON complete.store_id = scs.store_id
        LEFT JOIN (
          SELECT store_id, MAX(created_at) AS latest_report_at
          FROM active_user_reports
          WHERE campaign_id = ?
          GROUP BY store_id
        ) latest ON latest.store_id = scs.store_id
        WHERE scs.campaign_id = ? AND scs.report_count > 0
      `).bind(campaign.id, campaign.id, campaign.id).all(),
      env.DB.prepare(`
        SELECT scps.store_id, pc.id, pc.name, scps.reported_quantity AS quantity
        FROM store_campaign_prize_stats scps
        JOIN prize_categories pc ON pc.id = scps.prize_category_id
        WHERE scps.campaign_id = ? AND pc.active = 1 AND scps.reported_quantity > 0
        ORDER BY scps.store_id, pc.sort_order, pc.id
      `).bind(campaign.id).all(),
      env.DB.prepare(`
        SELECT
          (SELECT COUNT(*) FROM stores WHERE active = 1) AS total_store_count,
          (SELECT COUNT(DISTINCT prefecture) FROM stores WHERE active = 1) AS total_prefecture_count,
          COUNT(DISTINCT CASE WHEN stats.report_count > 0 THEN stats.store_id END) AS reporting_store_count,
          COUNT(DISTINCT CASE WHEN stats.report_count > 0 THEN store.prefecture END) AS reporting_prefecture_count
        FROM stores store
        LEFT JOIN store_campaign_stats stats
          ON stats.store_id = store.id AND stats.campaign_id = ?
        WHERE store.active = 1
      `).bind(campaign.id).first(),
    ]);
    const prizeItems = prizes.results.map((prize) => ({ id: prize.id, name: prize.name, quantity: Number(prize.quantity) }));
    const completePrizeCount = prizeItems.reduce((sum, prize) => sum + prize.quantity, 0);
    const prizesByStore = new Map();
    for (const prize of storePrizeRows.results) {
      if (!prizesByStore.has(prize.store_id)) prizesByStore.set(prize.store_id, []);
      prizesByStore.get(prize.store_id).push({ id: prize.id, name: prize.name, quantity: Number(prize.quantity) });
    }
    return json({
      campaign: mapCampaign(campaign),
      ...mapSummary({ ...totals, ...breakdown, complete_prize_count: completePrizeCount }),
      prizes: prizeItems,
      coverage: {
        reportingStoreCount: Number(coverage?.reporting_store_count ?? 0),
        totalStoreCount: Number(coverage?.total_store_count ?? 0),
        reportingPrefectureCount: Number(coverage?.reporting_prefecture_count ?? 0),
        totalPrefectureCount: Number(coverage?.total_prefecture_count ?? 0),
      },
      usage: mapUsageStats(usageRows.results),
      stores: storeRows.results.map((row) => {
        const storePrizes = prizesByStore.get(row.store_id) ?? [];
        return {
          storeId: row.store_id,
          ...mapSummary({ ...row, complete_prize_count: storePrizes.reduce((sum, prize) => sum + prize.quantity, 0) }),
          prizes: storePrizes,
          latestReportAt: row.latest_report_at,
        };
      }),
    }, { headers: cacheHeaders(60) });
  } catch (error) { return unavailable(error); }
}
