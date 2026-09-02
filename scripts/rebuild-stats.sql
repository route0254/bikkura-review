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
  COALESCE(SUM(COALESCE((SELECT SUM(report_prizes.quantity) FROM report_prizes WHERE report_prizes.report_id = reports.id), 0) + COALESCE(reports.unknown_prize_count, 0)), 0),
  COALESCE(SUM(reports.unknown_prize_count), 0),
  datetime('now')
FROM stores
CROSS JOIN campaigns
LEFT JOIN reports ON reports.store_id = stores.id AND reports.campaign_id = campaigns.id AND reports.status = 'active'
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
FROM reports
WHERE reports.status = 'active'
GROUP BY reports.store_id, reports.campaign_id, reports.usage_type;

INSERT INTO store_campaign_prize_stats (store_id, campaign_id, prize_category_id, reported_quantity, updated_at)
SELECT reports.store_id, reports.campaign_id, report_prizes.prize_category_id, SUM(report_prizes.quantity), datetime('now')
FROM reports
JOIN report_prizes ON report_prizes.report_id = reports.id
WHERE reports.status = 'active' AND reports.prize_breakdown_status = 'complete'
GROUP BY reports.store_id, reports.campaign_id, report_prizes.prize_category_id;

PRAGMA optimize;
