import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const reports = JSON.parse(await readFile(new URL("seed/external-reports.json", root), "utf8"));
const outputUrl = new URL("seed/external-reports.sql", root);
const quote = (value) => value === null || value === undefined ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;
const sql = ["-- seed/external-reports.json から生成。手動編集しないでください。", "PRAGMA foreign_keys = ON;", ""];

for (const report of reports) {
  sql.push(`INSERT INTO external_reports (
  id, source_type, store_id, campaign_id, visit_date, visit_date_label,
  external_platform, external_url, external_observed_at, evidence_quality,
  result_precision, usage_type, panel_draws, panel_wins, mobile_draws, mobile_wins,
  total_prizes, total_prizes_kind, note_internal, status, created_at, updated_at
) VALUES (
  ${quote(report.id)}, 'external', ${quote(report.storeId)}, ${quote(report.campaignId)}, ${quote(report.visitDate)}, ${quote(report.visitDateLabel)},
  ${quote(report.externalPlatform)}, ${quote(report.externalUrl)}, ${quote(report.externalObservedAt)}, ${quote(report.evidenceQuality)},
  ${quote(report.resultPrecision)}, ${quote(report.usageType)}, ${report.panelDraws ?? "NULL"}, ${report.panelWins ?? "NULL"}, ${report.mobileDraws ?? "NULL"}, ${report.mobileWins ?? "NULL"},
  ${report.totalPrizes ?? "NULL"}, ${quote(report.totalPrizesKind)}, ${quote(report.noteInternal)}, ${quote(report.status)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  source_type='external', store_id=excluded.store_id, campaign_id=excluded.campaign_id,
  visit_date=excluded.visit_date, visit_date_label=excluded.visit_date_label,
  external_platform=excluded.external_platform, external_url=excluded.external_url,
  external_observed_at=excluded.external_observed_at, evidence_quality=excluded.evidence_quality,
  result_precision=excluded.result_precision, usage_type=excluded.usage_type,
  panel_draws=excluded.panel_draws, panel_wins=excluded.panel_wins,
  mobile_draws=excluded.mobile_draws, mobile_wins=excluded.mobile_wins,
  total_prizes=excluded.total_prizes, total_prizes_kind=excluded.total_prizes_kind,
  note_internal=excluded.note_internal, status=excluded.status, updated_at=CURRENT_TIMESTAMP;`);
  sql.push(`DELETE FROM external_report_items WHERE external_report_id = ${quote(report.id)};`);
  sql.push(`DELETE FROM external_report_prizes WHERE external_report_id = ${quote(report.id)};`);
  for (const prize of report.prizes) {
    sql.push(`INSERT INTO external_report_prizes (external_report_id, prize_category_id, quantity, quantity_kind, acquisition_type) VALUES (${quote(report.id)}, ${quote(prize.prizeCategoryId)}, ${prize.quantity ?? "NULL"}, ${quote(prize.quantityKind)}, ${quote(prize.acquisitionType ?? "unknown")});`);
  }
  for (const item of report.items) {
    sql.push(`INSERT INTO external_report_items (external_report_id, prize_category_id, prize_item_id, quantity, quantity_kind, acquisition_type) VALUES (${quote(report.id)}, ${quote(item.prizeCategoryId)}, ${quote(item.prizeItemId)}, ${item.quantity}, ${quote(item.quantityKind)}, ${quote(item.acquisitionType ?? "unknown")});`);
  }
  sql.push("");
}

sql.push("PRAGMA optimize;", "");
const next = sql.join("\n");
const checkOnly = process.argv.includes("--check");
if (checkOnly) {
  const current = await readFile(outputUrl, "utf8").catch(() => "");
  if (current !== next) {
    console.error("seed/external-reports.sql が seed/external-reports.json と一致しません。pnpm run seed:external を実行してください");
    process.exitCode = 1;
  } else {
    console.log("external seed: JSONと一致しています");
  }
} else {
  await writeFile(outputUrl, next, "utf8");
  console.log("seed/external-reports.sql を更新しました");
}
