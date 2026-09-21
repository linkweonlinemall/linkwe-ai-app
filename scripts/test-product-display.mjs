import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { test } from "node:test";

const source = fs.readFileSync(new URL("../lib/product/display.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const scope = { exports: {} };
vm.runInNewContext(compiled, scope);
const { productPurchaseState, selectProductAttribute, productSpecifications, digitalSpecifications, parseProductAttributes } = scope.exports;
const plain = value => JSON.parse(JSON.stringify(value));
const options = [
  { id: "red-s", name: "Red / S", sku: "RED-S", price: 0, stock: 0, images: [], attributes: [{ name: "Colour", value: "Red" }, { name: "Size", value: "S" }] },
  { id: "blue-l", name: "Blue / L", sku: "BLUE-L", price: null, stock: null, images: [], attributes: [{ name: "Colour", value: "Blue" }, { name: "Size", value: "L" }] },
];

test("requires a complete variant, preserves zero prices, and uses the base price only for null overrides", () => {
  assert.deepEqual(plain(productPurchaseState(120, 5, true, options, null)), { minPrice: 0, maxPrice: 120, stock: null, canPurchase: false });
  assert.equal(productPurchaseState(120, 5, true, [], null).canPurchase, false);
  assert.equal(productPurchaseState(120, 5, true, options, options[0]).canPurchase, false);
  assert.deepEqual(plain(productPurchaseState(120, 5, true, options, options[1])), { minPrice: 120, maxPrice: 120, stock: null, canPurchase: true });
});

test("switching between disjoint variants clears incompatible choices instead of trapping the shopper", () => {
  const changed = selectProductAttribute(options, { Colour: "Red", Size: "S" }, "Colour", "Blue");
  assert.deepEqual(plain(changed.selected), { Colour: "Blue" });
  assert.equal(changed.variant, null);
  assert.equal(changed.complete, false);
  const completed = selectProductAttribute(options, changed.selected, "Size", "L");
  assert.equal(completed.variant.id, "blue-l");
  assert.equal(completed.complete, true);
});

test("switching an attribute retains compatible choices", () => {
  const more = [...options, { ...options[1], id: "blue-s", attributes: [{ name: "Colour", value: "Blue" }, { name: "Size", value: "S" }] }];
  assert.equal(selectProductAttribute(more, { Colour: "Red", Size: "S" }, "Colour", "Blue").variant.id, "blue-s");
});

test("simple product stock is independent from variant stock", () => {
  assert.equal(productPurchaseState(50, 0, false, [], null).canPurchase, false);
  assert.equal(productPurchaseState(50, null, false, [], null).canPurchase, true);
  assert.equal(productPurchaseState(50, 4, false, [], null).stock, 4);
});

test("keeps partial measurements and a zero weight rather than dropping vendor-entered fields", () => {
  assert.deepEqual(plain(productSpecifications({ brand: "Local", sku: "LW-01", category: "local_handmade", condition: "NEW", weight: 0, weightUnit: "LB", length: null, width: 8, height: null })), [["Brand", "Local"], ["Product code", "LW-01"], ["Category", "Local Handmade"], ["Condition", "New"], ["Weight", "0 lb"], ["Width", "8 cm"]]);
});

test("displays digital limits, expiry and licence without exposing the paid file", () => {
  assert.deepEqual(plain(digitalSpecifications({ fileType: "pdf", fileSizeKb: 2048, downloadLimit: 3, downloadExpiryDays: 7, licenceType: "COMMERCIAL" })), [["File format", "PDF"], ["File size", "2.0 MB"], ["Downloads", "3 per purchase"], ["Download access", "7 days after purchase"], ["Licence", "Commercial use"]]);
  assert.deepEqual(plain(digitalSpecifications({ fileType: null, fileSizeKb: null, downloadLimit: null, downloadExpiryDays: null, licenceType: null })), [["Downloads", "Unlimited downloads"], ["Download access", "No expiry"]]);
});

test("ignores malformed stored variant attributes", () => {
  assert.deepEqual(plain(parseProductAttributes([null, 3, { name: "Size" }, { name: "Size", value: "L" }, { name: "Colour", value: "Orange", hex: "#d4450a" }])), [{ name: "Size", value: "L" }, { name: "Colour", value: "Orange", hex: "#d4450a" }]);
});
