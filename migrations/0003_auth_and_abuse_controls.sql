PRAGMA foreign_keys = ON;
PRAGMA defer_foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'restricted', 'banned')),
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  banned_at TEXT,
  ban_reason TEXT
);

CREATE TABLE reports_v3 (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  visit_date TEXT NOT NULL,
  usage_type TEXT NOT NULL CHECK (usage_type IN ('normal', 'plus', 'unknown')),
  panel_draws INTEGER NOT NULL CHECK (panel_draws BETWEEN 0 AND 500),
  panel_wins INTEGER NOT NULL CHECK (panel_wins BETWEEN 0 AND panel_draws),
  mobile_draws INTEGER NOT NULL CHECK (mobile_draws BETWEEN 0 AND 500),
  mobile_wins INTEGER NOT NULL CHECK (mobile_wins BETWEEN 0 AND mobile_draws),
  unknown_prize_count INTEGER NOT NULL DEFAULT 0 CHECK (unknown_prize_count BETWEEN 0 AND 500),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'hidden')),
  created_at TEXT NOT NULL,
  prize_breakdown_status TEXT NOT NULL DEFAULT 'unknown' CHECK (prize_breakdown_status IN ('complete', 'partial', 'unknown')),
  user_id TEXT REFERENCES users(id),
  daily_rate_hash TEXT,
  abuse_hash TEXT,
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  risk_reasons TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(risk_reasons))
);

INSERT INTO reports_v3 (
  id, store_id, campaign_id, visit_date, usage_type,
  panel_draws, panel_wins, mobile_draws, mobile_wins,
  unknown_prize_count, status, created_at, prize_breakdown_status,
  user_id, daily_rate_hash, abuse_hash, risk_score, risk_reasons
)
SELECT
  id, store_id, campaign_id, visit_date, usage_type,
  panel_draws, panel_wins, mobile_draws, mobile_wins,
  unknown_prize_count, status, created_at, prize_breakdown_status,
  NULL, NULL, NULL, 0, '[]'
FROM reports;

CREATE TABLE report_prizes_v3 (
  report_id TEXT NOT NULL REFERENCES reports_v3(id) ON DELETE CASCADE,
  prize_category_id TEXT NOT NULL REFERENCES prize_categories(id),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 0 AND 500),
  PRIMARY KEY (report_id, prize_category_id)
);

INSERT INTO report_prizes_v3 (report_id, prize_category_id, quantity)
SELECT report_id, prize_category_id, quantity FROM report_prizes;

CREATE TABLE report_fingerprints_v3 (
  fingerprint TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports_v3(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

INSERT INTO report_fingerprints_v3 (fingerprint, report_id, expires_at, created_at)
SELECT fingerprint, report_id, expires_at, created_at FROM report_fingerprints;

DROP TABLE report_prizes;
DROP TABLE report_fingerprints;
DROP TABLE reports;

ALTER TABLE reports_v3 RENAME TO reports;
ALTER TABLE report_prizes_v3 RENAME TO report_prizes;
ALTER TABLE report_fingerprints_v3 RENAME TO report_fingerprints;

CREATE TABLE daily_submission_slots (
  actor_hash TEXT NOT NULL,
  local_date TEXT NOT NULL,
  slot INTEGER NOT NULL CHECK (slot > 0),
  report_id TEXT NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (actor_hash, local_date, slot)
);

CREATE INDEX idx_reports_store_campaign_created
ON reports(store_id, campaign_id, created_at DESC) WHERE status = 'active';
CREATE INDEX idx_reports_campaign_status ON reports(campaign_id, status);
CREATE INDEX idx_reports_store_campaign_visit_date_active
ON reports(store_id, campaign_id, visit_date) WHERE status = 'active';
CREATE INDEX idx_reports_campaign_breakdown_active
ON reports(campaign_id, prize_breakdown_status) WHERE status = 'active';
CREATE INDEX idx_reports_user_created
ON reports(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_reports_abuse_store_created
ON reports(abuse_hash, store_id, created_at DESC) WHERE abuse_hash IS NOT NULL;
CREATE INDEX idx_reports_hash_retention
ON reports(created_at) WHERE abuse_hash IS NOT NULL OR daily_rate_hash IS NOT NULL;
CREATE INDEX idx_reports_moderation_queue
ON reports(status, risk_score DESC, created_at DESC);
CREATE INDEX idx_report_prizes_category ON report_prizes(prize_category_id);
CREATE INDEX idx_report_fingerprints_expires ON report_fingerprints(expires_at);
CREATE INDEX idx_daily_submission_slots_date ON daily_submission_slots(local_date);
CREATE INDEX idx_users_status_last_seen ON users(status, last_seen_at DESC);

CREATE TRIGGER prevent_banned_user_report
BEFORE INSERT ON reports
WHEN NEW.user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id AND status = 'banned')
BEGIN
  SELECT RAISE(ABORT, 'banned-user');
END;

CREATE TRIGGER enforce_report_total_draw_limit
BEFORE INSERT ON reports
WHEN NEW.panel_draws + NEW.mobile_draws > 300
BEGIN
  SELECT RAISE(ABORT, 'report-draw-limit');
END;

PRAGMA optimize;
