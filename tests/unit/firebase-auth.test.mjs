import test from "node:test";
import assert from "node:assert/strict";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { optionalFirebaseUser, verifyFirebaseIdToken } from "../../functions/_lib/firebase-auth.js";
import { createInternalUserId } from "../../functions/_lib/security.js";

const projectId = "test-firebase-project";

async function fixture() {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  Object.assign(jwk, { kid: "test-key", alg: "RS256", use: "sig" });
  return { privateKey, keySet: createLocalJWKSet({ keys: [jwk] }) };
}

async function validToken(privateKey) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sub: "firebase-uid-123" })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(`https://securetoken.google.com/${projectId}`)
    .setAudience(projectId).setIssuedAt(now).setExpirationTime(now + 300).sign(privateKey);
}

test("正しいFirebase ID tokenを検証する", async () => {
  const { privateKey, keySet } = await fixture();
  assert.deepEqual(await verifyFirebaseIdToken(await validToken(privateKey), projectId, { keySet }), { uid: "firebase-uid-123" });
});

test("audienceが異なるtokenを拒否する", async () => {
  const { privateKey, keySet } = await fixture();
  const now = Math.floor(Date.now() / 1000);
  const invalid = await new SignJWT({ sub: "firebase-uid-123" })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(`https://securetoken.google.com/${projectId}`)
    .setAudience("another-project").setIssuedAt(now).setExpirationTime(now + 300).sign(privateKey);
  await assert.rejects(verifyFirebaseIdToken(invalid, projectId, { keySet }));
});

test("期限切れtokenを拒否する", async () => {
  const { privateKey, keySet } = await fixture();
  const now = Math.floor(Date.now() / 1000);
  const expired = await new SignJWT({ sub: "firebase-uid-123" })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(`https://securetoken.google.com/${projectId}`)
    .setAudience(projectId).setIssuedAt(now - 600).setExpirationTime(now - 300).sign(privateKey);
  await assert.rejects(verifyFirebaseIdToken(expired, projectId, { keySet }));
});

test("Authorizationの形式が不正なら匿名扱いにせず401にする", async () => {
  const request = new Request("https://example.test/api", { headers: { Authorization: "Basic invalid" } });
  await assert.rejects(
    optionalFirebaseUser(request, { FIREBASE_PROJECT_ID: projectId }),
    (error) => error.status === 401,
  );
});

test("Firebase UIDは秘密値によって安定した別IDへ変換する", async () => {
  const first = await createInternalUserId("firebase-uid-123", "secret-one");
  const same = await createInternalUserId("firebase-uid-123", "secret-one");
  const other = await createInternalUserId("firebase-uid-123", "secret-two");
  assert.equal(first, same);
  assert.notEqual(first, other);
  assert.equal(first.length, 64);
});
