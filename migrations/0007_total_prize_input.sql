PRAGMA foreign_keys = ON;

ALTER TABLE reports
ADD COLUMN guaranteed_prize_count INTEGER NOT NULL DEFAULT 0
CHECK (guaranteed_prize_count BETWEEN 0 AND 500);

ALTER TABLE reports
ADD COLUMN prize_input_mode TEXT NOT NULL DEFAULT 'by_acquisition'
CHECK (prize_input_mode IN ('by_acquisition', 'total'));

CREATE TABLE report_total_prizes (
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  prize_category_id TEXT NOT NULL REFERENCES prize_categories(id),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 0 AND 500),
  PRIMARY KEY (report_id, prize_category_id)
);

CREATE TABLE report_total_item_breakdowns (
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  prize_category_id TEXT NOT NULL REFERENCES prize_categories(id),
  status TEXT NOT NULL CHECK (status IN ('complete', 'partial', 'unknown')),
  PRIMARY KEY (report_id, prize_category_id)
);

CREATE TABLE report_total_items (
  report_id TEXT NOT NULL,
  prize_category_id TEXT NOT NULL,
  prize_item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 0 AND 500),
  PRIMARY KEY (report_id, prize_item_id),
  FOREIGN KEY (report_id, prize_category_id)
    REFERENCES report_total_item_breakdowns(report_id, prize_category_id) ON DELETE CASCADE,
  FOREIGN KEY (prize_item_id, prize_category_id)
    REFERENCES prize_items(id, prize_category_id)
);

CREATE VIEW report_observed_prizes AS
SELECT report_id, prize_category_id, quantity
FROM report_total_prizes
UNION ALL
SELECT acquisition.report_id, acquisition.prize_category_id, SUM(acquisition.quantity) AS quantity
FROM report_prize_acquisitions acquisition
JOIN reports report ON report.id = acquisition.report_id
WHERE report.prize_input_mode = 'by_acquisition'
GROUP BY acquisition.report_id, acquisition.prize_category_id;

CREATE VIEW report_observed_items AS
SELECT report_id, prize_category_id, prize_item_id, quantity
FROM report_total_items
UNION ALL
SELECT acquisition.report_id, acquisition.prize_category_id,
  acquisition.prize_item_id, SUM(acquisition.quantity) AS quantity
FROM report_prize_item_acquisitions acquisition
JOIN reports report ON report.id = acquisition.report_id
WHERE report.prize_input_mode = 'by_acquisition'
GROUP BY acquisition.report_id, acquisition.prize_category_id, acquisition.prize_item_id;

CREATE VIEW active_draw_prize_reports AS
SELECT *
FROM active_user_reports
WHERE prize_breakdown_status = 'complete'
  AND (prize_input_mode = 'by_acquisition' OR guaranteed_prize_count = 0);

CREATE VIEW active_draw_prizes AS
SELECT report.id AS report_id, prize.prize_category_id, prize.quantity
FROM active_draw_prize_reports report
JOIN report_prizes prize ON prize.report_id = report.id
WHERE report.prize_input_mode = 'by_acquisition'
UNION ALL
SELECT report.id AS report_id, prize.prize_category_id, prize.quantity
FROM active_draw_prize_reports report
JOIN report_total_prizes prize ON prize.report_id = report.id
WHERE report.prize_input_mode = 'total';

CREATE VIEW active_draw_item_breakdowns AS
SELECT report.id AS report_id, breakdown.prize_category_id, breakdown.status
FROM active_draw_prize_reports report
JOIN report_prize_item_breakdowns breakdown ON breakdown.report_id = report.id
WHERE report.prize_input_mode = 'by_acquisition'
UNION ALL
SELECT report.id AS report_id, breakdown.prize_category_id, breakdown.status
FROM active_draw_prize_reports report
JOIN report_total_item_breakdowns breakdown ON breakdown.report_id = report.id
WHERE report.prize_input_mode = 'total';

CREATE VIEW active_draw_items AS
SELECT report.id AS report_id, item.prize_category_id, item.prize_item_id, item.quantity
FROM active_draw_prize_reports report
JOIN report_prize_items item ON item.report_id = report.id
WHERE report.prize_input_mode = 'by_acquisition'
UNION ALL
SELECT report.id AS report_id, item.prize_category_id, item.prize_item_id, item.quantity
FROM active_draw_prize_reports report
JOIN report_total_items item ON item.report_id = report.id
WHERE report.prize_input_mode = 'total';

CREATE INDEX idx_reports_prize_input_mode
ON reports(campaign_id, prize_input_mode, guaranteed_prize_count, prize_breakdown_status);
CREATE INDEX idx_total_prizes_category
ON report_total_prizes(prize_category_id, report_id);
CREATE INDEX idx_total_items_item
ON report_total_items(prize_item_id, report_id);

PRAGMA optimize;
