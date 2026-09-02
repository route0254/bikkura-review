export function json(data, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(data), { status: options.status ?? 200, headers });
}

export function apiError(message, status = 400) {
  return json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export function cacheHeaders(seconds = 60) {
  return { "Cache-Control": `public, max-age=${Math.min(seconds, 30)}, s-maxage=${seconds}, stale-while-revalidate=30` };
}

export function boundedLimit(value, fallback = 20, max = 100) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(parsed, max)) : fallback;
}

export function numericCursor(value) {
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function unavailable(error) {
  console.error(error);
  return apiError("データを取得できませんでした。時間をおいて再度お試しください。", 503);
}
