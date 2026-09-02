-- Cloudflare D1 コンソールで __INTERNAL_USER_ID__ と理由を置換して実行します。
-- 実行後、scripts/rebuild-stats.sql で公開集計を再構築してください。
BEGIN TRANSACTION;
UPDATE users
SET status = 'banned', banned_at = datetime('now'), ban_reason = '管理者判断'
WHERE id = '__INTERNAL_USER_ID__';
UPDATE reports
SET status = 'hidden'
WHERE user_id = '__INTERNAL_USER_ID__' AND status IN ('active', 'pending');
COMMIT;
