import { optionalFirebaseUser } from "./firebase-auth.js";
import { apiError } from "./http.js";
import { createInternalUserId } from "./security.js";

export async function requireAuthenticatedUser(request, env) {
  let firebaseUser;
  try {
    firebaseUser = await optionalFirebaseUser(request, env);
  } catch (error) {
    if (error.status === 401) return { error: apiError(error.message, 401) };
    throw error;
  }
  if (!firebaseUser) return { error: apiError("この機能を利用するにはGoogleログインが必要です。", 401) };
  if (!env.USER_ID_SECRET) return { error: apiError("ログイン機能の設定が完了していません。", 503) };
  return { userId: await createInternalUserId(firebaseUser.uid, env.USER_ID_SECRET) };
}
