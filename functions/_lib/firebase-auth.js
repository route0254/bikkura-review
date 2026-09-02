import { createRemoteJWKSet, jwtVerify } from "jose";

const FIREBASE_JWKS_URL = new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
let remoteJwks;

export function bearerToken(request) {
  const value = request.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+([^\s]+)$/i.exec(value);
  return match?.[1] ?? null;
}

export async function verifyFirebaseIdToken(token, projectId, options = {}) {
  if (!token || !projectId) throw new TypeError("Firebase ID token または project ID がありません。");
  const keySet = options.keySet ?? (remoteJwks ||= createRemoteJWKSet(FIREBASE_JWKS_URL));
  const { payload } = await jwtVerify(token, keySet, {
    algorithms: ["RS256"],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });
  if (typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 128) throw new Error("Firebase ID token の sub が不正です。");
  const now = Math.floor((options.now ?? Date.now()) / 1000);
  if (typeof payload.iat !== "number" || payload.iat > now + 60) throw new Error("Firebase ID token の iat が不正です。");
  return { uid: payload.sub };
}

export async function optionalFirebaseUser(request, env, options = {}) {
  const authorization = request.headers.get("Authorization");
  if (!authorization) return null;
  const token = bearerToken(request);
  if (!token) {
    const authError = new Error("ログイン情報の形式が正しくありません。もう一度ログインしてください。");
    authError.status = 401;
    throw authError;
  }
  if (!env.FIREBASE_PROJECT_ID) throw new Error("FIREBASE_PROJECT_ID is not configured");
  try {
    return await verifyFirebaseIdToken(token, env.FIREBASE_PROJECT_ID, options);
  } catch (error) {
    const authError = new Error("ログインの有効期限が切れたか、認証を確認できませんでした。もう一度ログインしてください。");
    authError.status = 401;
    authError.cause = error;
    throw authError;
  }
}
