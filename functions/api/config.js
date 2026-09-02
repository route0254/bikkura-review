import { json } from "../_lib/http.js";

export function onRequestGet({ env }) {
  return json({
    turnstileSiteKey: env.TURNSTILE_SITE_KEY ?? null,
    authenticationEnabled: Boolean(env.FIREBASE_PROJECT_ID && env.USER_ID_SECRET),
  }, { headers: { "Cache-Control": "no-store" } });
}
