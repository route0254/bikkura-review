export async function onRequest(context) {
  const response = await context.next();
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' https://challenges.cloudflare.com https://www.gstatic.com; style-src 'self'; img-src 'self' data: https://lh3.googleusercontent.com; connect-src 'self' https://challenges.cloudflare.com https://*.googleapis.com https://accounts.google.com; frame-src https://challenges.cloudflare.com https://chiikatsu-map.firebaseapp.com https://accounts.google.com; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
