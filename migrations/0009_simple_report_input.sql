PRAGMA foreign_keys = ON;

ALTER TABLE reports
ADD COLUMN result_input_mode TEXT NOT NULL DEFAULT 'detailed'
CHECK (result_input_mode IN ('detailed', 'simple'));

ALTER TABLE reports
ADD COLUMN spend_amount_yen INTEGER
CHECK (spend_amount_yen IS NULL OR spend_amount_yen BETWEEN 1 AND 1000000);

ALTER TABLE reports
ADD COLUMN reported_total_draws INTEGER
CHECK (reported_total_draws IS NULL OR reported_total_draws BETWEEN 0 AND 300);

ALTER TABLE reports
ADD COLUMN reported_prize_count INTEGER
CHECK (reported_prize_count IS NULL OR reported_prize_count BETWEEN 0 AND 300);

CREATE VIEW active_simple_reports AS
SELECT *
FROM active_user_reports
WHERE result_input_mode = 'simple';

DROP VIEW active_draw_prize_reports;
CREATE VIEW active_draw_prize_reports AS
SELECT *
FROM active_user_reports
WHERE result_input_mode = 'detailed'
  AND prize_breakdown_status = 'complete'
  AND (prize_input_mode = 'by_acquisition' OR guaranteed_prize_count = 0);

CREATE INDEX idx_reports_campaign_input_mode
ON reports(campaign_id, result_input_mode, visit_date, status);

PRAGMA optimize;
