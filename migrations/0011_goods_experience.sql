PRAGMA foreign_keys = ON;
-- 既存の投稿方式と数値はそのまま。新しいカード入力だけを識別する。
ALTER TABLE reports ADD COLUMN goods_input INTEGER NOT NULL DEFAULT 0 CHECK (goods_input IN (0, 1));
ALTER TABLE prize_items ADD COLUMN image_asset TEXT;
ALTER TABLE benefit_campaigns ADD COLUMN image_asset TEXT;
ALTER TABLE benefit_reports ADD COLUMN received_quantity INTEGER
CHECK (received_quantity IS NULL OR (availability = 'available' AND received_quantity BETWEEN 1 AND 300));

CREATE TABLE report_goods_guaranteed_items (
  report_id TEXT NOT NULL,
  prize_item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 0 AND 300),
  PRIMARY KEY (report_id, prize_item_id),
  FOREIGN KEY (report_id, prize_item_id) REFERENCES report_total_items(report_id, prize_item_id)
);

CREATE TABLE benefit_withdrawals (
  report_id TEXT PRIMARY KEY REFERENCES benefit_reports(id),
  withdrawn_at TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'user_request'
);
CREATE VIEW active_benefit_reports AS
SELECT report.* FROM benefit_reports report
WHERE report.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM benefit_withdrawals w WHERE w.report_id = report.id);
CREATE INDEX idx_benefit_user_created ON benefit_reports(user_id, created_at DESC);
CREATE INDEX idx_benefit_overview ON benefit_reports(benefit_id, status, observed_at DESC, store_id);

-- 旧かんたん入力と新カード入力（金額は任意）の共通金額参照。
CREATE VIEW active_spend_reports AS
SELECT r.*, CASE WHEN result_input_mode = 'simple' THEN simple_guaranteed_prize_count
  ELSE guaranteed_prize_count END AS reference_guaranteed_count
FROM active_user_reports r WHERE result_input_mode = 'simple' OR goods_input = 1;
PRAGMA optimize;
