PRAGMA foreign_keys = ON;

CREATE TABLE external_reports (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL DEFAULT 'external' CHECK (source_type = 'external'),
  store_id TEXT REFERENCES stores(id),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  visit_date TEXT,
  visit_date_label TEXT,
  external_platform TEXT NOT NULL CHECK (external_platform IN ('x', 'google_maps', 'tabelog', 'blog', 'other')),
  external_url TEXT,
  external_observed_at TEXT NOT NULL,
  evidence_quality TEXT NOT NULL CHECK (evidence_quality IN ('A', 'B', 'C')),
  result_precision TEXT NOT NULL CHECK (result_precision IN ('complete', 'partial', 'mention_only')),
  usage_type TEXT NOT NULL DEFAULT 'unknown' CHECK (usage_type IN ('normal', 'plus', 'unknown')),
  panel_draws INTEGER CHECK (panel_draws BETWEEN 0 AND 500),
  panel_wins INTEGER CHECK (panel_wins BETWEEN 0 AND 500),
  mobile_draws INTEGER CHECK (mobile_draws BETWEEN 0 AND 500),
  mobile_wins INTEGER CHECK (mobile_wins BETWEEN 0 AND 500),
  total_prizes INTEGER CHECK (total_prizes BETWEEN 0 AND 500),
  total_prizes_kind TEXT NOT NULL DEFAULT 'unknown' CHECK (total_prizes_kind IN ('exact', 'at_least', 'unknown')),
  note_internal TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'hidden')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (visit_date IS NULL OR visit_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CHECK (external_observed_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CHECK (external_url IS NULL OR external_url LIKE 'https://%' OR external_url LIKE 'http://%'),
  CHECK (panel_draws IS NULL OR panel_wins IS NULL OR panel_wins <= panel_draws),
  CHECK (mobile_draws IS NULL OR mobile_wins IS NULL OR mobile_wins <= mobile_draws),
  CHECK (
    (total_prizes_kind = 'unknown' AND total_prizes IS NULL)
    OR (total_prizes_kind IN ('exact', 'at_least') AND total_prizes IS NOT NULL)
  )
);

CREATE TABLE external_report_prizes (
  external_report_id TEXT NOT NULL REFERENCES external_reports(id) ON DELETE CASCADE,
  prize_category_id TEXT NOT NULL REFERENCES prize_categories(id),
  quantity INTEGER CHECK (quantity BETWEEN 0 AND 500),
  quantity_kind TEXT NOT NULL CHECK (quantity_kind IN ('exact', 'at_least', 'unknown')),
  PRIMARY KEY (external_report_id, prize_category_id),
  CHECK (
    (quantity_kind = 'unknown' AND quantity IS NULL)
    OR (quantity_kind IN ('exact', 'at_least') AND quantity IS NOT NULL)
  )
);

CREATE TABLE external_report_items (
  external_report_id TEXT NOT NULL,
  prize_category_id TEXT NOT NULL,
  prize_item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 0 AND 500),
  quantity_kind TEXT NOT NULL CHECK (quantity_kind IN ('exact', 'at_least')),
  PRIMARY KEY (external_report_id, prize_item_id),
  FOREIGN KEY (external_report_id, prize_category_id)
    REFERENCES external_report_prizes(external_report_id, prize_category_id) ON DELETE CASCADE,
  FOREIGN KEY (prize_item_id, prize_category_id)
    REFERENCES prize_items(id, prize_category_id)
);

CREATE INDEX idx_external_reports_store_campaign_status
ON external_reports(store_id, campaign_id, status, visit_date DESC, external_observed_at DESC);

CREATE INDEX idx_external_reports_campaign_platform_status
ON external_reports(campaign_id, external_platform, status);

CREATE UNIQUE INDEX idx_external_reports_source_store_unique
ON external_reports(external_platform, external_url, COALESCE(store_id, ''))
WHERE external_url IS NOT NULL;

CREATE INDEX idx_external_report_items_item
ON external_report_items(prize_item_id, external_report_id);

PRAGMA optimize;
