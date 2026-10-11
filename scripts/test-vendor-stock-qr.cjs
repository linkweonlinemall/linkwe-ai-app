// QR parsing, draft selection, asynchronous camera lifecycle and actual initial markup. No browser/camera access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const originalLoad = Module._load;
Module._load = function (request, parent, main) {
  if (request === '@/app/actions/vendor-stock') return { resolveVendorStockQr: () => { throw new Error('Rendering must never invoke the server'); } };
  if (request.startsWith('@/')) request = path.join(process.cwd(), request.slice(2));
  return originalLoad.call(this, request, parent, main);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, file);
require.extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) }); };
const { parseStockQr, selectScannedStockProduct } = require('../lib/vendor/stock/scan.ts');
const { createStockCameraSession } = require('../lib/vendor/stock/camera.ts');
const { newStockDraft, editStockDraft, stageStockDraft, stagedStockLines, stockSelectionError } = require('../lib/vendor/stock/staging.ts');
const { stockLineKey } = require('../lib/vendor/stock/model.ts');
const { publicQrUrl } = require('../lib/vendor/qr-studio.ts');
const { canUseLiveStock } = require('../lib/vendor/stock/access.ts');
const StockUpgrade = require('../components/vendor/stock/StockUpgrade.tsx').default;
const StockQrScanner = require('../components/vendor/stock/StockQrScanner.tsx').default;
const base = 'https://www.linkweonlinemall.com/products/';
const book = { id: 'book', name: 'Workshop book', stock: 7, variants: [], hasVariants: false };
const variants = { ...book, id: 'editions', hasVariants: true, variants: [
  { id: 'paperback', name: 'Paperback', stock: 4, attributes: 'Binding: Paperback' },
  { id: 'hardback', name: 'Hardback', stock: 3, attributes: 'Binding: Hardback' },
] };
const tick = () => new Promise(resolve => setImmediate(resolve));
const defer = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
let passed = 0;
async function check(name, run) { await run(); passed++; console.log(`PASS ${name}`); }
function camera(overrides = {}) {
  const state = { decoded: [], ready: 0, errors: 0, starts: 0, stops: 0, clears: 0, emit: () => {} };
  const driver = {
    start: async cb => { state.starts++; state.emit = cb; },
    stop: async () => { state.stops++; }, clear: () => { state.clears++; }, ...overrides,
  };
  const session = createStockCameraSession(async () => driver, value => state.decoded.push(value), () => state.ready++, () => state.errors++);
  return { state, session };
}
(async () => {
  await check('Only active Pro within its paid period is entitled; unknown plans and every lower tier fail closed', () => {
    const now = new Date('2030-01-01T00:00:00Z');
    for (const subscriptionPlan of ['STARTER', 'SERVICES', 'GROWTH', 'BUSINESS', 'ENTERPRISE', '', null]) {
      assert.equal(canUseLiveStock({ subscriptionPlan, subscriptionStatus: 'ACTIVE', planRenewsAt: null }, now), false);
    }
    for (const subscriptionStatus of ['NONE', 'PAST_DUE', 'CANCELED', null, 'unknown']) {
      assert.equal(canUseLiveStock({ subscriptionPlan: 'PRO', subscriptionStatus, planRenewsAt: null }, now), false);
    }
    for (const planRenewsAt of [null, new Date('2030-01-02')]) assert.equal(canUseLiveStock({ subscriptionPlan: 'PRO', subscriptionStatus: 'ACTIVE', planRenewsAt }, now), true);
    for (const planRenewsAt of [now, new Date('2029-12-31'), new Date('invalid')]) assert.equal(canUseLiveStock({ subscriptionPlan: 'PRO', subscriptionStatus: 'ACTIVE', planRenewsAt }, now), false);
  });
  await check('Upgrade page exposes Finance and ordinary product management without stock or scanner controls', () => {
    const html = renderToStaticMarkup(React.createElement(StockUpgrade));
    for (const text of ['An active Pro plan is required.', '/dashboard/vendor/finance', '/dashboard/vendor/creation?type=product', 'Manage products', 'ordinary stock editing']) assert.ok(html.includes(text), text);
    assert.ok(!html.includes('Start camera')); assert.ok(!html.includes('Search catalog')); assert.ok(!html.includes('Reduce stock by'));
  });
  await check('Existing QR Studio product URLs remain valid, including canonical host normalization and trailing slash', () => {
    for (const raw of [base + 'workshop-book', 'http://linkweonlinemall.com/products/workshop-book/', '  HTTPS://WWW.LINKWEONLINEMALL.COM/products/Workshop-Book  ']) {
      assert.equal(parseStockQr(raw), 'workshop-book'); assert.equal(parseStockQr(publicQrUrl(raw)), 'workshop-book');
    }
  });
  await check('Reject arbitrary destinations, non-product routes, credentials, ports, control characters, URL normalization tricks and unsupported variant hints', () => {
    for (const raw of [null, {}, 1, '', 'workshop-book', '/products/workshop-book', 'javascript:alert(1)', 'data:text/plain,hello',
      'https://evil.test/products/book', 'https://www.linkweonlinemall.com.evil.test/products/book', 'https://www.linkweonlinemall.com@evil.test/products/book',
      'https://evil.test@www.linkweonlinemall.com/products/book', 'https://www.linkweonlinemall.com:443/products/book', '//www.linkweonlinemall.com/products/book',
      'https://www.linkweonlinemall.com/store/book', 'https://www.linkweonlinemall.com/events/book', 'https://www.linkweonlinemall.com/service/book',
      base + '../products/book', base + '%2e%2e/products/book', base + 'bo%6fk', base + 'book%2Fother', base + 'book/other', base + 'book\\other',
      base + 'book?variant=hardback', base + 'book?redirect=https://evil.test', base + 'book#hardback', base + 'bo\nok', base + 'bo\tok', base + 'book\0', base + 'a'.repeat(2048)]) assert.throws(() => parseStockQr(raw), undefined, String(raw));
  });
  await check('Scanning prepares a quantity-one draft only; no staging or inventory change', () => {
    const original = JSON.stringify(book), selection = {};
    const next = selectScannedStockProduct(selection, book);
    assert.deepEqual(selection, {}); assert.equal(JSON.stringify(book), original);
    assert.equal(next[stockLineKey(book.id, null)].quantity, '1'); assert.deepEqual(stagedStockLines(next), []);
    assert.ok(stockSelectionError([book], next));
  });
  await check('Repeated scans retain edited and confirmed quantities, and never add units or duplicate lines', () => {
    const key = stockLineKey(book.id, null);
    let selection = { [key]: editStockDraft(newStockDraft(book.id, null), '3') };
    assert.equal(selectScannedStockProduct(selection, book), selection);
    selection = stageStockDraft([book], selection, key).selection;
    for (let i = 0; i < 20; i++) selection = selectScannedStockProduct(selection, book);
    assert.deepEqual(stagedStockLines(selection), [{ productId: book.id, variantId: null, quantity: 3 }]);
  });
  await check('Variant choice is always explicit, including legacy flags and one-option products', () => {
    for (const p of [variants, { ...variants, hasVariants: false }, { ...variants, variants: variants.variants.slice(0, 1) }, { ...book, hasVariants: true }]) {
      const selection = {}; assert.equal(selectScannedStockProduct(selection, p), selection);
    }
  });
  await check('Out-of-stock, untracked and full-batch scans identify an item without creating invalid drafts', () => {
    for (const stock of [0, null]) { const selection = {}; assert.equal(selectScannedStockProduct(selection, { ...book, stock }), selection); }
    const full = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [stockLineKey(String(i), null), newStockDraft(String(i), null)]));
    assert.equal(selectScannedStockProduct(full, book), full);
  });
  await check('Fresh scanned stock revalidates an existing staged amount without silently changing it', () => {
    const key = stockLineKey(book.id, null);
    const selected = stageStockDraft([book], { [key]: editStockDraft(newStockDraft(book.id, null), '3') }, key).selection;
    const changed = { ...book, stock: 1 };
    assert.equal(selectScannedStockProduct(selected, changed), selected); assert.ok(stockSelectionError([changed], selected));
    assert.equal(selected[key].stagedQuantity, 3);
  });
  await check('Camera frame bursts deliver one capture and release the stream exactly once', async () => {
    const { state, session } = camera(); await tick();
    assert.equal(state.ready, 1);
    for (let i = 0; i < 50; i++) state.emit(base + (i % 2 ? 'book' : 'editions'));
    await session.stop(); await session.stop();
    assert.equal(state.decoded.length, 1); assert.equal(state.stops, 1); assert.equal(state.clears, 1);
    state.emit(base + 'later'); assert.equal(state.decoded.length, 1);
  });
  await check('Closing before lazy loading prevents camera startup or callbacks', async () => {
    let creates = 0;
    const session = createStockCameraSession(async () => { creates++; throw new Error('must not start'); }, assert.fail, assert.fail, assert.fail);
    await session.stop(); assert.equal(creates, 0);
  });
  await check('Closing during permission/start waits for it and releases a late stream without accepting frames', async () => {
    const gate = defer(); let emit;
    const { state, session } = camera({ start: async cb => { emit = cb; await gate.promise; } });
    await tick(); const stopping = session.stop(); emit(base + 'book'); gate.resolve(); await stopping;
    assert.deepEqual(state.decoded, []); assert.equal(state.ready, 0); assert.equal(state.errors, 0);
    assert.equal(state.stops, 1); assert.equal(state.clears, 1);
  });
  await check('Denied/unavailable cameras report failure and clean up; decoder errors never deduct inventory', async () => {
    const { state, session } = camera({ start: async () => { throw new Error('NotAllowedError'); } });
    await tick(); await session.stop(); assert.equal(state.errors, 1); assert.equal(state.ready, 0);
    assert.deepEqual(state.decoded, []); assert.equal(state.stops, 1); assert.equal(state.clears, 1);
  });
  await check('Each deliberate new camera session can capture the same label once', async () => {
    for (let i = 0; i < 2; i++) { const { state, session } = camera(); await tick(); state.emit(base + 'book'); await session.stop(); assert.deepEqual(state.decoded, [base + 'book']); }
  });
  await check('Initial scanner markup asks for explicit camera permission, provides manual/search fallback, and keeps video hidden', () => {
    const html = renderToStaticMarkup(React.createElement(StockQrScanner, { storeId: 'store', onProduct: assert.fail, onClose: () => {} }));
    for (const text of ['Start camera', 'allow your browser', 'Search instead', 'Or paste the product QR link', 'Find product', 'scanning never reduces stock']) assert.ok(html.includes(text), text);
    assert.match(html, /class="cameraPreview" hidden/); assert.match(html, /maxLength="2048"/);
    assert.ok(!html.includes('<video')); assert.ok(!html.includes('getUserMedia'));
  });
  console.log(`${passed} QR checks passed; no browser or real camera used.`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { Module._load = originalLoad; });
