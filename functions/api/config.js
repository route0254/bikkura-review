import { json } from "../_lib/http.js";

export function onRequestGet({ env }) {
  return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY ?? null }, { headers: { "Cache-Control": "no-store" } });
}
