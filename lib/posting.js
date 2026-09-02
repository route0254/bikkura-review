export const POSTING_LIMITS = Object.freeze({
  anonymous: 5,
  authenticated: 20,
  restricted: 5,
});

export function postingLimit({ authenticated, userStatus = "active" }) {
  if (userStatus === "banned") return 0;
  if (!authenticated) return POSTING_LIMITS.anonymous;
  return userStatus === "restricted" ? POSTING_LIMITS.restricted : POSTING_LIMITS.authenticated;
}

export function postingDecision({ authenticated, userStatus = "active", usedToday = 0 }) {
  const dailyLimit = postingLimit({ authenticated, userStatus });
  const used = Math.max(0, Number(usedToday) || 0);
  const remainingToday = Math.max(0, dailyLimit - used);
  if (userStatus === "banned") {
    return { allowed: false, status: 403, dailyLimit, usedToday: used, remainingToday, message: "このアカウントからは現在投稿できません。" };
  }
  if (remainingToday === 0) {
    const message = authenticated
      ? `本日の投稿上限（${dailyLimit}件）に達しました。日本時間の翌日0時以降にもう一度お試しください。`
      : `本日の匿名投稿上限（${dailyLimit}件）に達しました。ログインすると1日20件まで投稿できます。`;
    return { allowed: false, status: 429, dailyLimit, usedToday: used, remainingToday, message };
  }
  return { allowed: true, status: 200, dailyLimit, usedToday: used, remainingToday };
}
