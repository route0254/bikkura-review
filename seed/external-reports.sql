-- seed/external-reports.json から生成。手動編集しないでください。
PRAGMA foreign_keys = ON;

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, note_internal, status, created_at, updated_at
) VALUES (
  'external-20260821-funabashi-face-x', 'external', 'kura-648', 'chiikawa-kurasushi-2026-summer', '2026-08-21', NULL,
  'x', NULL, '2026-09-03', 'A',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  14, 'exact', '景品総数とフィギュア0個を確認。その他カテゴリの内訳は不明。', 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-20260821-funabashi-face-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-20260821-funabashi-face-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-funabashi-face-x', 'chiikawa-2026-figure', 0, 'exact', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, note_internal, status, created_at, updated_at
) VALUES (
  'external-20260823-makuhari-x', 'external', 'kura-602', 'chiikawa-kurasushi-2026-summer', '2026-08-23', NULL,
  'x', NULL, '2026-09-03', 'A',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  7, 'exact', '景品総数とフィギュア数を確認。その他カテゴリの内訳は不明。', 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-20260823-makuhari-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-20260823-makuhari-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260823-makuhari-x', 'chiikawa-2026-figure', 3, 'exact', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, note_internal, status, created_at, updated_at
) VALUES (
  'external-20260821-namba-sennichimae-x', 'external', 'kura-660', 'chiikawa-kurasushi-2026-summer', '2026-08-21', NULL,
  'x', NULL, '2026-09-03', 'A',
  'complete', 'unknown', NULL, NULL, NULL, NULL,
  9, 'exact', '景品総数、全カテゴリ数、記載された個別景品数が一致。', 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-20260821-namba-sennichimae-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-20260821-namba-sennichimae-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-namba-sennichimae-x', 'chiikawa-2026-figure', 0, 'exact', 'unknown');
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-namba-sennichimae-x', 'chiikawa-2026-can-badge', 3, 'exact', 'unknown');
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-namba-sennichimae-x', 'chiikawa-2026-acrylic-magnet', 6, 'exact', 'unknown');
INSERT INTO external_report_items (external_report_id, prize_category_id, prize_item_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-namba-sennichimae-x', 'chiikawa-2026-can-badge', 'chiikawa-2026-can-badge-usagi', 1, 'exact', 'unknown');
INSERT INTO external_report_items (external_report_id, prize_category_id, prize_item_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-namba-sennichimae-x', 'chiikawa-2026-can-badge', 'chiikawa-2026-can-badge-momonga', 1, 'exact', 'unknown');
INSERT INTO external_report_items (external_report_id, prize_category_id, prize_item_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-namba-sennichimae-x', 'chiikawa-2026-can-badge', 'chiikawa-2026-can-badge-anoko', 1, 'exact', 'unknown');
INSERT INTO external_report_items (external_report_id, prize_category_id, prize_item_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-namba-sennichimae-x', 'chiikawa-2026-acrylic-magnet', 'chiikawa-2026-acrylic-magnet-chiikawa', 1, 'exact', 'unknown');
INSERT INTO external_report_items (external_report_id, prize_category_id, prize_item_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-namba-sennichimae-x', 'chiikawa-2026-acrylic-magnet', 'chiikawa-2026-acrylic-magnet-usagi', 2, 'exact', 'unknown');
INSERT INTO external_report_items (external_report_id, prize_category_id, prize_item_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-namba-sennichimae-x', 'chiikawa-2026-acrylic-magnet', 'chiikawa-2026-acrylic-magnet-momonga', 1, 'exact', 'unknown');
INSERT INTO external_report_items (external_report_id, prize_category_id, prize_item_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-namba-sennichimae-x', 'chiikawa-2026-acrylic-magnet', 'chiikawa-2026-acrylic-magnet-rakko', 1, 'exact', 'unknown');
INSERT INTO external_report_items (external_report_id, prize_category_id, prize_item_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-namba-sennichimae-x', 'chiikawa-2026-acrylic-magnet', 'chiikawa-2026-acrylic-magnet-shisa', 1, 'exact', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, note_internal, status, created_at, updated_at
) VALUES (
  'external-before-20260903-koiwa-x', 'external', 'kura-560', 'chiikawa-kurasushi-2026-summer', NULL, '2026年9月3日以前',
  'x', NULL, '2026-09-03', 'A',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  10, 'exact', '候補記載の小岩店を現行店舗マスタの小岩駅前店へ紐付け。来店日は確認できず。景品総数とフィギュア0個を確認。', 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-before-20260903-koiwa-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-before-20260903-koiwa-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-before-20260903-koiwa-x', 'chiikawa-2026-figure', 0, 'exact', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, note_internal, status, created_at, updated_at
) VALUES (
  'external-20260821-kitamoto-tabelog-1', 'external', 'kura-87', 'chiikawa-kurasushi-2026-summer', '2026-08-21', NULL,
  'tabelog', NULL, '2026-09-03', 'B',
  'partial', 'plus', NULL, NULL, NULL, NULL,
  NULL, 'unknown', 'プラス利用とフィギュア1個を確認。景品総数は不明。', 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-20260821-kitamoto-tabelog-1';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-20260821-kitamoto-tabelog-1';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-kitamoto-tabelog-1', 'chiikawa-2026-figure', 1, 'at_least', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, note_internal, status, created_at, updated_at
) VALUES (
  'external-around-20260823-kitamoto-tabelog-2', 'external', 'kura-87', 'chiikawa-kurasushi-2026-summer', NULL, '2026年8月23日頃',
  'tabelog', NULL, '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  NULL, 'unknown', '景品があったこととフィギュア0個を確認。景品総数と正確な来店日は不明。', 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-around-20260823-kitamoto-tabelog-2';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-around-20260823-kitamoto-tabelog-2';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-around-20260823-kitamoto-tabelog-2', 'chiikawa-2026-figure', 0, 'exact', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, note_internal, status, created_at, updated_at
) VALUES (
  'external-202608-ikebukuro-west-tabelog', 'external', 'kura-601', 'chiikawa-kurasushi-2026-summer', NULL, '2026年8月',
  'tabelog', NULL, '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  NULL, 'unknown', 'ビッくらポン挑戦4回の記載あり。抽選経路・当たり数は推定せず、フィギュア1個以上のみ採用。', 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-202608-ikebukuro-west-tabelog';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-202608-ikebukuro-west-tabelog';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-202608-ikebukuro-west-tabelog', 'chiikawa-2026-figure', 1, 'at_least', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, note_internal, status, created_at, updated_at
) VALUES (
  'external-202608-iruma-tabelog', 'external', 'kura-86', 'chiikawa-kurasushi-2026-summer', NULL, '2026年8月',
  'tabelog', NULL, '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  NULL, 'unknown', 'カプセル付きメニュー由来の可能性あり。通常抽選とは断定しない。', 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-202608-iruma-tabelog';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-202608-iruma-tabelog';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-202608-iruma-tabelog', 'chiikawa-2026-figure', 1, 'at_least', 'unknown');
INSERT INTO external_report_items (external_report_id, prize_category_id, prize_item_id, quantity, quantity_kind, acquisition_type) VALUES ('external-202608-iruma-tabelog', 'chiikawa-2026-figure', 'chiikawa-2026-figure-chiikawa', 1, 'at_least', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, note_internal, status, created_at, updated_at
) VALUES (
  'external-before-20260831-sakura-shukugawa-x', 'external', 'kura-287', 'chiikawa-kurasushi-2026-summer', NULL, '2026年8月末以前',
  'x', NULL, '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  NULL, 'unknown', '利用金額約15,000円の記載あり。景品数は推定せず、フィギュア0個のみ採用。', 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-before-20260831-sakura-shukugawa-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-before-20260831-sakura-shukugawa-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-before-20260831-sakura-shukugawa-x', 'chiikawa-2026-figure', 0, 'exact', 'unknown');

PRAGMA optimize;
