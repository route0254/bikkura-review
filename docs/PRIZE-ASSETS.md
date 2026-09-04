# 景品画像の対応表

ユーザー提供の `bikkura-review-prize-assets` の一覧画像に記載された日本語名・カテゴリと、既存 `data/campaigns.json` のマスターを目視照合しました。ファイル名からIDを自動生成する処理はありません。

実行時の参照元は既存マスターの `imageAsset` のみです。以下の素材は画像編集せず `public/prizes/` へコピーしています。元の提供フォルダは保持し、参考シートは公開ビルドに含めません。

画像は識別用の生成イラストで、実物写真ではありません。この点を集計・投稿UIにも明記します。先着特典の画像は今回の対象外で、従来のプレースホルダを使います。

| 既存 stable ID | 景品名 | 提供素材（assets/prizes/以下） |
| --- | --- | --- |
| chiikawa-2026-figure-chiikawa | ちいかわ | figure/chiikawa.png |
| chiikawa-2026-figure-hachiware | ハチワレ | figure/hachiware.png |
| chiikawa-2026-figure-usagi | うさぎ | figure/usagi.png |
| chiikawa-2026-figure-momonga | モモンガ | figure/momonga.png |
| chiikawa-2026-figure-kurimanju | くりまんじゅう | figure/kurimanju.png |
| chiikawa-2026-can-badge-chiikawa | ちいかわ | badge/chiikawa.png |
| chiikawa-2026-can-badge-hachiware | ハチワレ | badge/hachiware.png |
| chiikawa-2026-can-badge-usagi | うさぎ | badge/usagi.png |
| chiikawa-2026-can-badge-momonga | モモンガ | badge/momonga.png |
| chiikawa-2026-can-badge-kurimanju | くりまんじゅう | badge/kurimanju.png |
| chiikawa-2026-can-badge-rakko | ラッコ | badge/rakko.png |
| chiikawa-2026-can-badge-shisa | シーサー | badge/shisa.png |
| chiikawa-2026-can-badge-anoko | あのこ | badge/anoko.png |
| chiikawa-2026-acrylic-magnet-chiikawa | ちいかわ | magnet/chiikawa.png |
| chiikawa-2026-acrylic-magnet-hachiware | ハチワレ | magnet/hachiware.png |
| chiikawa-2026-acrylic-magnet-usagi | うさぎ | magnet/usagi.png |
| chiikawa-2026-acrylic-magnet-momonga | モモンガ | magnet/momonga.png |
| chiikawa-2026-acrylic-magnet-kurimanju | くりまんじゅう | magnet/kurimanju.png |
| chiikawa-2026-acrylic-magnet-rakko | ラッコ | magnet/rakko.png |
| chiikawa-2026-acrylic-magnet-shisa | シーサー | magnet/shisa.png |
| chiikawa-2026-acrylic-magnet-anoko | あのこ | magnet/anoko.png |

- トップ・店舗詳細・投稿・確認画面は `lib/goods-ui.js` の共通画像表示を使用。
- 未設定・不正なパス・読み込み失敗は `/public/goods-placeholder.svg` にフォールバック。
- 更新時はこの対応表、マスター、画像ファイルを照合し、`node scripts/build-seed-sql.mjs` でseedを生成。
- 本番は公開ファイルの配信確認後、承認を受けて `prize_items.image_asset` のみをID指定で更新。投稿、数量、景品ID、名称は変更しません。migrationは不要です。
