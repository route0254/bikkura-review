# 投稿・確約景品・取り下げの運用

## 保存先

- 従来の抽選景品は `report_prizes` / `report_prize_item_breakdowns` / `report_prize_items` に保存します。
- セット商品などでもらえる確約景品は `report_guaranteed_*` に保存します。
- `report_prize_acquisitions` と `report_prize_item_acquisitions` は読み取り用VIEWです。書き込みには使いません。
- 既存景品はすべて `draw` として参照されます。推測によるbackfillはしません。

## 統計対象

`active_user_reports` VIEWを共通条件にします。次を満たす投稿だけが対象です。

1. `status = 'active'`
2. `source_type = 'user'`
3. `report_withdrawals` に記録がない

確約景品は全国・店舗・都道府県の抽選数、当選率、抽選景品割合、ランキングへ含めません。最近の投稿と公開投稿一覧にも取り下げ済み投稿を表示しません。

## 取り下げと復旧

本人操作では元の `reports` 行を削除せず、`report_withdrawals` に1行だけ追加します。`report_id` が主キーなので重複登録されません。取り下げ・解除後は、対象店舗・キャンペーンの事前集計3表を共通処理で再構築します。

管理者が直接復旧する場合は、対象の `report_withdrawals` 行を削除した後に `scripts/rebuild-stats.sql` を実行してください。元投稿のmoderation statusが `pending` / `hidden` の場合は、公開可否を別途確認してください。

## migration確認

`0006_acquisition_and_withdrawal.sql` は既存 `reports` / `report_prizes` をDROP・再作成・更新しません。本番適用前後に次を記録します。

```sql
SELECT COUNT(*) AS reports FROM reports;
SELECT COUNT(*) AS report_prizes FROM report_prizes;
```

適用後に件数が同一であること、`report_guaranteed_*` と `report_withdrawals` が空で既存画面・APIが従来どおり動くことを確認します。
