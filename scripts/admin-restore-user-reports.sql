-- 内容を確認した後に限り、__INTERNAL_USER_ID__ を置換して実行します。
-- 実行後、scripts/rebuild-stats.sql で公開集計を再構築してください。
UPDATE reports
SET status = 'active'
WHERE user_id = '__INTERNAL_USER_ID__' AND status = 'hidden';
