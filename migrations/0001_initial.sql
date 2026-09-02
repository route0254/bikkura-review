PRAGMA foreign_keys = ON;

CREATE TABLE stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  official_url TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  search_text TEXT NOT NULL
);

CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  source_url TEXT,
  published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0, 1))
);

CREATE TABLE prize_categories (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  UNIQUE (campaign_id, name)
);

CREATE TABLE reports (
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
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  created_at TEXT NOT NULL
);

CREATE TABLE report_prizes (
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  prize_category_id TEXT NOT NULL REFERENCES prize_categories(id),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 0 AND 500),
  PRIMARY KEY (report_id, prize_category_id)
);

CREATE TABLE store_campaign_stats (
  store_id TEXT NOT NULL REFERENCES stores(id),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  report_count INTEGER NOT NULL DEFAULT 0,
  total_panel_draws INTEGER NOT NULL DEFAULT 0,
  total_panel_wins INTEGER NOT NULL DEFAULT 0,
  total_mobile_draws INTEGER NOT NULL DEFAULT 0,
  total_mobile_wins INTEGER NOT NULL DEFAULT 0,
  total_prize_count INTEGER NOT NULL DEFAULT 0,
  total_unknown_prizes INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT,
  PRIMARY KEY (store_id, campaign_id)
);

CREATE TABLE store_campaign_prize_stats (
  store_id TEXT NOT NULL REFERENCES stores(id),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  prize_category_id TEXT NOT NULL REFERENCES prize_categories(id),
  reported_quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT,
  PRIMARY KEY (store_id, campaign_id, prize_category_id)
);

CREATE TABLE rate_limits (
  visitor_hash TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  submission_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_stores_active_prefecture_name ON stores(active, prefecture, name);
CREATE INDEX idx_campaigns_published_dates ON campaigns(published, starts_on, ends_on);
CREATE INDEX idx_prize_categories_campaign_order ON prize_categories(campaign_id, active, sort_order);
CREATE INDEX idx_reports_store_campaign_created ON reports(store_id, campaign_id, created_at DESC) WHERE status = 'active';
CREATE INDEX idx_reports_campaign_status ON reports(campaign_id, status);
CREATE INDEX idx_report_prizes_category ON report_prizes(prize_category_id);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_started_at);

PRAGMA optimize;
