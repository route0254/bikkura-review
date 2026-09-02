PRAGMA foreign_keys = ON;

CREATE TABLE prize_items (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  prize_category_id TEXT NOT NULL REFERENCES prize_categories(id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (campaign_id, prize_category_id, name),
  UNIQUE (id, prize_category_id)
);

CREATE TABLE report_prize_item_breakdowns (
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  prize_category_id TEXT NOT NULL REFERENCES prize_categories(id),
  status TEXT NOT NULL CHECK (status IN ('complete', 'partial', 'unknown')),
  PRIMARY KEY (report_id, prize_category_id)
);

CREATE TABLE report_prize_items (
  report_id TEXT NOT NULL,
  prize_category_id TEXT NOT NULL,
  prize_item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 0 AND 500),
  PRIMARY KEY (report_id, prize_item_id),
  FOREIGN KEY (report_id, prize_category_id)
    REFERENCES report_prize_item_breakdowns(report_id, prize_category_id) ON DELETE CASCADE,
  FOREIGN KEY (prize_item_id, prize_category_id)
    REFERENCES prize_items(id, prize_category_id)
);

CREATE INDEX idx_prize_items_campaign_category_order
ON prize_items(campaign_id, prize_category_id, active, sort_order);

CREATE INDEX idx_item_breakdowns_category_status
ON report_prize_item_breakdowns(prize_category_id, status, report_id);

CREATE INDEX idx_report_prize_items_item
ON report_prize_items(prize_item_id, report_id);

-- 既存投稿は内訳行を持たないため、個別景品内訳は unknown 相当のまま扱う。
PRAGMA optimize;
