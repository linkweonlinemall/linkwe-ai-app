import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { test } from "node:test";

const compiled = ts.transpileModule(
  fs.readFileSync(new URL("../lib/home/selection.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const scope = { exports: {} };
vm.runInNewContext(compiled, scope);
const { homepageImage, selectHomeItems } = scope.exports;

function item(id, storeId, overrides = {}) {
  return { id, storeId, brand: storeId, name: id, href: `/products/${id}`, image: `/photos/${id}.jpg`, priceLabel: "TTD 50", group: "Style", ...overrides };
}
function seeded(seed) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}

test("a large vendor cannot fill the first service or product row", () => {
  const pool = [
    ...Array.from({ length: 100 }, (_, i) => item(`photo-${i}`, "photographer")),
    item("nails", "nail-studio"), item("baking", "bakery"),
    item("soap", "soap-maker"), item("jewellery", "jeweller"), item("prints", "printer"),
  ];
  for (let seed = 1; seed <= 100; seed++) {
    const result = selectHomeItems(pool, 12, seeded(seed));
    assert.equal(new Set(result.slice(0, 3).map((x) => x.storeId)).size, 3);
    assert.equal(new Set(result.slice(0, 6).map((x) => x.storeId)).size, 6);
    assert.equal(new Set(result.map((x) => x.id)).size, result.length);
  }
});

test("blank photos and placeholders never become featured cards", () => {
  const result = selectHomeItems([
    item("blank", "a", { image: " " }), item("none", "b", { image: null }),
    item("placeholder", "c", { image: "/images/placeholder.png" }),
    item("actual", "d"), item("actual", "d"),
  ], 12, seeded(1));
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "actual");
  assert.equal(homepageImage(["", "/images/no-image.png", " https://example.com/photo.jpg "]), "https://example.com/photo.jpg");
});

test("rotation changes between requests while retaining reviewed-photo preference", () => {
  const pool = [item("maracas-is-calling-graphic-tee", "a"), item("new-listing", "b")];
  let reviewedFirst = 0;
  const orders = new Set();
  const random = seeded(73);
  for (let run = 0; run < 1000; run++) {
    const result = selectHomeItems(pool, 2, random);
    orders.add(result.map((x) => x.id).join(","));
    if (result[0].id === pool[0].id) reviewedFirst++;
  }
  assert.equal(orders.size, 2);
  assert.ok(reviewedFirst > 650 && reviewedFirst < 850);
});

test("small catalogs fill available slots without duplicates or mutation", () => {
  const pool = [item("one", "a"), item("two", "a"), item("three", "b")];
  const before = JSON.stringify(pool);
  assert.equal(selectHomeItems(pool, 12, seeded(5)).length, 3);
  assert.equal(selectHomeItems(pool, 0).length, 0);
  assert.equal(selectHomeItems([], 3).length, 0);
  assert.equal(JSON.stringify(pool), before);
});
