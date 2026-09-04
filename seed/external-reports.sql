-- seed/external-reports.json から生成。手動編集しないでください。
PRAGMA foreign_keys = ON;

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-20260821-funabashi-face-x', 'external', 'kura-648', 'chiikawa-kurasushi-2026-summer', '2026-08-21', NULL,
  'x', 'https://x.com/9ri_man10_/status/2094990109154394527', '2026-09-03', 'A',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  14, 'exact', NULL, 'unknown',
  '景品総数とフィギュア0個を確認。その他カテゴリの内訳は不明。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-20260821-funabashi-face-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-20260821-funabashi-face-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-funabashi-face-x', 'chiikawa-2026-figure', 0, 'exact', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-20260823-makuhari-x', 'external', 'kura-602', 'chiikawa-kurasushi-2026-summer', '2026-08-23', NULL,
  'x', 'https://x.com/chocomon174/status/2095064539217924366', '2026-09-03', 'A',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  7, 'exact', NULL, 'unknown',
  '景品総数とフィギュア数を確認。その他カテゴリの内訳は不明。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-20260823-makuhari-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-20260823-makuhari-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260823-makuhari-x', 'chiikawa-2026-figure', 3, 'exact', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-20260821-namba-sennichimae-x', 'external', 'kura-660', 'chiikawa-kurasushi-2026-summer', '2026-08-21', NULL,
  'x', 'https://x.com/champ_sakasame/status/2090755652310421610', '2026-09-03', 'A',
  'complete', 'unknown', NULL, NULL, NULL, NULL,
  9, 'exact', NULL, 'unknown',
  '景品総数、全カテゴリ数、記載された個別景品数が一致。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
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
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-before-20260903-koiwa-x', 'external', 'kura-560', 'chiikawa-kurasushi-2026-summer', NULL, '2026年9月3日以前',
  'x', NULL, '2026-09-03', 'A',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  10, 'exact', NULL, 'unknown',
  '候補記載の小岩店を現行店舗マスタの小岩駅前店へ紐付け。来店日は確認できず。景品総数とフィギュア0個を確認。', 'hidden', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-before-20260903-koiwa-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-before-20260903-koiwa-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-before-20260903-koiwa-x', 'chiikawa-2026-figure', 0, 'exact', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-20260821-kitamoto-tabelog-1', 'external', 'kura-87', 'chiikawa-kurasushi-2026-summer', '2026-08-21', NULL,
  'tabelog', 'https://tabelog.com/saitama/A1104/A110401/11003850/dtlrvwlst/B534148199/#240870790', '2026-09-03', 'B',
  'partial', 'plus', NULL, NULL, NULL, NULL,
  NULL, 'unknown', NULL, 'unknown',
  'プラス利用とフィギュア1個を確認。景品総数は不明。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-20260821-kitamoto-tabelog-1';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-20260821-kitamoto-tabelog-1';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-kitamoto-tabelog-1', 'chiikawa-2026-figure', 1, 'at_least', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-around-20260823-kitamoto-tabelog-2', 'external', 'kura-87', 'chiikawa-kurasushi-2026-summer', NULL, '2026年8月23日頃',
  'tabelog', 'https://tabelog.com/saitama/A1104/A110401/11003850/dtlrvwlst/B534148199/#241084572', '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  NULL, 'unknown', NULL, 'unknown',
  '景品があったこととフィギュア0個を確認。景品総数と正確な来店日は不明。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-around-20260823-kitamoto-tabelog-2';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-around-20260823-kitamoto-tabelog-2';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-around-20260823-kitamoto-tabelog-2', 'chiikawa-2026-figure', 0, 'exact', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-202608-ikebukuro-west-tabelog', 'external', 'kura-601', 'chiikawa-kurasushi-2026-summer', NULL, '2026年8月',
  'tabelog', 'https://tabelog.com/tokyo/A1305/A130501/13273029/dtlrvwlst/B534550228/', '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  NULL, 'unknown', NULL, 'unknown',
  'ビッくらポン挑戦4回の記載あり。抽選経路・当たり数は推定せず、フィギュア1個以上のみ採用。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-202608-ikebukuro-west-tabelog';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-202608-ikebukuro-west-tabelog';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-202608-ikebukuro-west-tabelog', 'chiikawa-2026-figure', 1, 'at_least', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-202608-iruma-tabelog', 'external', 'kura-86', 'chiikawa-kurasushi-2026-summer', NULL, '2026年8月',
  'tabelog', 'https://tabelog.com/saitama/A1106/A110602/11020322/dtlrvwlst/B534176810/', '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  NULL, 'unknown', NULL, 'unknown',
  'カプセル付きメニュー由来の可能性あり。通常抽選とは断定しない。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-202608-iruma-tabelog';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-202608-iruma-tabelog';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-202608-iruma-tabelog', 'chiikawa-2026-figure', 1, 'at_least', 'guaranteed');
INSERT INTO external_report_items (external_report_id, prize_category_id, prize_item_id, quantity, quantity_kind, acquisition_type) VALUES ('external-202608-iruma-tabelog', 'chiikawa-2026-figure', 'chiikawa-2026-figure-chiikawa', 1, 'at_least', 'guaranteed');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-before-20260831-sakura-shukugawa-x', 'external', 'kura-287', 'chiikawa-kurasushi-2026-summer', NULL, '2026年8月末以前',
  'x', 'https://x.com/MiusanSV/status/2094797470735933797', '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  NULL, 'unknown', 15000, 'approx',
  '利用金額約15,000円の記載あり。景品数は推定せず、フィギュア0個のみ採用。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-before-20260831-sakura-shukugawa-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-before-20260831-sakura-shukugawa-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-before-20260831-sakura-shukugawa-x', 'chiikawa-2026-figure', 0, 'exact', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-before-20260830-ebina-x', 'external', 'kura-118', 'chiikawa-kurasushi-2026-summer', NULL, '2026年8月30日以前',
  'x', 'https://x.com/pikomarochan/status/2093760471254069312', '2026-09-03', 'A',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  5, 'exact', 5000, 'approx',
  '利用金額約5,000円、景品5個、フィギュア0個を確認。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-before-20260830-ebina-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-before-20260830-ebina-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-before-20260830-ebina-x', 'chiikawa-2026-figure', 0, 'exact', 'draw');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-before-20260902-kochi-inter-x', 'external', 'kura-62', 'chiikawa-kurasushi-2026-summer', NULL, '2026年9月2日以前（2回来店）',
  'x', 'https://x.com/mimoza_meerS2/status/2095014623980498982', '2026-09-03', 'B',
  'partial', 'plus', NULL, NULL, NULL, NULL,
  NULL, 'unknown', 15000, 'approx',
  '初回約9,000円と別日約6,000円の2回来店。いずれもフィギュア0個、別日は缶バッジ1個・マグネット2個。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-before-20260902-kochi-inter-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-before-20260902-kochi-inter-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-before-20260902-kochi-inter-x', 'chiikawa-2026-figure', 0, 'exact', 'draw');
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-before-20260902-kochi-inter-x', 'chiikawa-2026-can-badge', 1, 'at_least', 'draw');
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-before-20260902-kochi-inter-x', 'chiikawa-2026-acrylic-magnet', 2, 'at_least', 'draw');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-202608-namba-sennichimae-tabelog-guaranteed', 'external', 'kura-660', 'chiikawa-kurasushi-2026-summer', NULL, '2026年8月',
  'tabelog', 'https://tabelog.com/osaka/A2701/A270202/27156588/dtlrvwlst/B534339067/?photo_count_per_review=1&smp=1&use_type=0', '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  NULL, 'unknown', NULL, 'unknown',
  'ビッくらポン付きメニュー由来のフィギュア1個以上。抽選景品とは扱わない。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-202608-namba-sennichimae-tabelog-guaranteed';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-202608-namba-sennichimae-tabelog-guaranteed';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-202608-namba-sennichimae-tabelog-guaranteed', 'chiikawa-2026-figure', 1, 'at_least', 'guaranteed');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-202608-yokohama-shinyamashita-tabelog', 'external', 'kura-503', 'chiikawa-kurasushi-2026-summer', NULL, '2026年8月',
  'tabelog', 'https://tabelog.com/kanagawa/A1401/A140105/14073498/dtlrvwlst/B534136726/', '2026-09-03', 'A',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  6, 'exact', 6000, 'at_least',
  '利用金額6,000円強。抽選15回、ちいかわ景品6個を確認。抽選方式の内訳は不明。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-202608-yokohama-shinyamashita-tabelog';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-202608-yokohama-shinyamashita-tabelog';

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-202608-nishishinjuku-tabelog', 'external', 'kura-558', 'chiikawa-kurasushi-2026-summer', NULL, '2026年8月',
  'tabelog', 'https://tabelog.com/tokyo/A1304/A130401/13254943/dtlrvwlst/B534517167/', '2026-09-03', 'A',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  7, 'exact', 6000, 'at_least',
  '2人で6,000円以上を利用し、7回当たった記載を確認。カテゴリ内訳は不明。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-202608-nishishinjuku-tabelog';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-202608-nishishinjuku-tabelog';

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-202608-narimasu-tabelog', 'external', 'kura-640', 'chiikawa-kurasushi-2026-summer', NULL, '2026年8月',
  'tabelog', 'https://tabelog.com/tokyo/A1322/A132204/13295786/dtlrvwlst/B534300494/', '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  4, 'at_least', NULL, 'unknown',
  '戦利品から缶バッジ1・マグネット2を採用。マスコット1はカテゴリ表現が一致しないため個別カテゴリへ推測登録しない。巾着は除外。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-202608-narimasu-tabelog';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-202608-narimasu-tabelog';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-202608-narimasu-tabelog', 'chiikawa-2026-can-badge', 1, 'exact', 'unknown');
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-202608-narimasu-tabelog', 'chiikawa-2026-acrylic-magnet', 2, 'exact', 'unknown');
INSERT INTO external_report_items (external_report_id, prize_category_id, prize_item_id, quantity, quantity_kind, acquisition_type) VALUES ('external-202608-narimasu-tabelog', 'chiikawa-2026-can-badge', 'chiikawa-2026-can-badge-hachiware', 1, 'exact', 'unknown');
INSERT INTO external_report_items (external_report_id, prize_category_id, prize_item_id, quantity, quantity_kind, acquisition_type) VALUES ('external-202608-narimasu-tabelog', 'chiikawa-2026-acrylic-magnet', 'chiikawa-2026-acrylic-magnet-usagi', 1, 'exact', 'unknown');
INSERT INTO external_report_items (external_report_id, prize_category_id, prize_item_id, quantity, quantity_kind, acquisition_type) VALUES ('external-202608-narimasu-tabelog', 'chiikawa-2026-acrylic-magnet', 'chiikawa-2026-acrylic-magnet-rakko', 1, 'exact', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-202608-toyonaka-kasugacho-tabelog', 'external', 'kura-573', 'chiikawa-kurasushi-2026-summer', NULL, '2026年8月',
  'tabelog', 'https://tabelog.com/osaka/A2706/A270601/27124700/dtlrvwlst/B534485528/', '2026-09-03', 'B',
  'partial', 'plus', NULL, NULL, NULL, NULL,
  2, 'at_least', NULL, 'unknown',
  'はずれ2回・あたり1回の並びが少なくとも2巡した記載から、当たり2個以上のみ採用。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-202608-toyonaka-kasugacho-tabelog';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-202608-toyonaka-kasugacho-tabelog';

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-202608-sapporo-hiraoka-tabelog', 'external', 'kura-622', 'chiikawa-kurasushi-2026-summer', NULL, '2026年8月',
  'tabelog', 'https://tabelog.com/hokkaido/A0101/A010304/1073356/dtlrvwlst/#241235432', '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  1, 'at_least', NULL, 'unknown',
  'ビッくらポンでうさぎのマグネット1個以上を確認。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-202608-sapporo-hiraoka-tabelog';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-202608-sapporo-hiraoka-tabelog';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-202608-sapporo-hiraoka-tabelog', 'chiikawa-2026-acrylic-magnet', 1, 'at_least', 'draw');
INSERT INTO external_report_items (external_report_id, prize_category_id, prize_item_id, quantity, quantity_kind, acquisition_type) VALUES ('external-202608-sapporo-hiraoka-tabelog', 'chiikawa-2026-acrylic-magnet', 'chiikawa-2026-acrylic-magnet-usagi', 1, 'at_least', 'draw');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-20260822-chiba-ekimae-x', 'external', 'kura-614', 'chiikawa-kurasushi-2026-summer', '2026-08-22', NULL,
  'x', 'https://x.com/hamami_129/status/2095355338199621986', '2026-09-03', 'A',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  11, 'exact', NULL, 'unknown',
  '8月22日の来店、景品11個、フィギュア0個を確認。その他カテゴリの内訳は不明。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-20260822-chiba-ekimae-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-20260822-chiba-ekimae-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260822-chiba-ekimae-x', 'chiikawa-2026-figure', 0, 'exact', 'draw');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-first-saturday-202608-asakusa-rox-x', 'external', 'kura-530', 'chiikawa-kurasushi-2026-summer', NULL, 'キャンペーン初週の土曜日',
  'x', 'https://x.com/Ralphilia/status/2095473836586328305', '2026-09-03', 'A',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  8, 'exact', NULL, 'unknown',
  '景品8個、フィギュア0個を確認。投稿内の通称だけでは残りの正式カテゴリを断定できないため未登録。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-first-saturday-202608-asakusa-rox-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-first-saturday-202608-asakusa-rox-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-first-saturday-202608-asakusa-rox-x', 'chiikawa-2026-figure', 0, 'exact', 'draw');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-20260824-utsunomiya-interpark-x', 'external', 'kura-242', 'chiikawa-kurasushi-2026-summer', '2026-08-24', NULL,
  'x', 'https://x.com/wY14886/status/2095298388757762263', '2026-09-03', 'A',
  'partial', 'plus', NULL, NULL, NULL, NULL,
  11, 'exact', 11000, 'approx',
  '8月24日夜、約11,000円、確率アップ利用、景品11個、フィギュア0個を確認。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-20260824-utsunomiya-interpark-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-20260824-utsunomiya-interpark-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260824-utsunomiya-interpark-x', 'chiikawa-2026-figure', 0, 'exact', 'draw');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-before-20260903-furesupo-sumiyoshi-x', 'external', 'kura-546', 'chiikawa-kurasushi-2026-summer', NULL, '2026年9月3日以前',
  'x', 'https://x.com/guitargenjin/status/2095282608599089309', '2026-09-03', 'A',
  'complete', 'unknown', NULL, NULL, NULL, NULL,
  4, 'exact', NULL, 'unknown',
  '景品4個の内訳として、フィギュア1個、缶バッジ2個、アクリルマグネット1個を確認。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-before-20260903-furesupo-sumiyoshi-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-before-20260903-furesupo-sumiyoshi-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-before-20260903-furesupo-sumiyoshi-x', 'chiikawa-2026-figure', 1, 'exact', 'unknown');
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-before-20260903-furesupo-sumiyoshi-x', 'chiikawa-2026-can-badge', 2, 'exact', 'unknown');
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-before-20260903-furesupo-sumiyoshi-x', 'chiikawa-2026-acrylic-magnet', 1, 'exact', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-before-20260903-nagoya-sakae-x', 'external', 'kura-571', 'chiikawa-kurasushi-2026-summer', NULL, '2026年9月3日以前',
  'x', 'https://x.com/ama_n4/status/2095193042936607143', '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  NULL, 'unknown', 8000, 'approx',
  '約8,000円利用、フィギュア0個を確認。隣席の結果はこのデータへ含めていない。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-before-20260903-nagoya-sakae-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-before-20260903-nagoya-sakae-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-before-20260903-nagoya-sakae-x', 'chiikawa-2026-figure', 0, 'exact', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-before-20260902-iwakuni-x', 'external', 'kura-382', 'chiikawa-kurasushi-2026-summer', NULL, '2026年9月2日以前',
  'x', 'https://x.com/saiii128/status/2095164782282449275', '2026-09-03', 'A',
  'partial', 'plus', NULL, NULL, NULL, NULL,
  12, 'exact', 12000, 'exact',
  '12,000円、確率アップ利用、景品12個、抽選フィギュア2個を確認。確約セット由来の缶バッジ4個を含むが、抽選分を含めた缶バッジ総数は不明なので4個以上。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-before-20260902-iwakuni-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-before-20260902-iwakuni-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-before-20260902-iwakuni-x', 'chiikawa-2026-figure', 2, 'exact', 'draw');
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-before-20260902-iwakuni-x', 'chiikawa-2026-can-badge', 4, 'at_least', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-20260821-ikebukuro-west-x-photo', 'external', 'kura-601', 'chiikawa-kurasushi-2026-summer', '2026-08-21', NULL,
  'x', 'https://x.com/mabochandayo4/status/2095357184628728001', '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  NULL, 'unknown', 8000, 'at_least',
  '8月21日、8,000円以上利用を確認。結果写真はあるが全景品が写っているとは断定できず、フィギュア数・景品総数とも不明。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-20260821-ikebukuro-west-x-photo';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-20260821-ikebukuro-west-x-photo';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-ikebukuro-west-x-photo', 'chiikawa-2026-figure', NULL, 'unknown', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-20260821-ikebukuro-sunshine-x-guaranteed', 'external', 'kura-476', 'chiikawa-kurasushi-2026-summer', '2026-08-21', NULL,
  'x', 'https://x.com/akatokiha/status/2095082458224218306', '2026-09-03', 'A',
  'complete', 'unknown', NULL, NULL, NULL, NULL,
  3, 'exact', NULL, 'unknown',
  '初日の持ち帰り確約セット3個。うさぎのフィギュア1個と缶バッジ2個を確認。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-20260821-ikebukuro-sunshine-x-guaranteed';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-20260821-ikebukuro-sunshine-x-guaranteed';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-ikebukuro-sunshine-x-guaranteed', 'chiikawa-2026-figure', 1, 'exact', 'guaranteed');
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-ikebukuro-sunshine-x-guaranteed', 'chiikawa-2026-can-badge', 2, 'exact', 'guaranteed');
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-ikebukuro-sunshine-x-guaranteed', 'chiikawa-2026-acrylic-magnet', 0, 'exact', 'guaranteed');
INSERT INTO external_report_items (external_report_id, prize_category_id, prize_item_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-ikebukuro-sunshine-x-guaranteed', 'chiikawa-2026-figure', 'chiikawa-2026-figure-usagi', 1, 'exact', 'guaranteed');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-20260821-ginza-x-guaranteed', 'external', 'kura-641', 'chiikawa-kurasushi-2026-summer', '2026-08-21', NULL,
  'x', 'https://x.com/rytrnys/status/2095360833115291934', '2026-09-03', 'A',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  4, 'exact', NULL, 'unknown',
  'キャンペーン開始日の店舗受取で確約景品4個。3カテゴリが各1個以上含まれることを確認。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-20260821-ginza-x-guaranteed';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-20260821-ginza-x-guaranteed';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-ginza-x-guaranteed', 'chiikawa-2026-figure', 1, 'at_least', 'guaranteed');
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-ginza-x-guaranteed', 'chiikawa-2026-can-badge', 1, 'at_least', 'guaranteed');
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260821-ginza-x-guaranteed', 'chiikawa-2026-acrylic-magnet', 1, 'at_least', 'guaranteed');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-20260825-ibaraki-koga-x', 'external', 'kura-410', 'chiikawa-kurasushi-2026-summer', '2026-08-25', NULL,
  'x', 'https://x.com/Ripley2001/status/2095357381891047467', '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  NULL, 'unknown', NULL, 'unknown',
  '8月25日の来店でフィギュア1個以上を確認。景品総数とその他内訳、取得方法は不明。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-20260825-ibaraki-koga-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-20260825-ibaraki-koga-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260825-ibaraki-koga-x', 'chiikawa-2026-figure', 1, 'at_least', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-20260822-ikebukuro-west-x-balanced', 'external', 'kura-601', 'chiikawa-kurasushi-2026-summer', NULL, '2026年8月22日以前',
  'x', 'https://x.com/MonMkr/status/2095352979251732626', '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  NULL, 'unknown', 18000, 'exact',
  '4人で18,000円利用し、3カテゴリが各1個以上含まれたことを確認。8月22日の来店報告を引用しているが、来店日と抽選・確約の別は断定しない。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-20260822-ikebukuro-west-x-balanced';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-20260822-ikebukuro-west-x-balanced';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260822-ikebukuro-west-x-balanced', 'chiikawa-2026-figure', 1, 'at_least', 'unknown');
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260822-ikebukuro-west-x-balanced', 'chiikawa-2026-can-badge', 1, 'at_least', 'unknown');
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-20260822-ikebukuro-west-x-balanced', 'chiikawa-2026-acrylic-magnet', 1, 'at_least', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-before-20260903-utsunomiya-tsuruta-x', 'external', 'kura-393', 'chiikawa-kurasushi-2026-summer', NULL, '2026年9月3日以前',
  'x', 'https://x.com/yukitoshirotama/status/2095360702756299175', '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  NULL, 'unknown', NULL, 'unknown',
  '複数の景品箱から受け取り、フィギュア0個だったことを確認。景品総数と取得方法は不明。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-before-20260903-utsunomiya-tsuruta-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-before-20260903-utsunomiya-tsuruta-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-before-20260903-utsunomiya-tsuruta-x', 'chiikawa-2026-figure', 0, 'exact', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-before-20260903-chofu-ekimae-x', 'external', 'kura-585', 'chiikawa-kurasushi-2026-summer', NULL, '2026年9月3日以前',
  'x', 'https://x.com/pupupulandkamui/status/2095264803396972889', '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  NULL, 'unknown', NULL, 'unknown',
  'フィギュア1個以上を確認。景品総数とその他内訳、取得方法は不明。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-before-20260903-chofu-ekimae-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-before-20260903-chofu-ekimae-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-before-20260903-chofu-ekimae-x', 'chiikawa-2026-figure', 1, 'at_least', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-before-20260902-nishishinjuku-x', 'external', 'kura-558', 'chiikawa-kurasushi-2026-summer', NULL, '2026年9月2日以前',
  'x', 'https://x.com/nya50_250/status/2095072000020779143', '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  NULL, 'unknown', NULL, 'unknown',
  'フィギュアが複数出た旨を確認。安全側に1個以上として登録。景品総数と取得方法は不明。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-before-20260902-nishishinjuku-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-before-20260902-nishishinjuku-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-before-20260902-nishishinjuku-x', 'chiikawa-2026-figure', 1, 'at_least', 'unknown');

INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, spend_amount_yen, spend_amount_kind,
  note_internal, status, created_at, updated_at
) VALUES (
  'external-before-20260903-ikebukuro-west-x', 'external', 'kura-601', 'chiikawa-kurasushi-2026-summer', NULL, '2026年9月3日以前',
  'x', 'https://x.com/match650/status/2095460370743959639', '2026-09-03', 'B',
  'partial', 'unknown', NULL, NULL, NULL, NULL,
  NULL, 'unknown', NULL, 'unknown',
  'フィギュア1個以上を確認。景品総数とその他内訳は不明。', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  spend_amount_yen=excluded.spend_amount_yen, spend_amount_kind=excluded.spend_amount_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;
DELETE FROM external_report_items WHERE external_report_id = 'external-before-20260903-ikebukuro-west-x';
DELETE FROM external_report_prizes WHERE external_report_id = 'external-before-20260903-ikebukuro-west-x';
INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES ('external-before-20260903-ikebukuro-west-x', 'chiikawa-2026-figure', 1, 'at_least', 'draw');

PRAGMA optimize;
