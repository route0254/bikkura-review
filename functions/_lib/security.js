export function isSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; }
  catch { return false; }
}

async function hmacHex(secret, value) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createInternalUserId(firebaseUid, secret) {
  if (!firebaseUid || !secret) throw new TypeError("ユーザーIDの変換に必要な値がありません。");
  return hmacHex(secret, `firebase-user:${firebaseUid}`);
}

export async function createNetworkHash(request, salt, scope) {
  const ip = request.headers.get("CF-Connecting-IP") ?? "local-development";
  if (!salt || !scope) throw new TypeError("ハッシュ生成に必要な値がありません。");
  return hmacHex(salt, `network:${scope}:${ip}`);
}

export function abuseHashPeriod(now = new Date(), days = 14) {
  return Math.floor(now.getTime() / (days * 86_400_000));
}

// Kept for compatibility with migrations and older local builds.
export async function createVisitorHash(request, salt, windowStartedAt) {
  const scope = windowStartedAt === undefined ? "legacy" : `legacy:${windowStartedAt}`;
  return createNetworkHash(request, salt, scope);
}
