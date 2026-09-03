export async function getCampaign(db, requestedId) {
  if (requestedId) {
    return db.prepare("SELECT id, name, starts_on, ends_on, source_url FROM campaigns WHERE id = ? AND published = 1").bind(requestedId).first();
  }
  return db.prepare("SELECT id, name, starts_on, ends_on, source_url FROM campaigns WHERE published = 1 ORDER BY starts_on DESC LIMIT 1").first();
}

export function mapCampaign(row) {
  return row ? { id: row.id, name: row.name, startsOn: row.starts_on, endsOn: row.ends_on, sourceUrl: row.source_url } : null;
}

export function mapStore(row) {
  return {
    id: row.id,
    name: row.name,
    prefecture: row.prefecture,
    city: row.city,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    officialUrl: row.official_url,
    active: Boolean(row.active),
    latestReportAt: row.latest_report_at ?? null,
    stats: mapSummary(row),
  };
}

export function mapSummary(row = {}) {
  const totalDraws = row.total_draws === null || row.total_draws === undefined
    ? Number(row.total_panel_draws ?? 0) + Number(row.total_mobile_draws ?? 0)
    : Number(row.total_draws);
  const totalWins = row.total_wins === null || row.total_wins === undefined
    ? Number(row.total_panel_wins ?? 0) + Number(row.total_mobile_wins ?? 0)
    : Number(row.total_wins);
  return {
    reportCount: Number(row.report_count ?? 0),
    totalDraws,
    totalWins,
    totalPrizeCount: Number(row.total_prize_count ?? 0),
    completeReportCount: Number(row.complete_report_count ?? 0),
    completePrizeCount: Number(row.complete_prize_count ?? 0),
  };
}

export function mapUsageStats(rows = []) {
  const byType = new Map(rows.map((row) => [row.usage_type, row]));
  return ["normal", "plus", "unknown"].map((usageType) => {
    const row = byType.get(usageType) ?? {};
    return {
      usageType,
      reportCount: Number(row.report_count ?? 0),
      panelDraws: Number(row.total_panel_draws ?? 0),
      panelWins: Number(row.total_panel_wins ?? 0),
      mobileDraws: Number(row.total_mobile_draws ?? 0),
      mobileWins: Number(row.total_mobile_wins ?? 0),
    };
  });
}

export function mapSimpleSummary(row = {}) {
  return {
    reportCount: Number(row.report_count ?? 0),
    spendAmountYen: Number(row.spend_amount_yen ?? 0),
    reportedPrizeCount: Number(row.reported_prize_count ?? 0),
    reportedDrawCount: Number(row.reported_draw_count ?? 0),
    drawCountReportCount: Number(row.draw_count_report_count ?? 0),
  };
}
