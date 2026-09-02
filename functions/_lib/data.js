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
    stats: {
      reportCount: Number(row.report_count ?? 0),
      totalDraws: Number(row.total_panel_draws ?? 0) + Number(row.total_mobile_draws ?? 0),
      totalWins: Number(row.total_panel_wins ?? 0) + Number(row.total_mobile_wins ?? 0),
      totalPrizeCount: Number(row.total_prize_count ?? 0),
    },
  };
}
