import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const SOURCE_URL = "https://shop.kurasushi.co.jp/all";
const MINIMUM_EXPECTED_STORES = 500;
const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];
const DESIGNATED_CITIES = [
  "札幌", "仙台", "さいたま", "千葉", "横浜", "川崎", "相模原", "新潟", "静岡",
  "浜松", "名古屋", "京都", "大阪", "堺", "神戸", "岡山", "広島", "北九州", "福岡", "熊本",
];

function decodeHtmlAttribute(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function canonicalStoreName(name) {
  return name.replace(/^【改装中】/, "").replace(/【１皿[^】]*】/g, "").trim();
}

function municipalityFromAddress(address) {
  const designated = DESIGNATED_CITIES.find((city) => address.startsWith(`${city}市`));
  if (designated) {
    const ward = address.match(new RegExp(`^(${designated}市[^\\s0-9０-９-]{1,4}区)`));
    if (ward) return ward[1];
  }
  const county = address.match(/^(.+?郡.+?[町村])/);
  if (county) return county[1];
  const municipality = address.match(/^(.+?[市区町村])/);
  if (municipality) return municipality[1];
  throw new Error(`市区町村を判定できません: ${address}`);
}

export function parseStores(html) {
  const openings = [...html.matchAll(/<div class="store"([^>]*)>/g)];
  const listedStores = openings.map((opening, index) => {
    const attributes = opening[1];
    const latitude = attributes.match(/data-lat="([^"]*)"/)?.[1] ?? "";
    const longitude = attributes.match(/data-lon="([^"]*)"/)?.[1] ?? "";
    const encodedStore = attributes.match(/data-store="([^"]+)"/)?.[1];
    const blockEnd = openings[index + 1]?.index ?? html.length;
    const block = html.slice(opening.index + opening[0].length, blockEnd);
    const detailId = block.match(/href="\/detail\/(\d+)"/)?.[1];
    if (!encodedStore || !detailId) throw new Error(`店舗ブロック${index + 1}を解析できません`);

    const source = JSON.parse(decodeHtmlAttribute(encodedStore));
    const prefecture = source.pref ?? source.address?.administrativeArea;
    const sourceAddress = source.address?.addressLines?.join(" ")?.trim();
    if (!PREFECTURES.includes(prefecture) || !sourceAddress) throw new Error(`住所が不正です: detail/${detailId}`);
    const addressLine = sourceAddress.startsWith(prefecture) ? sourceAddress.slice(prefecture.length).trimStart() : sourceAddress;

    return {
      id: `kura-${detailId}`,
      name: canonicalStoreName(source.name),
      prefecture,
      city: municipalityFromAddress(addressLine),
      address: `${prefecture}${addressLine}`,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      officialUrl: `https://shop.kurasushi.co.jp/detail/${detailId}`,
      active: true,
    };
  });

  // 「無添蔵」は公式店舗一覧に含まれるが、ビッくらポン！実施対象外のため除外する。
  const stores = listedStores.filter((store) => !store.name.startsWith("無添蔵"));
  if (stores.length < MINIMUM_EXPECTED_STORES) throw new Error(`取得店舗数が少なすぎます: ${stores.length}店舗`);
  if (new Set(stores.map((store) => store.id)).size !== stores.length) throw new Error("店舗IDが重複しています");
  const missingPrefectures = PREFECTURES.filter((prefecture) => !stores.some((store) => store.prefecture === prefecture));
  if (missingPrefectures.length) throw new Error(`店舗が取得できない都道府県があります: ${missingPrefectures.join("、")}`);
  if (stores.some((store) => !Number.isFinite(store.latitude) || !Number.isFinite(store.longitude))) throw new Error("座標が不正な店舗があります");

  const prefectureOrder = new Map(PREFECTURES.map((prefecture, index) => [prefecture, index]));
  return stores.sort((a, b) =>
    prefectureOrder.get(a.prefecture) - prefectureOrder.get(b.prefecture)
      || a.city.localeCompare(b.city, "ja")
      || a.name.localeCompare(b.name, "ja"));
}

async function main() {
  const response = await fetch(SOURCE_URL, { headers: { "User-Agent": "bikkura-review store data updater" } });
  if (!response.ok) throw new Error(`公式店舗一覧を取得できませんでした: HTTP ${response.status}`);
  // 店舗情報は data-store 属性内で Unicode escape されているため、HTML本体の文字コードに依存しない。
  const html = Buffer.from(await response.arrayBuffer()).toString("latin1");
  const stores = parseStores(html);
  const outputUrl = new URL("../data/stores.json", import.meta.url);
  await writeFile(outputUrl, `${JSON.stringify(stores, null, 2)}\n`, "utf8");
  console.log(`くら寿司公式店舗一覧から${stores.length}店舗を更新しました: ${SOURCE_URL}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
