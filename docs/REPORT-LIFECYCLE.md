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

## 合計入力（0007以降）

- 新しい投稿フォームでは、パネル・スマホ注文・確定セット等でもらった景品を取得経路で分けず、`report_total_prizes` / `report_total_item_breakdowns` / `report_total_items` に合計で保存します。
- 確定セット等の個数は `reports.guaranteed_prize_count` に保存します。抽選回数と当たり回数にはパネル・スマホ注文だけを使います。
- `report_observed_prizes` / `report_observed_items` は、新しい合計入力と従来の取得経路別入力を表示用に統合する読み取り専用VIEWです。
- 合計入力に確定セット等が1個以上含まれる場合、抽選分との配分を推測せず、カテゴリ割合・個別景品・フィギュア報告割合ランキングから除外します。抽選回数と当たり回数は通常どおり集計します。
- 確定セット等が0個で景品内訳が完全な合計入力だけを、`active_draw_prize_reports` / `active_draw_*` 経由で抽選景品統計へ含めます。
- `0007_total_prize_input.sql` は既存の `reports` と `report_prizes` を削除・再作成せず、既存行を既定値 `prize_input_mode = 'by_acquisition'` として後方互換で扱います。

適用後に件数が同一であること、`report_guaranteed_*` と `report_withdrawals` が空で既存画面・APIが従来どおり動くことを確認します。
