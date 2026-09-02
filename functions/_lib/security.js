export function isSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; }
  catch { return false; }
}

export async function createVisitorHash(request, salt, windowStartedAt) {
  const ip = request.headers.get("CF-Connecting-IP") ?? "local-development";
  const scope = windowStartedAt === undefined ? "" : `:${windowStartedAt}`;
  const value = `${ip}:${salt}${scope}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
