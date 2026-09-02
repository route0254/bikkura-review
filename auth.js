let auth = null;
let currentUser = null;
let googleProvider = null;
let initialized = false;
let enabled = false;
const listeners = new Set();

function snapshot(extra = {}) {
  return { enabled, authenticated: Boolean(currentUser), ...extra };
}

function notify(extra) {
  const value = snapshot(extra);
  for (const listener of listeners) listener(value);
}

async function initializeMock(mock) {
  enabled = mock.enabled !== false;
  currentUser = mock.user ?? null;
  auth = { mock };
  notify();
}

export async function initializeAuth(listener) {
  if (listener) listeners.add(listener);
  if (initialized) { listener?.(snapshot()); return snapshot(); }
  initialized = true;
  const mock = window.__BIKKURA_AUTH_MOCK__;
  if (mock) { await initializeMock(mock); return snapshot(); }
  try {
    const [publicConfig, serverConfig] = await Promise.all([
      fetch("/data/firebase.json", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/config", { cache: "no-store" }).then((response) => response.json()),
    ]);
    if (!serverConfig.authenticationEnabled || !publicConfig.enabledHosts.includes(location.hostname)) {
      notify({ reason: "unavailable" });
      return snapshot();
    }
    const base = `https://www.gstatic.com/firebasejs/${publicConfig.sdkVersion}`;
    const [{ initializeApp }, authSdk] = await Promise.all([
      import(`${base}/firebase-app.js`),
      import(`${base}/firebase-auth.js`),
    ]);
    auth = authSdk.getAuth(initializeApp(publicConfig.firebase));
    googleProvider = new authSdk.GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });
    await authSdk.setPersistence(auth, authSdk.browserLocalPersistence);
    enabled = true;
    authSdk.onAuthStateChanged(auth, (user) => { currentUser = user; notify(); });
  } catch (error) {
    console.warn("Googleログインを初期化できませんでした。", error);
    enabled = false;
    notify({ reason: "error" });
  }
  return snapshot();
}

export async function signIn() {
  if (!enabled) throw new Error("現在ログイン機能を利用できません。");
  if (auth?.mock) {
    currentUser = await auth.mock.signIn?.() ?? { uid: "mock-user" };
    notify();
    return;
  }
  const { signInWithPopup } = await import(`https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js`);
  await signInWithPopup(auth, googleProvider);
}

export async function signOut() {
  if (auth?.mock) {
    await auth.mock.signOut?.();
    currentUser = null;
    notify();
    return;
  }
  if (auth) {
    const authSdk = await import("https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js");
    await authSdk.signOut(auth);
  }
}

export async function getIdToken() {
  if (!currentUser) return null;
  if (auth?.mock) return auth.mock.token ?? "mock-firebase-token";
  return currentUser.getIdToken();
}
