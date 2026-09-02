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

binding名は `DB` です。migrationは `migrations/` の番号順に適用します。既存DBには `0002_improve_statistics.sql` を追加適用してください。

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
- `reports`: 構造化された投稿。`active` / `hidden` と景品内訳状態（`complete` / `partial` / `unknown`）を保持
- `report_prizes`: 投稿と景品区分の個数
- `store_campaign_stats`: 店舗・キャンペーン単位の集計
- `store_campaign_usage_stats`: 店舗・キャンペーン・通常／プラス／不明単位の集計
- `store_campaign_prize_stats`: 店舗・キャンペーン・景品単位の集計
- `rate_limits`: 一時的な連投制限用ハッシュ
- `report_fingerprints`: 1時間以内の同一内容の重複投稿を防ぐ期限付きハッシュ

閲覧時に `reports` 全件を集計せず、投稿時に集計テーブルを更新します。問題のある投稿はD1で `status = 'hidden'` に変更し、`scripts/rebuild-stats.sql` で集計を再構築できます。物理削除は前提にしていません。

## API

- `GET /api/campaigns`
- `GET /api/stores?q=&prefecture=&campaign=&limit=&cursor=`
- `GET /api/stores/:id?campaign=&period=all|7d`
- `GET /api/stores/:id/reports?campaign=&limit=`
- `GET /api/stats?campaign=`
- `GET /api/config`
- `POST /api/reports`

初期表示では静的な `data/stores.json` と、キャンペーン・疎な集計データの2 APIだけを取得します。一覧APIはフォールバック用途でページングし、直近投稿と期間別集計は店舗詳細を開いたときだけ取得します。GETの全国集計・店舗集計は30〜300秒の短いCDNキャッシュを許可しています。投稿直後は表示反映が少し遅れる場合があります。

当選率は5投稿かつ50抽選以上、景品割合は内訳をすべて入力した3投稿かつ景品10個以上を表示条件にしています。景品別集計には `prize_breakdown_status = 'complete'` の投稿だけを使います。

店舗詳細では通常・ビッくらポン！プラス・区分不明を分け、タッチパネル／スマホ注文の内訳を維持して表示します。全期間と直近7日を切り替えられ、7日分はD1で期間集計します。

## 投稿の処理

1. 画面で回数、日付、景品数の矛盾を検査
2. Pages Functionsで同じ内容を再検査
3. 店舗・キャンペーン・景品IDをD1で確認
4. Turnstile tokenをSiteverify APIで検証
5. 送信元IPを保存せず、IP・秘密のsalt・時間枠からSHA-256ハッシュを作成
6. 10分に5件までの簡易連投制限を確認
7. 同じ利用者・同じ内容の投稿を期限付きハッシュで1時間拒否
8. Prepared StatementとD1 batchで投稿・景品・集計値をまとめて更新

自由記述、アカウント、星評価は扱いません。

## Turnstile

Cloudflare Pagesの環境変数・Secretに次を設定します。

- `TURNSTILE_SITE_KEY`: 公開用sitekey
- `TURNSTILE_SECRET_KEY`: Secret
- `RATE_LIMIT_SALT`: 十分に長いランダム値のSecret

本番の値は `.dev.vars` やGitへ入れません。ブラウザに配置するだけでなく、Pages FunctionsからSiteverify APIへ送って検証します。

## テスト

```bash
pnpm run check
pnpm run test:unit
pnpm run test:smoke
pnpm run build
```

`check` はJavaScript構文、マスタデータ、生成seedの一致を確認します。Smoke Testは検索、都道府県絞り込み、店舗詳細、フォーカス復帰、投稿エラー、共有URL、スマホ幅、主要なアクセシビリティを確認します。

## Cloudflare Pagesへ公開する手順

1. GitHubで `bikkura-review` リポジトリを作り、このプロジェクトをpush
2. CloudflareでD1データベースを作り、`wrangler.jsonc` の `database_id` を更新
3. リモートD1へmigrationとseedを適用
4. Cloudflare PagesでGitHubリポジトリを接続
5. build commandを `pnpm run build`、output directoryを `dist`、Node.jsを22に設定
6. PagesのSettingsでD1 binding `DB` を作成
7. Turnstile widgetを作り、上記3変数をPagesの環境変数・Secretへ設定
8. Pagesを一度デプロイし、`<project>.pages.dev` で表示と投稿を確認
9. PagesのCustom domainsで `review.chiikatsu-map.com` を登録
10. 現在のDNS管理サービスで `review.chiikatsu-map.com CNAME <project>.pages.dev` を設定
11. HTTPS、canonical、robots、sitemap、投稿を再確認

既存の `chiikatsu-map.com`、`www`、既存CNAMEは変更しません。今回扱うのは `review` サブドメインだけです。

## マスタデータ

キャンペーン期間と景品区分は、くら寿司の2026年8月10日付プレスリリースで確認しました。初期景品区分はフィギュア、缶バッジ、アクリルマグネットです。

店舗はくら寿司公式の全国店舗一覧から、ビッくらポン！対象外と明記されている「無添蔵」を除く552店舗（47都道府県）を登録しています。店舗IDには公式詳細ページのIDを使い、住所と緯度・経度も公式一覧の値を収録しています。

公式一覧から店舗マスタを更新するときは `pnpm run data:update-stores` を実行し、件数・都道府県・ID・座標の検証後に `pnpm run db:seed` を実行します。既存店舗のIDは維持され、一覧から外れた店舗も削除せず非表示にするため、投稿データとの関連は壊れません。

## 今後の課題

`ROADMAP.md` にまとめています。地図や管理画面は運用上必要になった段階で検討します。
