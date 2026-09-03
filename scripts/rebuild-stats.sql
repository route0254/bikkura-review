DELETE FROM store_campaign_prize_stats;
DELETE FROM store_campaign_usage_stats;
DELETE FROM store_campaign_stats;

INSERT INTO store_campaign_stats (
  store_id, campaign_id, report_count, total_panel_draws, total_panel_wins,
  total_mobile_draws, total_mobile_wins, total_prize_count, total_unknown_prizes, updated_at
)
SELECT
  stores.id,
  campaigns.id,
  COUNT(reports.id),
  COALESCE(SUM(reports.panel_draws), 0),
  COALESCE(SUM(reports.panel_wins), 0),
  COALESCE(SUM(reports.mobile_draws), 0),
  COALESCE(SUM(reports.mobile_wins), 0),
  COALESCE(SUM(CASE
    WHEN reports.prize_input_mode = 'total' THEN reports.panel_wins + reports.mobile_wins
    ELSE COALESCE((SELECT SUM(report_prizes.quantity) FROM report_prizes WHERE report_prizes.report_id = reports.id), 0) + COALESCE(reports.unknown_prize_count, 0)
  END), 0),
  COALESCE(SUM(reports.unknown_prize_count), 0),
  datetime('now')
FROM stores
CROSS JOIN campaigns
LEFT JOIN active_user_reports reports ON reports.store_id = stores.id AND reports.campaign_id = campaigns.id
GROUP BY stores.id, campaigns.id;

INSERT INTO store_campaign_usage_stats (
  store_id, campaign_id, usage_type, report_count,
  total_panel_draws, total_panel_wins, total_mobile_draws, total_mobile_wins, updated_at
)
SELECT
  reports.store_id,
  reports.campaign_id,
  reports.usage_type,
  COUNT(*),
  SUM(reports.panel_draws),
  SUM(reports.panel_wins),
  SUM(reports.mobile_draws),
  SUM(reports.mobile_wins),
  datetime('now')
FROM active_user_reports reports
GROUP BY reports.store_id, reports.campaign_id, reports.usage_type;

INSERT INTO store_campaign_prize_stats (store_id, campaign_id, prize_category_id, reported_quantity, updated_at)
SELECT eligible.store_id, eligible.campaign_id, eligible.prize_category_id, SUM(eligible.quantity), datetime('now')
FROM (
  SELECT reports.store_id, reports.campaign_id, prizes.prize_category_id, prizes.quantity
  FROM active_draw_prize_reports reports
  JOIN report_prizes prizes ON prizes.report_id = reports.id
  WHERE reports.prize_input_mode = 'by_acquisition'
  UNION ALL
  SELECT reports.store_id, reports.campaign_id, prizes.prize_category_id, prizes.quantity
  FROM active_draw_prize_reports reports
  JOIN report_total_prizes prizes ON prizes.report_id = reports.id
  WHERE reports.prize_input_mode = 'total'
) eligible
GROUP BY eligible.store_id, eligible.campaign_id, eligible.prize_category_id;

PRAGMA optimize;
