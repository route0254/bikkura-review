import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../../", import.meta.url);
export function sqliteFixture({ beforeLatest = false, beforeGoods = false } = {}) {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("migrations/", root)).filter((p) => p.endsWith(".sql")).sort()) {
    if (beforeLatest && file >= "0010") continue;
    if (beforeGoods && file >= "0011") continue;
    sqlite.exec(readFileSync(new URL(`migrations/${file}`, root), "utf8"));
  }
  const seed = readFileSync(new URL("seed/seed.sql", root), "utf8");
  sqlite.exec(beforeLatest || beforeGoods ? seed.split("\n").filter((line) => !(beforeLatest && line.startsWith("INSERT INTO benefit_campaigns")) && !line.includes("SET image_asset=")).join("\n") : seed);
  const db = {
    prepare(sql) {
      const stmt = sqlite.prepare(sql);
      const bound = (args = []) => ({
        bind: (...values) => bound(values),
        async first() { return stmt.get(...args) ?? null; },
        async all() { return { results: stmt.all(...args) }; },
        run: () => stmt.run(...args),
      });
      return bound();
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try { const rows = statements.map((s) => s.run()); sqlite.exec("COMMIT"); return rows; }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  return { sqlite, db, close: () => sqlite.close() };
}

export const campaignId = "chiikawa-kurasushi-2026-summer";
export const storeId = "kura-664";
export const categoryId = "chiikawa-2026-figure";

export function addReport(sqlite, { id = "user-report", visitDate = "2026-08-21", simple = false, spend = 5200, prizes = 5, guaranteed = null, status = "active" } = {}) {
  sqlite.prepare(`INSERT INTO reports(id,store_id,campaign_id,visit_date,usage_type,panel_draws,panel_wins,mobile_draws,mobile_wins,
    unknown_prize_count,status,created_at,prize_breakdown_status,prize_input_mode,result_input_mode,spend_amount_yen,reported_prize_count)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, storeId, campaignId, visitDate, simple ? "unknown" : "normal", simple ? 0 : 50, simple ? 0 : prizes, 0, 0, 0, status, `${visitDate}T03:00:00.000Z`, "complete", simple ? "total" : "by_acquisition", simple ? "simple" : "detailed", simple ? spend : null, simple ? prizes : null);
  sqlite.prepare(`INSERT INTO ${simple ? "report_total_prizes" : "report_prizes"}(report_id,prize_category_id,quantity) VALUES(?,?,?)`).run(id, categoryId, prizes);
  if (guaranteed !== null) sqlite.prepare("UPDATE reports SET simple_guaranteed_prize_count=? WHERE id=?").run(guaranteed, id);
}
