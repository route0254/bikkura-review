import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSearchText } from "../../lib/search.js";

test("全角半角・大文字小文字・空白を吸収する", () => {
  assert.equal(normalizeSearchText(" ＡＢＬＯ Uruma "), "ablouruma");
});

test("カタカナ・ひらがな・半角カナを同じ形にする", () => {
  assert.equal(normalizeSearchText("アイモール"), normalizeSearchText("あいもーる"));
  assert.equal(normalizeSearchText("ｱｲﾓｰﾙ"), normalizeSearchText("あいもーる"));
});
