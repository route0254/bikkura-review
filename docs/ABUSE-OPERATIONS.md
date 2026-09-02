# 不正利用の調査と対応

この文書はD1コンソールで使う運用手順です。Firebase UID、メールアドレス、生のIPアドレスは保存しません。`users.id` はFirebase UIDをHMAC変換した内部ID、`abuse_hash` は14日ごとに変わり、投稿から30日後に削除されるネットワーク由来のHMACです。

## 確認用SELECT

審査待ち投稿を優先度順に確認します。

```sql
SELECT id, store_id, visit_date, user_id, risk_score, risk_reasons, created_at
FROM reports
WHERE status = 'pending'
ORDER BY risk_score DESC, created_at ASC
LIMIT 100;
```

短期間に投稿が集中している内部ユーザー、ネットワーク由来ハッシュ、店舗を確認します。

```sql
SELECT user_id, COUNT(*) AS reports, MIN(created_at) AS first_at, MAX(created_at) AS last_at
FROM reports
WHERE user_id IS NOT NULL AND created_at >= datetime('now', '-7 days')
GROUP BY user_id HAVING COUNT(*) >= 15
ORDER BY reports DESC;

SELECT abuse_hash, COUNT(*) AS reports, COUNT(DISTINCT store_id) AS stores
FROM reports
WHERE abuse_hash IS NOT NULL AND created_at >= datetime('now', '-7 days')
GROUP BY abuse_hash HAVING COUNT(*) >= 15
ORDER BY reports DESC;

SELECT abuse_hash, store_id, COUNT(*) AS reports
FROM reports
WHERE abuse_hash IS NOT NULL AND created_at >= datetime('now', '-1 hour')
GROUP BY abuse_hash, store_id HAVING COUNT(*) >= 4
ORDER BY reports DESC;
```

特定ユーザーの投稿履歴と利用制限状態を確認します。

```sql
SELECT id, status, created_at, last_seen_at, banned_at, ban_reason
FROM users WHERE id = '__INTERNAL_USER_ID__';

SELECT id, store_id, visit_date, status, risk_score, risk_reasons, created_at
FROM reports WHERE user_id = '__INTERNAL_USER_ID__'
ORDER BY created_at DESC LIMIT 200;
```

## 対応

- 誤入力の可能性があるだけなら `pending` のまま確認し、必要なら個別投稿だけを `hidden` にします。
- 継続監視は `users.status = 'restricted'` にし、ログイン投稿を1日5件に制限します。
- 明確な不正利用は `scripts/admin-ban-user.sql` をコピーし、内部ユーザーIDと理由を置換して実行します。関連する公開投稿も非表示になります。
- BAN解除は `scripts/admin-unban-user.sql` を使います。過去投稿は自動再公開されません。再公開が妥当な場合だけ `scripts/admin-restore-user-reports.sql` を別途使います。
- 投稿の公開状態を変えた後は必ず `scripts/rebuild-stats.sql` を実行します。削除ではなく非表示化を優先します。

SQLの対象IDと件数をSELECTで確認してから更新してください。ハッシュ値を外部共有したり、別データと突合して個人を特定しようとしないでください。

審査待ち投稿を公開または非表示にする場合は、対象IDを確認して次のいずれかだけを実行し、その後に集計を再構築します。

```sql
UPDATE reports SET status = 'active' WHERE id = '__REPORT_ID__' AND status = 'pending';
-- または
UPDATE reports SET status = 'hidden' WHERE id = '__REPORT_ID__' AND status = 'pending';
```
