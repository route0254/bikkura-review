PRAGMA foreign_keys = ON;

ALTER TABLE external_reports
ADD COLUMN spend_amount_yen INTEGER
CHECK (spend_amount_yen IS NULL OR spend_amount_yen BETWEEN 0 AND 1000000);

ALTER TABLE external_reports
ADD COLUMN spend_amount_kind TEXT NOT NULL DEFAULT 'unknown'
CHECK (spend_amount_kind IN ('exact', 'approx', 'at_least', 'unknown'));

PRAGMA optimize;
