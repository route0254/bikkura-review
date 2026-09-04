PRAGMA foreign_keys = ON;

-- 既存simple投稿はNULLのまま。従来のguaranteed_prize_count=0を「確認済み0」と推測しない。
ALTER TABLE reports ADD COLUMN simple_guaranteed_prize_count INTEGER
CHECK (simple_guaranteed_prize_count IS NULL OR (
  result_input_mode = 'simple' AND reported_prize_count IS NOT NULL
  AND simple_guaranteed_prize_count BETWEEN 0 AND reported_prize_count
));

CREATE VIEW active_result_metrics AS
SELECT report.*,
  CASE WHEN result_input_mode = 'simple' THEN 0
    WHEN prize_input_mode = 'total' THEN panel_wins + mobile_wins
    ELSE unknown_prize_count + COALESCE((SELECT SUM(quantity) FROM report_prizes WHERE report_id = report.id), 0)
  END AS draw_prize_count
FROM active_user_reports report;

CREATE TABLE benefit_campaigns (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  name TEXT NOT NULL,
  starts_on TEXT NOT NULL,
  ends_on TEXT,
  conditions TEXT NOT NULL,
  source_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  UNIQUE (id, campaign_id)
);

CREATE TABLE benefit_reports (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id),
  benefit_id TEXT NOT NULL REFERENCES benefit_campaigns(id),
  observed_at TEXT NOT NULL,
  availability TEXT NOT NULL CHECK (availability IN ('available', 'unavailable', 'unknown')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'hidden')),
  user_id TEXT REFERENCES users(id),
  daily_rate_hash TEXT,
  abuse_hash TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_benefit_latest ON benefit_reports(store_id, benefit_id, observed_at DESC) WHERE status = 'active';
CREATE INDEX idx_benefit_retention ON benefit_reports(created_at);
CREATE INDEX idx_benefit_campaign ON benefit_campaigns(campaign_id, active, sort_order);

-- 通常の結果投稿とは別枠。slot競合とfingerprintをbatchで原子的に処理する。
CREATE TABLE benefit_submission_slots (
  actor_hash TEXT NOT NULL,
  local_date TEXT NOT NULL,
  slot INTEGER NOT NULL CHECK (slot > 0),
  report_id TEXT NOT NULL UNIQUE REFERENCES benefit_reports(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (actor_hash, local_date, slot)
);
CREATE INDEX idx_benefit_slots_date ON benefit_submission_slots(local_date);
CREATE TABLE benefit_fingerprints (
  fingerprint TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES benefit_reports(id),
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_benefit_fingerprint_expiry ON benefit_fingerprints(expires_at);
CREATE TRIGGER prevent_banned_user_benefit
BEFORE INSERT ON benefit_reports
WHEN NEW.user_id IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id AND status = 'banned')
BEGIN
  SELECT RAISE(ABORT, 'banned-user');
END;

PRAGMA optimize;
