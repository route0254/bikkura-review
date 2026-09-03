# ビッくらポン！みんなの結果共有

利用者が自己申告したビッくらポン！の抽選結果を、店舗・キャンペーン・全国単位で集計する非公式サイトです。くら寿司、各コラボ作品、その他権利者とは関係ありません。店舗の評価、ランキング、不正の判定には使いません。

公開予定URL: https://review.chiikatsu-map.com/

## 構成

- `index.html` / `style.css` / `app.js`: 画面
- `functions/api/`: Cloudflare Pages Functions
- `lib/`: 画面とAPIで共有する検索・入力検証
- `migrations/`: D1 migration
- `data/`: 店舗・キャンペーンの元データ
- `seed/`: D1投入用SQL（`data/` から生成）
- `scripts/`: データ検査、seed生成、静的ファイルのbuild
- `tests/`: Node.js unit test、Playwright smoke test

Node.js 22、pnpm 11を使います。画面はVanilla HTML / CSS / JavaScript、保存先はCloudflare D1です。

## ローカル開発

```bash
pnpm install
copy .dev.vars.example .dev.vars
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

表示された `http://127.0.0.1:8788` を開きます。`.dev.vars.example` はCloudflare公式のテスト用Turnstileキーです。本番の値は入っていません。

## D1

binding名は `DB` です。migrationは `migrations/` の番号順に適用します。既存DBには `0006_acquisition_and_withdrawal.sql` まで追加適用してください。`0006` は既存テーブルを再構築しない追加型migrationです。

```bash
pnpm run db:migrate
pnpm run db:seed
```

`pnpm run db:seed` は `data/stores.json` と `data/campaigns.json` から `seed/seed.sql` を生成してローカルD1へ投入します。公開済みIDは変更・再利用しません。店舗名が変わっても同じ店舗ならIDを維持します。

リモートD1を作成した後は、`wrangler.jsonc` の `database_id` を実際のIDに置き換えます。Account IDやAPI tokenはファイルへ書きません。

## DB構造

- `stores`: 店舗マスタ
- `campaigns`: キャンペーン
- `prize_categories`: キャンペーンごとの景品区分
- `prize_items`: キャンペーン・景品カテゴリごとの個別景品。表示名とstable IDを分離
- `users`: HMAC変換した内部ユーザーIDと利用状態（`active` / `restricted` / `banned`）
- `reports`: 投稿本体。`active` / `pending` / `hidden`、景品入力状態、最小限の不正対策メタデータを保持
- `report_prizes`: 投稿と景品区分の個数
- `report_guaranteed_prizes` / `report_guaranteed_item_breakdowns` / `report_guaranteed_items`: セット商品などで確実にもらえる景品。抽選景品とは書き込み先を分離
- `report_withdrawals`: 本人による投稿取り下げ。`report_id` を主キーとして重複を防止し、元投稿は削除しない
- `report_prize_acquisitions` / `report_prize_item_acquisitions`: 抽選景品を `draw`、確約景品を `guaranteed` として統合参照する読み取り用VIEW
- `active_user_reports`: 公開中の利用者投稿から取り下げ済みを除く、統計・一覧共通VIEW
- `report_prize_item_breakdowns`: 投稿・景品カテゴリごとの個別景品内訳状態
- `report_prize_items`: 投稿と個別景品の個数
- `external_reports`: 外部公開情報から確認した参考データ。通常投稿とは別テーブルで、店舗未特定は `store_id = NULL`
- `external_report_prizes`: 外部参考情報のカテゴリ別個数と、正確・以上・不明の区別
- `external_report_items`: 外部参考情報の個別景品。既存 `prize_items` を参照
- `store_campaign_stats`: 店舗・キャンペーン単位の集計
- `store_campaign_usage_stats`: 店舗・キャンペーン・通常／プラス／不明単位の集計
- `store_campaign_prize_stats`: 店舗・キャンペーン・景品単位の集計
- `daily_submission_slots`: 日本時間の日次投稿枠。同時投稿でも上限を超えない複合主キーを使用
- `rate_limits`: 旧バージョンとの互換用テーブル（新規投稿では未使用）
- `report_fingerprints`: 1時間以内の同一内容の重複投稿を防ぐ期限付きハッシュ

閲覧時に `reports` 全件を集計せず、投稿時に集計テーブルを更新します。問題のある投稿はD1で `status = 'hidden'` に変更し、`scripts/rebuild-stats.sql` で集計を再構築できます。物理削除は前提にしていません。

## API

- `GET /api/campaigns`
- `GET /api/stores?q=&prefecture=&campaign=&limit=&cursor=`
- `GET /api/stores/:id?campaign=&period=all|7d`
- `GET /api/stores/:id/reports?campaign=&limit=`
- `GET /api/stores/:id/external-reports?campaign=&limit=`
- `GET /api/stats?campaign=`
- `GET /api/stats/prefectures?campaign=`
- `GET /api/recent-reports?campaign=&limit=`
- `GET /api/me/reports?limit=`（Googleログイン必須）
- `POST /api/me/reports/:id/withdraw`（本人のみ）
- `POST /api/me/reports/:id/restore`（本人のみ・公開中投稿だけ）
- `GET /api/prize-items?campaign=`
- `GET /api/rankings/figure?campaign=`
- `GET /api/config`
- `GET /api/posting-status`
- `POST /api/reports`

初期表示では静的な `data/stores.json` と、キャンペーン・疎な集計データの2 APIだけを取得します。一覧APIはフォールバック用途でページングし、直近投稿と期間別集計は店舗詳細を開いたときだけ取得します。GETの全国集計・店舗集計は30〜300秒の短いCDNキャッシュを許可しています。投稿直後は表示反映が少し遅れる場合があります。

当選率は5投稿かつ50抽選以上、景品カテゴリ割合は内訳をすべて入力した5投稿かつ景品20個以上を表示条件にしています。個別景品割合はカテゴリ内訳が完全な3投稿かつ10個以上、フィギュア報告割合ランキングはカテゴリ内訳が完全な5投稿かつ景品50個以上を条件にしています。`pending` / `hidden` はいずれの集計にも含めません。

店舗詳細では通常・ビッくらポン！プラス・区分不明を分け、タッチパネル／スマホ注文の内訳を維持して表示します。景品カテゴリ割合、十分な場合の全国投稿データとの数値比較、任意入力された個別景品内訳にも対応します。全期間と直近7日を切り替えられ、7日分はD1で期間集計します。

投稿フォームの店舗選択は、共通の都道府県順で都道府県を選んだ後、その地域の店舗だけを選ぶ2段階方式です。個別景品はカテゴリ個数の下にある「内訳も入力する」から任意入力でき、未入力の既存投稿は `unknown` 相当のまま扱います。

## 外部参考情報

X・Google Maps・食べログ・ブログ等の一般公開情報から確認した構造化データは、`reports` ではなく外部専用テーブルへ保存します。直接投稿の全国・店舗・期間別統計、景品割合、ランキング、risk・BAN判定には一切含めません。店舗詳細を開いた場合だけ専用APIから最大10件を読み込み、投稿本文・投稿者名・アカウントID・画像は保存または転載しません。

元データは `seed/external-reports.json`、生成SQLは `seed/external-reports.sql` です。`externalUrl` が未確認なら `null`、確認済み0個は `0`、不明な数量は `null` と `quantityKind: "unknown"` を使います。URLがある場合はプラットフォーム・URL・店舗の組み合わせで重複を防ぎます。

```bash
# ローカルD1へ検証・生成・upsert
pnpm run seed:external

# 本番は検証後に明示的に実行
node scripts/validate-external-data.mjs
node scripts/build-external-seed-sql.mjs
wrangler d1 execute DB --remote --file=seed/external-reports.sql
```

`evidenceQuality` は公開情報から確認できた具体性をA/B/Cで管理し、`resultPrecision` は `complete` / `partial` / `mention_only` を使います。誤認やリンク切れはJSONの `status` を `hidden` にして再投入します。緊急時は `UPDATE external_reports SET status = 'hidden', updated_at = CURRENT_TIMESTAMP WHERE id = ?` で即時非表示にできます。詳しい採用基準は `docs/EXTERNAL-DATA.md` を参照してください。

## 投稿の処理

1. 画面とPages Functionsの両方で回数、日付、景品数、1投稿300抽選までの上限を検証
2. 店舗・キャンペーン・景品IDをD1で確認
3. Turnstile tokenをSiteverify APIで検証
4. AuthorizationがあればFirebase ID tokenをサーバーで検証し、HMAC内部IDと利用状態を確認
5. 日本時間の日次投稿枠と、同一内容を1時間拒否する指紋ハッシュを確認
6. 過度な投稿量だけを保守的に採点し、必要なら`pending`として保存
7. Prepared StatementとD1 batchで投稿・景品・日次枠・`active`投稿の集計値をまとめて更新

自由記述と星評価は扱いません。Googleログインは任意で、匿名でも投稿できます。メールアドレスや表示名は保存しません。

## 任意ログインと不正対策

- Firebase AuthenticationのGoogleログインを任意で利用できます。匿名は1日5件、通常ログインは1日20件、制限中ユーザーは1日5件です（日本時間0時に更新）。
- Pages FunctionsはFirebase ID tokenの署名、issuer、audience、有効期限、subjectを検証します。Firebase UIDは保存せず、`USER_ID_SECRET`によるHMAC内部IDだけを保存します。
- 全投稿でTurnstileと1時間の重複防止を継続します。明らかに大きい投稿や短時間の集中だけを保守的に採点し、高リスク投稿は`pending`として公開集計から除外します。
- 送信元の生IPは保存しません。日次制限用ハッシュと、14日ごとに変わる調査用ハッシュを使い、投稿から30日を超えた値を削除します。
- 調査・BAN・解除手順は `docs/ABUSE-OPERATIONS.md`、管理SQLは `scripts/admin-*.sql` にあります。公開状態を変えた後は `scripts/rebuild-stats.sql` を実行します。

## Turnstile

Cloudflare Pagesの環境変数・Secretに次を設定します。

- `TURNSTILE_SITE_KEY`: 公開用sitekey
- `TURNSTILE_SECRET_KEY`: Secret
- `RATE_LIMIT_SALT`: 十分に長いランダム値のSecret
- `ABUSE_HASH_SALT`: 日次制限・短期調査用HMACの独立したSecret
- `USER_ID_SECRET`: Firebase UIDを内部IDへ変換する独立したSecret

本番の値は `.dev.vars` やGitへ入れません。ブラウザに配置するだけでなく、Pages FunctionsからSiteverify APIへ送って検証します。
`USER_ID_SECRET` を変更すると既存ユーザーを同一人物として判定できなくなります。漏えい対応を除き、運用開始後は変更しないでください。`ABUSE_HASH_SALT` も定期ローテーションではなく、コード側の期間スコープでハッシュを14日ごとに変えます。

## テスト

```bash
pnpm run check
pnpm run test:unit
pnpm run test:smoke
pnpm run build
```

`check` はJavaScript構文、マスタデータ、生成seedの一致を確認します。Smoke Testは検索、都道府県絞り込み、店舗詳細、フォーカス復帰、投稿エラー、共有URL、スマホ幅、主要なアクセシビリティを確認します。

## Cloudflare Pagesへ公開する手順

1. GitHubの `bikkura-review` リポジトリとCloudflare Pagesを接続
2. D1 binding `DB`、build command `pnpm run build`、output directory `dist`、Node.js 22を設定
3. Firebase AuthenticationでGoogleプロバイダーを有効化
4. Firebase Authorized domainsへ `review.chiikatsu-map.com` を追加（APIキーを制限している場合は同ドメインも許可）
5. Cloudflare Pagesに `TURNSTILE_SECRET_KEY`、`RATE_LIMIT_SALT`、`ABUSE_HASH_SALT`、`USER_ID_SECRET` をSecretとして設定
6. リモートD1へ `0006_acquisition_and_withdrawal.sql` までmigrationを適用し、通常seedとexternal seedを投入
7. Pagesを一度だけ再デプロイ
8. 匿名投稿、Googleログイン、ログアウト、残り投稿件数、上限到達時の表示を確認
9. `pending`投稿が公開集計・最近の投稿に含まれないことを確認
10. 本番ドメインのHTTPS、canonical、robots、sitemapを確認

認証設定やSecretが不足している間はGoogleログインUIを表示せず、既存の匿名投稿を継続します。migrationより先に新しいFunctionsを本番反映しないでください。

## マスタデータ

キャンペーン期間と景品区分は、くら寿司の2026年8月10日付プレスリリースと公式景品画像で確認しました。個別景品マスターはフィギュア5種・缶バッジ8種・アクリルマグネット8種の計21種です。カテゴリが確認できない名称は推測で登録しません。

## 取り下げと確約景品

既存の `report_prizes` はすべて従来どおり抽選景品（`draw`）として扱います。今後入力する確約景品だけを専用テーブルへ保存し、抽選回数・当選率・抽選景品割合・ランキングには一切含めません。

ログイン後の「自分の投稿」から取り下げると `report_withdrawals` に記録し、元投稿は保持したまま全国・店舗・都道府県集計、ランキング、最近の投稿、店舗の投稿一覧から除外します。本人が解除した場合は対象店舗・キャンペーンの事前集計を安全に再構築します。管理時に直接SQLで状態を変更した場合は `scripts/rebuild-stats.sql` を実行してください。

外部参考情報は出典URLを確認できた `active` データだけを公開します。URL未確認データは `pending` で保持し、画面に「URL未登録」とは表示しません。

店舗はくら寿司公式の全国店舗一覧から、ビッくらポン！対象外と明記されている「無添蔵」を除く552店舗（47都道府県）を登録しています。店舗IDには公式詳細ページのIDを使い、住所と緯度・経度も公式一覧の値を収録しています。

公式一覧から店舗マスタを更新するときは `pnpm run data:update-stores` を実行し、件数・都道府県・ID・座標の検証後に `pnpm run db:seed` を実行します。既存店舗のIDは維持され、一覧から外れた店舗も削除せず非表示にするため、投稿データとの関連は壊れません。

## 今後の課題

`ROADMAP.md` にまとめています。地図や管理画面は運用上必要になった段階で検討します。
