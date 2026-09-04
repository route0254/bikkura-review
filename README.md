# ビッくらポン！みんなの結果共有

「何が何個出たか」をグッズ中心に見える化する、利用者投稿の非公式サイトです。グッズ個数・利用金額・店舗別結果・先着特典の状況を確認できます。くら寿司、各コラボ作品、その他権利者とは関係ありません。店舗の良し悪しや不正を評価する目的ではありません。ランキングは利用者投稿データ上の参考値として表示します。

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

binding名は `DB` です。migrationは番号順に `0011_goods_experience.sql` まで適用してください。`0006`〜`0011` は既存テーブルを再構築しない追加型です。`0009` 適用前の投稿は従来どおり `detailed`、`0010` 適用前のかんたん投稿の確定景品数はNULL（不明）のまま保持します。

```bash
pnpm run db:migrate
pnpm run db:seed
```

`pnpm run db:seed` は `data/stores.json`、`data/campaigns.json`、`data/benefits.json` から `seed/seed.sql` を生成してローカルD1へ投入します。公開済みIDは変更・再利用しません。店舗名が変わっても同じ店舗ならIDを維持します。

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
- `report_total_prizes` / `report_total_item_breakdowns` / `report_total_items`: パネル・スマホ注文・確定セット等を分けずに入力する、今後の投稿用の景品合計
- `report_withdrawals`: 本人による投稿取り下げ。`report_id` を主キーとして重複を防止し、元投稿は削除しない
- `report_prize_acquisitions` / `report_prize_item_acquisitions`: 抽選景品を `draw`、確約景品を `guaranteed` として統合参照する読み取り用VIEW
- `report_observed_prizes` / `report_observed_items`: 新しい合計入力と従来の取得経路別入力を表示用の合計として統合するVIEW
- `active_draw_prize_reports` / `active_draw_*`: 確定セット等を含まず、抽選分だけを判別できる完全入力を抽選景品統計へ渡すVIEW
- `active_simple_reports`: 金額・任意の抽選回数・景品合計だけを記録した、かんたん入力投稿の読み取り用VIEW
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

全期間の基本集計は投稿時に集計テーブルを更新します。期間指定・金額中央値はD1で集計し、生の投稿一覧をフロントへ渡しません。問題のある投稿はD1で `status = 'hidden'` に変更し、`scripts/rebuild-stats.sql` で集計を再構築できます。物理削除は前提にしていません。

## 来店期間・金額・先着特典（0010）

- `lib/periods.js` が期間の共通定義。`period=all|period1|period2|period3|7d` を全国・店舗・都道府県・ランキング・最近の投稿APIに指定できます。第1期間8/21〜9/3、第2期間9/4〜9/17、第3期間9/18〜9/30。7日は日本時間の今日を含みます。先着特典切替日基準のサイト内比較であり、別campaignに分割しません。
- 店舗詳細に3期間比較と金額参考欄。`lib/spend.js` のSQLite window関数で、利用金額、景品数、金額/景品、景品/1,000円の各来店値の**中央値**を算出。各指標5件以上、金額帯も5件以上で表示（定数化）。大人数利用を金額だけで除外せず、景品0個は金額/景品だけ対象外。価格改定・人数・注文内容の違いに注意する注記があります。
- かんたん入力の `simpleGuaranteedPrizeCount` は空欄=NULL、なし=0。合計から確定分を引いた抽選由来景品数は金額参考欄に限定し、当選率・カテゴリ割合・ランキングへ混ぜません。抽選/確定の中央値は内訳回答のある投稿のみ。従来の `guaranteedPrizeCount` は詳しく入力の互換性を維持します。
- 投稿は入力→確認→送信。確認画面は投稿内容だけの許可リストから生成し、認証情報は表示しません。連打を防止し、完了後にX・Web Share・URLコピーを提供。共有には店舗名とサイトURLだけを含め、金額を含めません。
- 順位は `lib/stats.js` の95% Wilson下限、表示割合は補正前の値。完全入力5件・抽選景品50個の下限は維持。景品数の補正であり、母集団の封入率や投稿選択バイアスを推定するものではありません。
- `data/benefits.json` で先着特典名・開始日・条件・出典を管理。終了日NULLは「無くなり次第終了」。公式情報で確認したミニ巾着・湯呑み・寿司皿を登録しています。
- `GET /api/stores/:id/benefits?campaign=` は各特典の最新1件と24時間の状態別件数だけ返し、店舗詳細を開いたときに取得します（トップ概要は0011のlatest API）。24h/48h/古い報告を分け、現況を断定しません。
- `POST /api/benefit-reports` は `storeId, benefitId, observedAt`（UTC ISO日時）, `availability`（available/unavailable/unknown）, `turnstileToken` を受付。別の `benefit_reports` に保存し、既存統計へ影響しません。Turnstile actionは `benefit_submit`、任意Google認証・BAN・ハッシュ方式を再利用。restrictedはpending。別の `benefit_submission_slots` で匿名5件/ログイン20件/制限中5件の日次上限、同じ利用者・店舗・特典へ1時間1件を原子的に制御します。
- 特典の非表示は管理者が `benefit_reports.status='hidden'` に変更。通常結果とは別の本人取り下げAPIを0011で追加しています。ハッシュ30日、日次枠35日、重複キー1時間で期限切れを掃除します。公開APIは個人情報を返しません。
- 外部情報の既存仕様（初期並び順、URL未登録activeの表示）は維持。期間指定中も外部件数は全期間の収集件数であり、統計からは除外します。

検証前に `pnpm run db:migrate` → `pnpm run db:seed` → `pnpm run seed:external` でローカルD1を同期し、最後に `pnpm run verify`。本番は追加migration→特典マスタseed→最後に1回のPages反映の順です。

## API

### グッズ中心UX（0011）

- 初期画面はキャンペーン・現在期間→グッズカード→先着特典概要→金額参考→店舗・詳しい集計の順。外部件数を含む店舗初期順とURL未登録active表示は変更していません。
- 標準投稿は店舗・日付・グッズの＋／−。カテゴリ・景品総数を `lib/goods.js` で自動算出し、APIでも再計算します。デザイン不明・種類不明を入力でき、個別景品への推測配分はしません。金額は任意。抽選／確定が不明ならNULL、確定分が分かる場合だけ「うち確定セット」を入力できます。
- 新入力は `goodsInput: true, goodsItems: [{prizeItemId, quantity, guaranteedQuantity?}], goodsUnknown: [{prizeCategoryId, quantity, guaranteedQuantity?}], goodsUncategorized, guaranteedKnown, spendAmountYen?, drawDetails?` を既存POSTへ送信。報告合計・カテゴリ数はクライアントの申告値を受け付けず計算します。`drawDetails` がない投稿は既存simple方式（当選率対象外）、ある投稿はdetailed方式で保存します。旧API・旧フォームも後方互換で残しています。
- `GET /api/stats/items?campaign=&period=&store=&prefecture=` は公開中・取り下げていない直接投稿の受取合計（抽選＋確定セット）をD1集計します。個数は確認できた全内訳、割合は個別内訳がカテゴリ数と一致する3投稿・10個以上の部分集合のみ。外部情報・先着特典を含みません。抽選割合・ランキングは別の既存VIEWを継続利用します。
- `GET /api/benefits/latest?campaign=&benefit=&prefecture=&q=&store=&unavailable=1&limit=&offset=` は最新報告と24時間件数だけ返します（最大60店舗）。特典未指定は日本時間で最新の開始済み特典。トップは配布終了報告がある最大5店舗だけ、専用ビューは20件ずつ取得。過去特典も選べます。両方の状態があれば「直近の報告が分かれています」と表示します。
- `GET /api/me/benefit-reports` と `POST /api/me/benefit-reports/:id/withdraw` はGoogle認証必須・本人のみ。`benefit_withdrawals` で非破壊かつ重複なく取り下げ、全公開特典APIは `active_benefit_reports` を使います。取り下げで日次枠は戻しませんが、期限付き指紋を解除するので訂正版を投稿できます。復旧は権限を確認した管理者が対象のwithdrawalだけを解除可能です。
- 先着特典の `receivedQuantity` は任意（受け取れた場合のみ1〜300）。先着特典専用テーブルに保存し、ビッくらポン景品の合計に加えません。来店投稿完了後から自然に別の特典投稿へ進めます。
- 金額リスクは10万円以上、極端に小さい金額/景品比、同一日次識別子での短時間の極端金額の繰り返しをsoft加点。単一要因では拒否・pendingにせず、複数要因の合算を既存risk_scoreへ渡します。
- migration `0011_goods_experience.sql` は識別フラグ、画像参照、特典受取個数、確定分アイテム表、特典withdrawal表・読み取りVIEW・索引の追加のみ。既存reports/prizesは再構築・変換しません。本番は0011→画像マスターの差分→Pagesの順。

## 絵柄別の先着特典（0012）

- `data/benefit-items.json` にミニ巾着・湯呑み・寿司皿の計12絵柄をstable IDで登録。提供manifestの名前・カテゴリと画像を確認し、`public/bonuses/` の識別用イラストを参照します。既存ビッくらポン景品21点のマスター・画像は変更しません。
- `0012_benefit_items.sql` は `benefit_items`、`benefit_report_items`、必要な索引・FK・UNIQUE、内部risk理由、公開用VIEWの追加だけです。既存報告・景品は削除せず、絵柄への推測backfillも行いません。
- 投稿は画像を選んで複数柄を一括送信できます。受取・配布中の案内・店頭表示・終了・不明を区別し、未選択柄は送信しません。絵柄不明・特典全体の従来入力も残します。
- `POST /api/benefit-reports` は従来payloadに加え `items:[{benefitItemId,availability,observationType,receivedQuantity}]` を受付。1親報告＋選択明細を1つのbatchで保存し、複数柄でも日次枠は1件。全体のavailabilityとの同時送信は拒否します。認証・Turnstile・BAN・restrictedを継続利用。同一内容の5分以内再送を防ぎ、同じ柄の相反報告を短時間に繰り返す場合はpendingにします（従来全体報告の重複制限は1時間）。
- `GET /api/benefits/latest?summary=1` は現在弾の4絵柄の24時間内終了報告店舗数などだけ返し、トップで店舗履歴を取得しません。通常一覧は `benefit, item, prefecture, q, store, limit, offset` で絞り込み。`item=legacy` は絵柄不明・特典全体のみ。最大60行でページングします。
- `GET /api/stores/:id/benefits?current=1` または `benefit=ID` は指定店舗の対象特典だけ取得。各柄の最新日時・24時間件数・矛盾・鮮度を表示し、旧報告は別の折りたたみ欄に表示します。絵柄マスターはこれらのAPIの `benefits[].items` から共通利用できます。
- 自分の特典投稿APIは絵柄明細を返します。既存withdrawal APIで親投稿全体を取り下げ、同時投稿した全柄を公開VIEWから即除外します。原本・日次使用枠は保持します。通常グッズ・当選率・ランキングには含めません。
- 先着特典ビューの店舗選択は「見る・投稿する」で共通です。選択店舗の対象特典を既存APIから取得し、報告0件でも各柄の画像と「報告なし・在庫状況は未確認」を表示します。絵柄・特典切替や投稿後は同じ店舗を再取得し、取得失敗は報告0件と区別して再試行できます。店舗選択を解除すると一覧へ戻ります。
- 手順・対応表・非表示と復旧は [先着特典データ運用](docs/BENEFIT-ITEMS.md)。ローカルはmigration→seed→`pnpm run verify`、本番は既存データ確認→0012→特典アイテム12件だけseed→最後に1回のPages反映です。

#### 画像の追加・差し替え

`data/campaigns.json` の各prizeItemと `data/benefits.json` に `imageAsset` を設定します。今回の景品21種は、ユーザー提供の識別用イラストを日本語名・カテゴリと照合して既存stable IDへ紐付けています（[対応表](docs/PRIZE-ASSETS.md)）。実物写真ではない旨をUIに表示し、公式写真の収集・転載はしていません。実行時はこのマスターを全国・店舗・投稿・確認で共通利用し、ファイル名からの自動推測は行いません。

素材は景品が `public/prizes/`、個別特典が `public/bonuses/` です。マスターにローカル参照を設定してseedを再生成します。未設定・読込失敗時は共通プレースホルダへフォールバックします。外部URL・スクリプトURLを拒否し、マスターで参照したファイルの存在、alt・寸法・lazy loadingも検証します。投稿や景品IDは変更しません。


- `GET /api/campaigns`
- `GET /api/stores?q=&prefecture=&campaign=&limit=&cursor=`
- `GET /api/stores/:id?campaign=&period=all|period1|period2|period3|7d`
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

初期表示は静的な店舗マスター、キャンペーン、グッズ集計、疎な全体集計、先着特典概要だけを取得します。生の全reports・全外部情報・全特典履歴は返しません。直近投稿は詳しい集計、店舗詳細は店舗を開いたときに遅延取得します。GETの全国集計・店舗集計は30〜300秒の短いCDNキャッシュを許可しています。投稿直後は表示反映が少し遅れる場合があります。

当選率は5投稿かつ50抽選以上、景品カテゴリ割合は内訳をすべて入力した5投稿かつ景品20個以上を表示条件にしています。個別景品割合はカテゴリ内訳が完全な3投稿かつ10個以上、フィギュア報告割合ランキングはカテゴリ内訳が完全な5投稿かつ景品50個以上を条件にしています。`pending` / `hidden` はいずれの集計にも含めません。

店舗詳細では通常・ビッくらポン！プラス・区分不明を分け、タッチパネル／スマホ注文の内訳を維持して表示します。景品カテゴリ割合、十分な場合の全国投稿データとの数値比較、任意入力された個別景品内訳にも対応します。全期間と直近7日を切り替えられ、7日分はD1で期間集計します。

店舗一覧の初期表示は、サイト内の公開投稿数と、店舗へ紐付いた非表示以外の外部収集情報数の合計が多い順です。この外部件数は店舗を探しやすくする並び替え専用で、全国・店舗・都道府県統計やランキングには加算しません。同数の店舗は店舗マスターの順序を維持します。

投稿フォームの店舗選択は、共通の都道府県順で都道府県を選んだ後、その地域の店舗だけを選ぶ2段階方式です。個別景品はカテゴリ個数の下にある「内訳も入力する」から任意入力でき、未入力の既存投稿は `unknown` 相当のまま扱います。

## 外部参考情報

X・Google Maps・食べログ・ブログ等の一般公開情報から確認した構造化データは、`reports` ではなく外部専用テーブルへ保存します。直接投稿の全国・店舗・期間別統計、景品割合、ランキング、risk・BAN判定には一切含めません。店舗詳細を開いた場合だけ専用APIから最大10件を読み込み、投稿本文・投稿者名・アカウントID・画像は保存または転載しません。

元データは `seed/external-reports.json`、生成SQLは `seed/external-reports.sql` です。`externalUrl` が未確認なら `null`、確認済み0個は `0`、不明な数量は `null` と `quantityKind: "unknown"` を使います。利用金額を確認できた場合だけ `spendAmountYen` と `spendAmountKind`（`exact` / `approx` / `at_least`）を保存し、金額から抽選数や景品数は推測しません。URLがある場合はプラットフォーム・URL・店舗の組み合わせで重複を防ぎます。

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
6. リモートD1へ `0012_benefit_items.sql` までmigrationを適用し、初回のみ通常seed（個別特典マスタ含む）とexternal seedを投入。既存本番への更新は必要なマスター差分だけを適用
7. Pagesを一度だけ再デプロイ
8. 匿名投稿、Googleログイン、ログアウト、残り投稿件数、上限到達時の表示を確認
9. `pending`投稿が公開集計・最近の投稿に含まれないことを確認
10. 本番ドメインのHTTPS、canonical、robots、sitemapを確認

認証設定やSecretが不足している間はGoogleログインUIを表示せず、既存の匿名投稿を継続します。migrationより先に新しいFunctionsを本番反映しないでください。

## マスタデータ

キャンペーン期間と景品区分は、くら寿司の2026年8月10日付プレスリリースと公式景品画像で確認しました。個別景品マスターはフィギュア5種・缶バッジ8種・アクリルマグネット8種の計21種です。カテゴリが確認できない名称は推測で登録しません。

## 取り下げと確約景品

既存の `report_prizes` はすべて従来どおり抽選景品（`draw`）として扱います。今後入力する確約景品だけを専用テーブルへ保存し、抽選回数・当選率・抽選景品割合・ランキングには一切含めません。

標準はグッズカード入力です。従来の「かんたん入力」も入力方法の変更から利用できます。かんたん入力では利用金額・景品合計を必須、抽選回数とカテゴリ内訳を任意で保存します。当たり数や取得経路を推測できないため、専用欄で投稿数・利用金額・景品数・回答がある抽選回数だけを集計し、当選率・利用区分別集計・抽選景品割合・個別景品集計・ランキングには含めません。

「詳しく入力」では、タッチパネル・スマホ注文・抽選なしでもらった景品を同じ階層で入力し、景品カテゴリと個別景品は「今回もらった景品の合計」として1回だけ入力します。抽選回数と当たり回数にはパネル・スマホ注文だけを使います。合計に確定セット等の景品を含む投稿は、抽選景品との配分を推測できないため、抽選景品割合・個別景品集計・ランキングから除外します。従来の取得経路別投稿は後方互換で読み取り・集計します。

ログイン後の「自分の投稿」から取り下げると `report_withdrawals` に記録し、元投稿は保持したまま全国・店舗・都道府県集計、ランキング、最近の投稿、店舗の投稿一覧から除外します。本人が解除した場合は対象店舗・キャンペーンの事前集計を安全に再構築します。管理時に直接SQLで状態を変更した場合は `scripts/rebuild-stats.sql` を実行してください。

外部参考情報は `active` データを公開します。出典URLを確認中でも、確認できた構造化結果だけを公開でき、画面には「出典URL確認中」と明示します。投稿本文・投稿者情報は公開しません。誤情報などは `hidden` にすると即座に公開対象から外れます。

店舗はくら寿司公式の全国店舗一覧から、ビッくらポン！対象外と明記されている「無添蔵」を除く552店舗（47都道府県）を登録しています。店舗IDには公式詳細ページのIDを使い、住所と緯度・経度も公式一覧の値を収録しています。

公式一覧から店舗マスタを更新するときは `pnpm run data:update-stores` を実行し、件数・都道府県・ID・座標の検証後に `pnpm run db:seed` を実行します。既存店舗のIDは維持され、一覧から外れた店舗も削除せず非表示にするため、投稿データとの関連は壊れません。

## 今後の課題

`ROADMAP.md` にまとめています。地図や管理画面は運用上必要になった段階で検討します。
