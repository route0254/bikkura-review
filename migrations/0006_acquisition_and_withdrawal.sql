PRAGMA foreign_keys = ON;

ALTER TABLE reports
ADD COLUMN source_type TEXT NOT NULL DEFAULT 'user'
CHECK (source_type = 'user');

CREATE TABLE report_withdrawals (
  report_id TEXT PRIMARY KEY REFERENCES reports(id) ON DELETE CASCADE,
  withdrawn_at TEXT NOT NULL,
  reason TEXT
);

CREATE TABLE report_guaranteed_prizes (
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  prize_category_id TEXT NOT NULL REFERENCES prize_categories(id),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 0 AND 500),
  PRIMARY KEY (report_id, prize_category_id)
);

CREATE TABLE report_guaranteed_item_breakdowns (
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  prize_category_id TEXT NOT NULL REFERENCES prize_categories(id),
  status TEXT NOT NULL CHECK (status IN ('complete', 'partial', 'unknown')),
  PRIMARY KEY (report_id, prize_category_id)
);

CREATE TABLE report_guaranteed_items (
  report_id TEXT NOT NULL,
  prize_category_id TEXT NOT NULL,
  prize_item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 0 AND 500),
  PRIMARY KEY (report_id, prize_item_id),
  FOREIGN KEY (report_id, prize_category_id)
    REFERENCES report_guaranteed_item_breakdowns(report_id, prize_category_id) ON DELETE CASCADE,
  FOREIGN KEY (prize_item_id, prize_category_id)
    REFERENCES prize_items(id, prize_category_id)
);

CREATE VIEW report_prize_acquisitions AS
SELECT report_id, prize_category_id, 'draw' AS acquisition_type, quantity FROM report_prizes
UNION ALL
SELECT report_id, prize_category_id, 'guaranteed' AS acquisition_type, quantity FROM report_guaranteed_prizes;

CREATE VIEW report_prize_item_acquisitions AS
SELECT report_id, prize_category_id, 'draw' AS acquisition_type, prize_item_id, quantity FROM report_prize_items
UNION ALL
SELECT report_id, prize_category_id, 'guaranteed' AS acquisition_type, prize_item_id, quantity FROM report_guaranteed_items;

CREATE VIEW active_user_reports AS
SELECT reports.*
FROM reports
WHERE reports.status = 'active' AND reports.source_type = 'user'
  AND NOT EXISTS (
    SELECT 1 FROM report_withdrawals WHERE report_withdrawals.report_id = reports.id
  );

ALTER TABLE external_report_prizes
ADD COLUMN acquisition_type TEXT NOT NULL DEFAULT 'unknown'
CHECK (acquisition_type IN ('draw', 'guaranteed', 'unknown'));

ALTER TABLE external_report_items
ADD COLUMN acquisition_type TEXT NOT NULL DEFAULT 'unknown'
CHECK (acquisition_type IN ('draw', 'guaranteed', 'unknown'));

CREATE INDEX idx_reports_campaign_source_status
ON reports(campaign_id, source_type, status, created_at DESC);
CREATE INDEX idx_report_withdrawals_time ON report_withdrawals(withdrawn_at DESC);
CREATE INDEX idx_guaranteed_prizes_category ON report_guaranteed_prizes(prize_category_id, report_id);
CREATE INDEX idx_guaranteed_items_item ON report_guaranteed_items(prize_item_id, report_id);

PRAGMA optimize;
