export function normalizeSearchText(value = "") {
  return String(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .replace(/[\s\u3000]+/g, "");
}
