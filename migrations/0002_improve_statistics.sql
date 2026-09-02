PRAGMA foreign_keys = ON;

ALTER TABLE reports
ADD COLUMN prize_breakdown_status TEXT NOT NULL DEFAULT 'unknown'
CHECK (prize_breakdown_status IN ('complete', 'partial', 'unknown'));

CREATE TABLE store_campaign_usage_stats (
  store_id TEXT NOT NULL REFERENCES stores(id),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  usage_type TEXT NOT NULL CHECK (usage_type IN ('normal', 'plus', 'unknown')),
  report_count INTEGER NOT NULL DEFAULT 0,
  total_panel_draws INTEGER NOT NULL DEFAULT 0,
  total_panel_wins INTEGER NOT NULL DEFAULT 0,
  total_mobile_draws INTEGER NOT NULL DEFAULT 0,
  total_mobile_wins INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT,
  PRIMARY KEY (store_id, campaign_id, usage_type)
);

INSERT INTO store_campaign_usage_stats (
  store_id, campaign_id, usage_type, report_count,
  total_panel_draws, total_panel_wins, total_mobile_draws, total_mobile_wins, updated_at
)
SELECT
  store_id,
  campaign_id,
  usage_type,
  COUNT(*),
  COALESCE(SUM(panel_draws), 0),
  COALESCE(SUM(panel_wins), 0),
  COALESCE(SUM(mobile_draws), 0),
  COALESCE(SUM(mobile_wins), 0),
  datetime('now')
FROM reports
WHERE status = 'active'
GROUP BY store_id, campaign_id, usage_type;

-- 既存投稿の景品内訳は完全性を判定できないため、景品別集計には含めない。
DELETE FROM store_campaign_prize_stats;

CREATE TABLE report_fingerprints (
  fingerprint TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_reports_store_campaign_visit_date_active
ON reports(store_id, campaign_id, visit_date)
WHERE status = 'active';

CREATE INDEX idx_reports_campaign_breakdown_active
ON reports(campaign_id, prize_breakdown_status)
WHERE status = 'active';

CREATE INDEX idx_report_fingerprints_expires
ON report_fingerprints(expires_at);

PRAGMA optimize;
