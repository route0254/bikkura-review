-- Cloudflare D1 コンソールで __INTERNAL_USER_ID__ を置換して実行します。
-- 非表示にした過去投稿は自動では再公開しません。
UPDATE users
SET status = 'active', banned_at = NULL, ban_reason = NULL
WHERE id = '__INTERNAL_USER_ID__';
