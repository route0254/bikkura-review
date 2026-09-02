const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token, secret, remoteIp) {
  if (!token || !secret) return { success: false, errorCodes: ["missing-input"] };
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);
  try {
    const response = await fetch(VERIFY_URL, { method: "POST", body });
    if (!response.ok) return { success: false, errorCodes: ["verification-unavailable"] };
    const result = await response.json();
    return { success: Boolean(result.success), errorCodes: result["error-codes"] ?? [] };
  } catch {
    return { success: false, errorCodes: ["verification-unavailable"] };
  }
}
