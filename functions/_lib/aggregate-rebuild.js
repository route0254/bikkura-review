export function rebuildStoreCampaignStatements(env, storeId, campaignId, updatedAt = new Date().toISOString()) {
  return [
    env.DB.prepare("DELETE FROM store_campaign_stats WHERE store_id = ? AND campaign_id = ?").bind(storeId, campaignId),
    env.DB.prepare("DELETE FROM store_campaign_usage_stats WHERE store_id = ? AND campaign_id = ?").bind(storeId, campaignId),
    env.DB.prepare("DELETE FROM store_campaign_prize_stats WHERE store_id = ? AND campaign_id = ?").bind(storeId, campaignId),
    env.DB.prepare(`
      INSERT INTO store_campaign_stats (
        store_id, campaign_id, report_count, total_panel_draws, total_panel_wins,
        total_mobile_draws, total_mobile_wins, total_prize_count,
        total_unknown_prizes, updated_at
      )
      SELECT
        store_id, campaign_id, COUNT(*), COALESCE(SUM(panel_draws), 0),
        COALESCE(SUM(panel_wins), 0), COALESCE(SUM(mobile_draws), 0),
        COALESCE(SUM(mobile_wins), 0),
        COALESCE(SUM(CASE
          WHEN result_input_mode = 'simple' THEN 0
          WHEN prize_input_mode = 'total' THEN panel_wins + mobile_wins
          ELSE unknown_prize_count + COALESCE((
            SELECT SUM(quantity) FROM report_prizes WHERE report_id = active_user_reports.id
          ), 0)
        END), 0),
        COALESCE(SUM(CASE WHEN result_input_mode = 'detailed' THEN unknown_prize_count ELSE 0 END), 0), ?
      FROM active_user_reports
      WHERE store_id = ? AND campaign_id = ?
      GROUP BY store_id, campaign_id
    `).bind(updatedAt, storeId, campaignId),
    env.DB.prepare(`
      INSERT INTO store_campaign_usage_stats (
        store_id, campaign_id, usage_type, report_count, total_panel_draws,
        total_panel_wins, total_mobile_draws, total_mobile_wins, updated_at
      )
      SELECT store_id, campaign_id, usage_type, COUNT(*),
        COALESCE(SUM(panel_draws), 0), COALESCE(SUM(panel_wins), 0),
        COALESCE(SUM(mobile_draws), 0), COALESCE(SUM(mobile_wins), 0), ?
      FROM active_user_reports
      WHERE store_id = ? AND campaign_id = ? AND result_input_mode = 'detailed'
      GROUP BY store_id, campaign_id, usage_type
    `).bind(updatedAt, storeId, campaignId),
    env.DB.prepare(`
      INSERT INTO store_campaign_prize_stats (
        store_id, campaign_id, prize_category_id, reported_quantity, updated_at
      )
      SELECT eligible.store_id, eligible.campaign_id, eligible.prize_category_id,
        COALESCE(SUM(eligible.quantity), 0), ?
      FROM (
        SELECT report.store_id, report.campaign_id, prize.prize_category_id, prize.quantity
        FROM active_draw_prize_reports report
        JOIN report_prizes prize ON prize.report_id = report.id
        WHERE report.prize_input_mode = 'by_acquisition'
        UNION ALL
        SELECT report.store_id, report.campaign_id, prize.prize_category_id, prize.quantity
        FROM active_draw_prize_reports report
        JOIN report_total_prizes prize ON prize.report_id = report.id
        WHERE report.prize_input_mode = 'total'
      ) eligible
      WHERE eligible.store_id = ? AND eligible.campaign_id = ?
      GROUP BY eligible.store_id, eligible.campaign_id, eligible.prize_category_id
      HAVING SUM(eligible.quantity) > 0
    `).bind(updatedAt, storeId, campaignId),
  ];
}
