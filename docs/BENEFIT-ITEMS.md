# 絵柄別の先着特典

## 登録と画像

`data/benefit-items.json` が唯一の絵柄マスターです。提供 `bonus_manifest.json` の日本語名・特典区分と一覧画像を照合しました。元の提供フォルダは保持し、12枚を無加工で `public/bonuses/` にコピーしています。UIに個別の画像パスを直書きせず、APIのマスターから共通表示します。識別用イラストであり、実物写真ではありません。欠損・未設定画像は共通プレースホルダです。

| stable ID（すべて chiikawa-2026-benefit- で開始） | 絵柄 | public/bonuses/ 以下 |
| --- | --- | --- |
| 1-chiikawa | ミニ巾着 ちいかわ | bonus_pouch/chiikawa.png |
| 1-hachiware | ミニ巾着 ハチワレ | bonus_pouch/hachiware.png |
| 1-usagi | ミニ巾着 うさぎ | bonus_pouch/usagi.png |
| 1-momonga | ミニ巾着 モモンガ | bonus_pouch/momonga.png |
| 2-chiikawa | 湯呑み ちいかわ | bonus_yunomi/chiikawa.png |
| 2-hachiware | 湯呑み ハチワレ | bonus_yunomi/hachiware.png |
| 2-usagi | 湯呑み うさぎ | bonus_yunomi/usagi.png |
| 2-minna | 湯呑み みんな | bonus_yunomi/minna.png |
| 3-chiikawa | 寿司皿 ちいかわ | bonus_plate/chiikawa.png |
| 3-hachiware | 寿司皿 ハチワレ | bonus_plate/hachiware.png |
| 3-usagi | 寿司皿 うさぎ | bonus_plate/usagi.png |
| 3-minna | 寿司皿 みんな | bonus_plate/minna.png |

旧キャンペーン名「第3弾 寿司皿」を維持し、提供素材の「おすし皿」と対応付けています。ID・slug・所属特典は再利用・移動せず、新しい絵柄は新IDで追加してください。

## 保存と公開

- 0012は追加型。`benefit_reports` が親、`benefit_report_items` が明細。複数柄を原子的に保存し、親1件で日次枠1件を消費します。
- 明細と親の同じ特典への所属は複合FKで保証し、1投稿内の同じ柄は重複不可。新しい親のavailabilityはunknown、received_quantityはNULLとし、公開時には親の仮値を表示・集計しません。
- `public_benefit_observations` はactiveかつwithdrawalなしを共通条件とします。旧全体報告は `benefit_item_id=NULL` のまま別枠で保持し、明細へ振り分けません。
- 状態はavailable/unavailable/unknown、確認方法はreceived/store_notice/observedです。「受け取った個数」はreceivedかつavailableのときだけ任意入力できます。NULLは不明であり0とは扱いません。
- 同じ店舗・同じ柄の24時間以内にavailable/unavailableが両方あると「直近の報告が分かれています」。別柄同士・旧全体報告と柄別報告の違いは矛盾に数えません。24/48時間・古い報告を分け、現在の在庫を断定しません。
- 終了報告店舗数は24時間以内のunavailable報告があるdistinct店舗数。食い違いがある店舗も含む「報告件数の概要」で、確定在庫ではありません。
- トップはsummary=1のみ、一覧は最大60行、店舗詳細は対象特典のみ。特典の投稿者識別情報やrisk理由は公開APIへ返しません。
- 通常の景品・当選率・ランキング・外部参考情報の集計には一切使用しません。

## 訂正・非表示・不正対策

ログインユーザーは「自分の投稿」で親投稿全体を取り下げられます。同時投稿した全柄が対象であることを確認画面にも明記します。既存withdrawal APIの認証・本人照合を継続利用し、原本は削除しません。日次枠は戻さず、重複指紋は解放して訂正を可能にします。

管理者は対象の `benefit_reports.status` をhiddenにすると全明細を公開から外せます。復旧が必要な場合は権限と依頼を確認して、そのreport_idの `benefit_withdrawals` 行だけを解除してください。投稿テーブルや明細を削除する必要はありません。

既存Turnstile・認証・BAN・匿名/ログイン日次枠・restricted→pendingを使用。絵柄別の同じ内容は5分間のfingerprintで重複を防ぎます。1時間内の同じ柄に対する反対状態の過去報告が2件以上ある連投は `repeated_item_reversal` を記録しpendingへ回します。一度の状態変化だけではpendingにしません。旧全体報告は従来の1時間制限のままです。

## 反映手順

1. ローカルで `pnpm run db:migrate`、`pnpm run db:seed`（既存外部seedも必要時のみ）、最後に `pnpm run verify`。
2. 本番のreports・prize_items・benefit_reportsの件数と既存行を読み取り比較用に確認。
3. 承認済みの0012のみ適用。マスターは生成seed中の `INSERT INTO benefit_items` 12文だけ投入し、同IDへのupsertで二重登録を防止。
4. 最後に1回だけGitHubへpushしてPages公開。画像全12点・API・スマホ・既存件数と集計値を確認。

マスターを生成するには `node scripts/build-seed-sql.mjs` を使います。本番へ無関係な通常景品や店舗の全seedを再投入しないでください。migrationの巻き戻しや既存テーブル再構築は不要です。
