import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("0006は既存投稿テーブルを再構築しない追加型migrationである", async () => {
  const sql = await readFile(new URL("../../migrations/0006_acquisition_and_withdrawal.sql", import.meta.url), "utf8");
  assert.doesNotMatch(sql, /DROP\s+(?:TABLE|COLUMN)|DELETE\s+FROM\s+(?:reports|report_prizes)|CREATE\s+TABLE\s+reports\b/i);
  assert.match(sql, /CREATE TABLE report_withdrawals/i);
  assert.match(sql, /report_id TEXT PRIMARY KEY REFERENCES reports/i);
  assert.match(sql, /CREATE TABLE report_guaranteed_prizes/i);
  assert.match(sql, /'draw' AS acquisition_type/i);
  assert.match(sql, /CREATE VIEW active_user_reports/i);
});
