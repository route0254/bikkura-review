PRAGMA foreign_keys = ON;

-- 既存報告を絵柄へ割り当てない。親報告・既存VIEW・既存数量をそのまま保持。
CREATE TABLE benefit_items (
  id TEXT PRIMARY KEY,
  benefit_id TEXT NOT NULL REFERENCES benefit_campaigns(id),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  image_asset TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (benefit_id, slug),
  UNIQUE (id, benefit_id)
);
CREATE INDEX idx_benefit_items_master ON benefit_items(benefit_id, active, sort_order);
CREATE UNIQUE INDEX idx_benefit_report_campaign_fk ON benefit_reports(id, benefit_id);
ALTER TABLE benefit_reports ADD COLUMN risk_reasons TEXT NOT NULL DEFAULT '[]';

CREATE TABLE benefit_report_items (
  report_id TEXT NOT NULL,
  benefit_id TEXT NOT NULL,
  benefit_item_id TEXT NOT NULL,
  availability TEXT NOT NULL CHECK (availability IN ('available', 'unavailable', 'unknown')),
  observation_type TEXT NOT NULL CHECK (observation_type IN ('received', 'store_notice', 'observed')),
  received_quantity INTEGER CHECK (received_quantity IS NULL OR (
    availability = 'available' AND observation_type = 'received' AND received_quantity BETWEEN 1 AND 300
  )),
  CHECK (observation_type != 'received' OR availability = 'available'),
  PRIMARY KEY (report_id, benefit_item_id),
  FOREIGN KEY (report_id, benefit_id) REFERENCES benefit_reports(id, benefit_id),
  FOREIGN KEY (benefit_item_id, benefit_id) REFERENCES benefit_items(id, benefit_id)
);
CREATE INDEX idx_benefit_report_item ON benefit_report_items(benefit_item_id, report_id);
CREATE INDEX idx_benefit_actor_recent ON benefit_reports(abuse_hash, created_at DESC) WHERE abuse_hash IS NOT NULL;

-- item_id NULL は従来の特典全体報告。新しい親の unknown は公開集計へ混ぜない。
-- 親の status と withdrawal が全絵柄に一括適用される。
CREATE VIEW public_benefit_observations AS
SELECT r.id AS report_id, r.store_id, r.benefit_id, i.benefit_item_id,
  i.availability, i.observation_type, i.received_quantity, r.observed_at, r.created_at
FROM active_benefit_reports r JOIN benefit_report_items i ON i.report_id = r.id
JOIN benefit_items m ON m.id = i.benefit_item_id AND m.active = 1
UNION ALL
SELECT r.id, r.store_id, r.benefit_id, NULL, r.availability,
  NULL, r.received_quantity, r.observed_at, r.created_at
FROM active_benefit_reports r
WHERE NOT EXISTS (SELECT 1 FROM benefit_report_items i WHERE i.report_id = r.id);

PRAGMA optimize;
