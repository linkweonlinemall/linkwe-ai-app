// Pure staging behavior and real component markup; no browser or database access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const originalLoad = Module._load;
Module._load = function (request, parent, main) {
  if (request.startsWith('@/')) request = path.join(process.cwd(), request.slice(2));
  return originalLoad.call(this, request, parent, main);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, file);
require.extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) }); };
const { newStockDraft, editStockDraft, isStockDraftStaged, stagedStockLines, stockStageError, stageStockDraft, stockSelectionError, restoreStockSelection } = require('../lib/vendor/stock/staging.ts');
const { stockLineKey, filterStockProducts, parseStockAdjustment } = require('../lib/vendor/stock/model.ts');
const StockQuantityEditor = require('../components/vendor/stock/StockQuantityEditor.tsx').default;
const shirt = { id: 'shirt', name: 'Linen shirt', sku: 'SHIRT', category: 'clothing', stock: 5, hasVariants: true, variants: [
  { id: 'red-m', name: 'Red / M', sku: 'RED-M', stock: 4, attributes: 'Colour: Red · Size: M' },
  { id: 'blue-l', name: 'Blue / L', sku: 'BLUE-L', stock: 4, attributes: 'Colour: Blue · Size: L' },
] };
const tote = { id: 'tote', name: 'Canvas tote', sku: 'TOTE', category: 'bags', stock: 9, hasVariants: false, variants: [] };
const products = [shirt, tote];
const red = stockLineKey('shirt', 'red-m'), blue = stockLineKey('shirt', 'blue-l'), bag = stockLineKey('tote', null);
const draft = (productId, variantId, quantity) => editStockDraft(newStockDraft(productId, variantId), String(quantity));
let passed = 0;
function check(name, test) { test(); passed++; console.log(`PASS ${name}`); }
function add(selection, key) { const result = stageStockDraft(products, selection, key); assert.equal(result.error, null); return result.selection; }
function render(value, error = null, disabled = false) {
  return renderToStaticMarkup(React.createElement(StockQuantityEditor, { draft: value, productName: shirt.name, optionLabel: 'Colour: Red · Size: M', available: 4, error, disabled, onQuantityChange: () => {}, onAdd: () => {} }));
}
try {
  check('Selecting and typing are drafts: no batch lines or review permission until Add to update', () => {
    const selection = { [red]: draft('shirt', 'red-m', 2) };
    assert.deepEqual(stagedStockLines(selection), []);
    assert.match(stockSelectionError(products, selection), /Add the remaining item/);
    assert.equal(isStockDraftStaged(selection[red]), false);
  });
  check('Adding is a pure local operation: exact variant/quantity staged without mutating catalog stock or input state', () => {
    const selection = { [red]: draft('shirt', 'red-m', 2) };
    const before = JSON.stringify({ products, selection });
    const staged = add(selection, red);
    assert.equal(JSON.stringify({ products, selection }), before);
    assert.notEqual(staged, selection);
    assert.deepEqual(stagedStockLines(staged), [{ productId: 'shirt', variantId: 'red-m', quantity: 2 }]);
    assert.equal(stockSelectionError(products, staged), null);
  });
  check('Repeated Add replaces the keyed item instead of duplicating the deduction', () => {
    let selection = add({ [red]: draft('shirt', 'red-m', 2) }, red);
    selection = add(selection, red);
    assert.equal(stagedStockLines(selection).length, 1);
    assert.equal(stagedStockLines(selection)[0].quantity, 2);
  });
  check('Editing removes the old confirmation and staged total immediately; reverting does not silently reconfirm', () => {
    let selection = add({ [red]: draft('shirt', 'red-m', 2) }, red);
    selection = { ...selection, [red]: editStockDraft(selection[red], '3') };
    assert.equal(selection[red].stagedQuantity, null); assert.equal(selection[red].editedAfterStaging, true);
    assert.deepEqual(stagedStockLines(selection), []); assert.ok(stockSelectionError(products, selection));
    selection[red] = editStockDraft(selection[red], '2');
    assert.deepEqual(stagedStockLines(selection), []);
    selection = add(selection, red); assert.equal(selection[red].stagedQuantity, 2); assert.equal(selection[red].editedAfterStaging, false);
  });
  check('A changed draft blocks review of the whole batch, and never changes another confirmed amount', () => {
    let selection = add({ [red]: draft('shirt', 'red-m', 2), [bag]: draft('tote', null, 3) }, red);
    assert.match(stockSelectionError(products, selection), /remaining item/);
    selection = add(selection, bag);
    selection = { ...selection, [red]: editStockDraft(selection[red], '4') };
    assert.deepEqual(stagedStockLines(selection), [{ productId: 'tote', variantId: null, quantity: 3 }]);
    assert.ok(stockSelectionError(products, selection));
    const { [red]: removed, ...remaining } = selection;
    assert.ok(removed); assert.equal(stockSelectionError(products, remaining), null);
  });
  check('Invalid quantities, unavailable variants and shared-stock overages cannot be staged', () => {
    for (const quantity of ['', '0', '-1', '1.5', 'Infinity', '5', '100001']) {
      const selection = { [red]: draft('shirt', 'red-m', quantity) };
      const result = stageStockDraft(products, selection, red);
      assert.ok(result.error); assert.equal(result.selection, selection); assert.deepEqual(stagedStockLines(result.selection), []);
    }
    assert.ok(stockStageError(products, {}, red));
    assert.ok(stockStageError(products, { [red]: draft('shirt', 'wrong-variant', 1) }, red));
    const selection = add({ [red]: draft('shirt', 'red-m', 3), [blue]: draft('shirt', 'blue-l', 3) }, red);
    assert.match(stageStockDraft(products, selection, blue).error, /shared/);
    const corrected = { ...selection, [blue]: editStockDraft(selection[blue], '2') };
    assert.equal(stockSelectionError(products, add(corrected, blue)), null);
  });
  check('A refreshed catalog revalidates previously confirmed quantities before review', () => {
    const selection = add({ [red]: draft('shirt', 'red-m', 2) }, red);
    assert.ok(stockSelectionError([{ ...shirt, stock: 1 }, tote], selection));
    assert.ok(stockSelectionError([tote], selection));
  });
  check('Filtering leaves staged quantities intact, and select-visible drafts do not silently enter the batch', () => {
    const selection = add({ [red]: draft('shirt', 'red-m', 2), [bag]: draft('tote', null, 1) }, red);
    const before = JSON.stringify(selection);
    assert.deepEqual(filterStockProducts(products, 'tote', 'bags', 'available').map(p => p.id), ['tote']);
    assert.equal(JSON.stringify(selection), before); assert.equal(stagedStockLines(selection).length, 1);
    assert.ok(stockSelectionError(products, selection));
  });
  check('Pending request recovery retains the exact previously submitted batch and its retry identity', () => {
    const request = parseStockAdjustment({ storeId: 'store', requestId: '07f2bf19-1848-4bf8-84ce-906daf3c67fa', lines: [
      { productId: 'shirt', variantId: 'red-m', quantity: 2 }, { productId: 'tote', variantId: null, quantity: 3 },
    ] });
    const restored = restoreStockSelection(request.lines);
    assert.equal(stockSelectionError(products, restored), null);
    assert.deepEqual(stagedStockLines(restored), request.lines);
    assert.deepEqual(parseStockAdjustment({ ...request, lines: stagedStockLines(restored) }), request);
  });
  check('Markup exposes an explicit staging button and labelled input without a misleading confirmation', () => {
    const html = render(draft('shirt', 'red-m', 2));
    assert.match(html, /type="button"/); assert.match(html, /Add to update: Linen shirt, Colour: Red/);
    assert.match(html, /Quantity to deduct from Linen shirt/); assert.match(html, /Add this quantity to your update/);
    assert.ok(!html.includes('selected for deduction')); assert.ok(!/<button[^>]*disabled/.test(html));
  });
  check('Confirmed markup includes a tick and precise live status; repeated Add is disabled', () => {
    const selection = add({ [red]: draft('shirt', 'red-m', 2) }, red);
    const html = render(selection[red]);
    assert.match(html, /role="status"/); assert.match(html, /2 selected for deduction/);
    assert.match(html, /data-confirmed="true"[^>]*disabled/); assert.match(html, /lucide-check/);
  });
  check('Editing removes the success message and exposes the explicit reconfirmation instruction', () => {
    const selection = add({ [red]: draft('shirt', 'red-m', 2) }, red);
    const html = render(editStockDraft(selection[red], '3'));
    assert.match(html, /Quantity changed. Add it again to confirm./);
    assert.ok(!html.includes('selected for deduction')); assert.ok(!/<button[^>]*disabled/.test(html));
  });
  check('Invalid input is associated with readable validation and cannot be added; pending requests lock both controls', () => {
    const invalid = render(draft('shirt', 'red-m', ''), 'Enter a positive whole quantity.');
    assert.match(invalid, /aria-invalid="true"/); assert.match(invalid, /<button[^>]*disabled/);
    assert.match(invalid, /Enter a positive whole quantity/);
    const description = invalid.match(/aria-describedby="([^"]+)"/)[1].split(' ');
    for (const id of description) assert.ok(invalid.includes(`id="${id}"`));
    const locked = render(draft('shirt', 'red-m', 2), null, true);
    assert.match(locked, /<input[^>]*disabled/); assert.match(locked, /<button[^>]*disabled/);
  });
  console.log(`${passed} stock staging checks passed; no database or browser used.`);
} finally { Module._load = originalLoad; }
