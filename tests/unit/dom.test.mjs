import test from "node:test";
import assert from "node:assert/strict";
import { requiredElement, requiredElements } from "../../lib/dom.js";

test("必須DOMが不足した場合は初期化時に明示的なエラーにする", () => {
  const element = { id: "present" };
  const root = {
    querySelector: (selector) => selector === "#present" ? element : null,
    querySelectorAll: (selector) => selector === ".present" ? [element] : [],
  };
  assert.equal(requiredElement("#present", root), element);
  assert.deepEqual(requiredElements(".present", root), [element]);
  assert.throws(() => requiredElement("#missing", root), /Required DOM element not found/);
  assert.throws(() => requiredElements(".missing", root), /Required DOM elements not found/);
});
