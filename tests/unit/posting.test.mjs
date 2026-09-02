import test from "node:test";
import assert from "node:assert/strict";
import { postingDecision, postingLimit } from "../../lib/posting.js";
import { todayInJapan } from "../../lib/validation.js";

test("匿名投稿は1日5件まで", () => {
  assert.equal(postingDecision({ authenticated: false, usedToday: 4 }).allowed, true);
  const blocked = postingDecision({ authenticated: false, usedToday: 5 });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.remainingToday, 0);
});

test("ログイン投稿は1日20件まで", () => {
  assert.equal(postingDecision({ authenticated: true, usedToday: 19 }).allowed, true);
  assert.equal(postingDecision({ authenticated: true, usedToday: 20 }).status, 429);
});

test("制限中は5件、BAN中は投稿不可", () => {
  assert.equal(postingLimit({ authenticated: true, userStatus: "restricted" }), 5);
  assert.equal(postingDecision({ authenticated: true, userStatus: "restricted", usedToday: 5 }).status, 429);
  assert.equal(postingDecision({ authenticated: true, userStatus: "banned", usedToday: 0 }).status, 403);
});

test("日次境界は日本時間0時", () => {
  assert.equal(todayInJapan(new Date("2026-09-02T14:59:59Z")), "2026-09-02");
  assert.equal(todayInJapan(new Date("2026-09-02T15:00:00Z")), "2026-09-03");
});
