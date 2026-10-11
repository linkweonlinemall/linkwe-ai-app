/* Inventory-only tests. Integration mode requires the disposable, loopback test database. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
const originalLoad = Module._load;
let real, session, throwAfterCommit = false;
Module._load = function (request, parent, main) {
  if (request === 'server-only') return {};
  if (request === '@/lib/prisma') return { prisma: new Proxy({}, { get: (_, key) => key === '$transaction' ? async (...args) => {
    const result = await real.$transaction(...args);
    if (throwAfterCommit) { throwAfterCommit = false; throw new Error('Simulated lost acknowledgement'); }
    return result;
  } : typeof real[key] === 'function' ? real[key].bind(real) : real[key] }) };
  if (request === '@/lib/auth/session') return { getSession: async () => session };
  if (request === 'next/cache') return { revalidatePath: () => {} };
  if (request.startsWith('@/')) request = path.join(process.cwd(), request.slice(2));
  return originalLoad.call(this, request, parent, main);
};
require.extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, file);
const model = require('../lib/vendor/stock/model.ts');
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
let activeStoreId = 'test-store';
const input = (...lines) => ({ storeId: activeStoreId, requestId: randomUUID(), lines });
const line = (productId, quantity = 1, variantId = null) => ({ productId, variantId, quantity });

async function units() {
  await check('Strict request and quantity validation: no coercion, decimals, nonfinite values, invalid IDs, duplicates or huge batches', () => {
    for (const quantity of [0, -1, 1.5, NaN, Infinity, '2', null, 100001, Number.MAX_SAFE_INTEGER]) assert.throws(() => model.parseStockAdjustment(input(line('a', quantity))));
    for (const value of [null, {}, { requestId: 'bad', lines: [line('a')] }, input(), input(line('a'), line('a')), input(line('')), input(line('a', 1, '')), input(...Array.from({ length: 101 }, (_, i) => line(String(i))))]) assert.throws(() => model.parseStockAdjustment(value));
    assert.equal(model.parseStockAdjustment(input(line('a', 100000))).lines[0].quantity, 100000);
  });
  await check('Canonical order and collision-free product/variant keys', () => {
    assert.deepEqual(model.parseStockAdjustment(input(line('z'), line('a', 1, 'b'), line('a', 1, 'a'))).lines, [line('a', 1, 'a'), line('a', 1, 'b'), line('z')]);
    assert.notEqual(model.stockLineKey('a:b', 'c'), model.stockLineKey('a', 'b:c'));
  });
  const shirt = { id: 'p', name: 'Linen shirt', sku: 'SHIRT', category: 'clothing', stock: 5, hasVariants: true, variants: [
    { id: 'red', name: 'Red / M', sku: 'RED-M', stock: 4, attributes: 'colour: red · size: M' },
    { id: 'blue', name: 'Blue / L', sku: 'BLUE-L', stock: null, attributes: 'colour: blue · size: L' },
  ] };
  await check('Variant availability combines shared and variant stock and preserves null unlimited values', () => {
    assert.equal(model.availableStock(shirt, shirt.variants[0]), 4);
    assert.equal(model.availableStock(shirt, shirt.variants[1]), 5);
    assert.equal(model.availableStock({ ...shirt, stock: null }, { ...shirt.variants[0], stock: null }), null);
    assert.equal(model.requiresVariant({ ...shirt, hasVariants: false }), true);
  });
  await check('Catalog searches names, SKUs and option attributes; filters categories and stock', () => {
    assert.equal(model.filterStockProducts([shirt], 'red m', 'clothing', 'available').length, 1);
    assert.equal(model.filterStockProducts([shirt], 'blue-l', '', 'all').length, 1);
    assert.equal(model.filterStockProducts([shirt], '', 'food', 'all').length, 0);
    assert.equal(model.filterStockProducts([shirt], '', '', 'out').length, 0);
    assert.equal(model.filterStockProducts([{ ...shirt, stock: 0 }], '', '', 'out').length, 1);
    assert.equal(model.filterStockProducts([{ ...shirt, stock: null }], '', '', 'untracked').length, 1);
  });
  await check('Review blocks invalid/missing variants and aggregate over-deduction across options', () => {
    assert.equal(model.reviewStockLines([shirt], [line('p', 2, 'red'), line('p', 3, 'blue')]), null);
    assert.match(model.reviewStockLines([shirt], [line('p', 3, 'red'), line('p', 3, 'blue')]), /shared/);
    assert.ok(model.reviewStockLines([shirt], [line('p', 5, 'red')]));
    assert.ok(model.reviewStockLines([shirt], [line('p')]));
    assert.ok(model.reviewStockLines([shirt], [line('p', 1.5, 'red')]));
    assert.ok(model.reviewStockLines([shirt], [line('foreign')]));
  });
}

async function integration() {
  const url = new URL(process.env.DATABASE_URL || '');
  if (url.hostname !== '127.0.0.1' || url.port !== '55439' || url.pathname !== '/linkwe_stock_test') throw new Error('Integration tests require disposable 127.0.0.1:55439/linkwe_stock_test. No .env files are loaded.');
  const { PrismaClient } = require('@prisma/client');
  real = new PrismaClient();
  const { adjustVendorStock } = require('../lib/vendor/stock/adjust.ts');
  const { submitVendorStockAdjustment, loadVendorStockCatalog, resolveVendorStockQr } = require('../app/actions/vendor-stock.ts');
  const prefix = `stock-test-${randomUUID()}`;
  let store, foreignStore, vendor, foreignVendor;
  const adjustment = (...lines) => adjustVendorStock(real, vendor.id, input(...lines));
  const stockOf = async id => (await real.product.findUniqueOrThrow({ where: { id } })).stock;
  const variantStock = async id => (await real.productVariant.findUniqueOrThrow({ where: { id } })).stock;
  const product = async (name, stock, extra = {}) => real.product.create({ data: { name, stock, slug: `${prefix}-${randomUUID()}`, storeId: store.id, tags: [], images: [], ...extra } });
  try {
    await check('Actual additive migration applies cleanly to a pre-feature database and enforces its constraints', async () => {
      assert.equal(await real.stockAdjustment.count(), 0, 'Run in a fresh disposable database');
      await real.$executeRawUnsafe('DROP TABLE stock_adjustments');
      const sql = fs.readFileSync('prisma/migrations/20261011010000_vendor_stock_adjustments/migration.sql', 'utf8');
      await real.$transaction(async tx => { for (const statement of sql.split(';').filter(s => s.trim())) await tx.$executeRawUnsafe(statement); });
      const constraints = await real.$queryRaw`SELECT contype FROM pg_constraint WHERE conrelid = 'stock_adjustments'::regclass`;
      assert.ok(constraints.some(c => c.contype === 'f')); assert.ok(constraints.some(c => c.contype === 'c'));
    });
    vendor = await real.user.create({ data: { email: `${prefix}@example.test`, fullName: 'Stock test vendor', role: 'VENDOR' } });
    foreignVendor = await real.user.create({ data: { email: `${prefix}-foreign@example.test`, fullName: 'Other test vendor', role: 'VENDOR' } });
    store = await real.store.create({ data: { ownerId: vendor.id, name: 'Stock test store', slug: prefix, categoryId: 'test', region: 'test', subscriptionPlan: 'PRO', subscriptionStatus: 'ACTIVE' } });
    foreignStore = await real.store.create({ data: { ownerId: foreignVendor.id, name: 'Other test store', slug: `${prefix}-foreign`, categoryId: 'test', region: 'test', subscriptionPlan: 'PRO', subscriptionStatus: 'ACTIVE' } });
    activeStoreId = store.id;
    session = { userId: vendor.id, role: 'VENDOR' };
    const basic = await product('Basic', 20);
    const foreign = await product('Private foreign product', 10, { storeId: foreignStore.id });
    const shirt = await product('Shirt', 10, { hasVariants: true, variants: { create: [
      { name: 'Red / M', stock: 5, sku: 'RED-M', images: [], attributes: [{ name: 'colour', value: 'red' }, { name: 'size', value: 'M' }] },
      { name: 'Blue / L', stock: 8, images: [], attributes: [{ name: 'colour', value: 'blue' }, { name: 'size', value: 'L' }] },
    ] } });
    const variants = await real.productVariant.findMany({ where: { productId: shirt.id }, orderBy: { name: 'asc' } });
    const blue = variants[0], red = variants[1];
    const financialBefore = await Promise.all([real.mainOrder.count(), real.splitOrder.count(), real.vendorLedgerEntry.count(), real.paymentAttempt.count()]);
    const qr = p => `https://www.linkweonlinemall.com/products/${p.slug}`;
    await check('All non-Pro and inactive/expired Pro plans are denied at every action and the underlying stock service', async () => {
      const before = await real.stockAdjustment.count();
      const blocked = [
        { subscriptionPlan: 'STARTER', subscriptionStatus: 'NONE' },
        { subscriptionPlan: 'SERVICES', subscriptionStatus: 'ACTIVE' },
        { subscriptionPlan: 'GROWTH', subscriptionStatus: 'ACTIVE' },
        { subscriptionPlan: 'PRO', subscriptionStatus: 'NONE' },
        { subscriptionPlan: 'PRO', subscriptionStatus: 'PAST_DUE' },
        { subscriptionPlan: 'PRO', subscriptionStatus: 'CANCELED' },
        { subscriptionPlan: 'PRO', subscriptionStatus: 'ACTIVE', planRenewsAt: new Date(Date.now() - 1000) },
      ];
      for (const plan of blocked) {
        await real.store.update({ where: { id: store.id }, data: { planRenewsAt: null, ...plan } });
        const catalog = await loadVendorStockCatalog(); assert.equal(catalog.upgradeRequired, true); assert.equal('products' in catalog, false);
        const scan = await resolveVendorStockQr(qr(basic), store.id); assert.equal(scan.ok, false); assert.equal(scan.upgradeRequired, true); assert.equal('product' in scan, false);
        const denied = await submitVendorStockAdjustment({ ...input(line(basic.id)), subscriptionPlan: 'PRO', subscriptionStatus: 'ACTIVE' });
        assert.equal(denied.ok, false); assert.equal(denied.upgradeRequired, true); assert.equal(denied.uncertain, true);
        await assert.rejects(() => adjustVendorStock(real, vendor.id, input(line(basic.id))), /active Pro plan/);
        const library = await require('../lib/vendor/creation/query.ts').getCreationLibrary(vendor.id);
        assert.ok(library.items.some(p => p.id === basic.id)); assert.equal(library.liveStockAccess, false);
      }
      assert.equal(await stockOf(basic.id), 20); assert.equal(await real.stockAdjustment.count(), before);
      await real.store.update({ where: { id: store.id }, data: { subscriptionPlan: 'PRO', subscriptionStatus: 'ACTIVE', planRenewsAt: null } });
      assert.equal((await require('../lib/vendor/creation/query.ts').getCreationLibrary(vendor.id)).liveStockAccess, true);
    });
    await check('Downgrade blocks saved-request replay; renewal preserves the same receipt without another deduction', async () => {
      const p = await product('Plan recovery', 5), request = input(line(p.id, 2));
      const first = await submitVendorStockAdjustment(request); assert.equal(first.ok, true);
      await real.store.update({ where: { id: store.id }, data: { subscriptionPlan: 'STARTER', subscriptionStatus: 'NONE' } });
      const blocked = await submitVendorStockAdjustment(request); assert.equal(blocked.ok, false); assert.equal(blocked.upgradeRequired, true); assert.equal(blocked.uncertain, true);
      assert.equal(await stockOf(p.id), 3);
      await real.store.update({ where: { id: store.id }, data: { subscriptionPlan: 'PRO', subscriptionStatus: 'ACTIVE', planRenewsAt: new Date(Date.now() + 86400000) } });
      const replay = await submitVendorStockAdjustment(request); assert.equal(replay.ok, true); assert.equal(replay.replayed, true);
      assert.equal(first.receipt.id, replay.receipt.id); assert.equal(await stockOf(p.id), 3);
    });
    await check('QR lookup returns current owned product and explicit variants without changing stock or creating a receipt', async () => {
      const count = await real.stockAdjustment.count();
      const resolved = await resolveVendorStockQr(qr(basic), store.id);
      assert.equal(resolved.ok, true); assert.equal(resolved.product.id, basic.id); assert.equal(resolved.product.stock, 20);
      assert.equal('price' in resolved.product, false); assert.equal('storeId' in resolved.product, false);
      const withVariants = await resolveVendorStockQr(qr(shirt), store.id);
      assert.equal(withVariants.ok, true); assert.equal(withVariants.product.variants.length, 2);
      assert.match(withVariants.product.variants.find(v => v.id === red.id).attributes, /colour: red · size: M/);
      assert.equal(await stockOf(basic.id), 20); assert.equal(await stockOf(shirt.id), 10); assert.equal(await real.stockAdjustment.count(), count);
    });
    await check('QR lookup denies missing sessions and customer/admin roles, forged stores and account switches', async () => {
      for (const denied of [null, { userId: vendor.id, role: 'CUSTOMER' }, { userId: vendor.id, role: 'ADMIN' }]) {
        session = denied; assert.equal((await resolveVendorStockQr(qr(basic), store.id)).ok, false);
      }
      session = { userId: foreignVendor.id, role: 'VENDOR' };
      assert.equal((await resolveVendorStockQr(qr(basic), store.id)).ok, false);
      session = { userId: vendor.id, role: 'VENDOR' };
      assert.equal((await resolveVendorStockQr(qr(foreign), foreignStore.id)).ok, false);
      assert.equal((await resolveVendorStockQr(qr(basic), null)).ok, false);
    });
    await check('Foreign, missing, archived, service and digital labels disclose the same unavailable response', async () => {
      const missing = await resolveVendorStockQr(`https://www.linkweonlinemall.com/products/${prefix}-missing`, store.id);
      assert.equal(missing.ok, false);
      assert.deepEqual(await resolveVendorStockQr(qr(foreign), store.id), missing);
      for (const flags of [{ isArchived: true }, { isService: true }, { isDigital: true }]) {
        const p = await product('Hidden QR item', 2, flags);
        assert.deepEqual(await resolveVendorStockQr(qr(p), store.id), missing);
      }
    });
    await check('QR reads fresh stock and exact option data but rejects unsupported variant parameters', async () => {
      const p = await product('QR freshness', 4, { images: ['/test-book-cover.png'], hasVariants: false, variants: { create: [
        { name: 'Paperback', stock: 3, images: [], attributes: [{ name: 'Binding', value: 'Paperback' }] },
      ] } });
      let found = await resolveVendorStockQr(qr(p), store.id);
      assert.equal(found.ok, true); assert.equal(found.product.image, '/test-book-cover.png');
      assert.equal(model.requiresVariant(found.product), true);
      await real.product.update({ where: { id: p.id }, data: { stock: 1 } });
      found = await resolveVendorStockQr(qr(p), store.id); assert.equal(found.product.stock, 1);
      assert.equal((await resolveVendorStockQr(qr(p) + '?variant=wrong', store.id)).ok, false);
      assert.equal(await stockOf(p.id), 1);
    });
    await check('Scanned product still requires exact variants and final atomic submission; stale stock blocks the whole batch', async () => {
      const p = await product('QR final confirmation', 4, { hasVariants: true, variants: { create: [
        { name: 'Hardback', stock: 4, images: [], attributes: [{ name: 'Binding', value: 'Hardback' }] },
      ] } });
      const found = await resolveVendorStockQr(qr(p), store.id), variant = found.product.variants[0];
      const before = await real.stockAdjustment.count();
      assert.equal((await submitVendorStockAdjustment(input(line(p.id)))).ok, false);
      await real.productVariant.update({ where: { id: variant.id }, data: { stock: 1 } });
      assert.equal((await submitVendorStockAdjustment(input(line(basic.id), line(p.id, 2, variant.id)))).ok, false);
      assert.equal(await stockOf(basic.id), 20); assert.equal(await stockOf(p.id), 4); assert.equal(await real.stockAdjustment.count(), before);
      const request = input(line(p.id, 1, variant.id));
      const responses = await Promise.all([submitVendorStockAdjustment(request), submitVendorStockAdjustment(request)]);
      assert.ok(responses.every(r => r.ok)); assert.equal(responses[0].receipt.id, responses[1].receipt.id);
      assert.equal(await stockOf(p.id), 3); assert.equal(await variantStock(variant.id), 0);
    });
    await check('Catalog is vendor-scoped and contains explicit colour/size labels', async () => {
      const catalog = await loadVendorStockCatalog();
      assert.equal(catalog.storeId, store.id); assert.ok(!catalog.products.some(p => p.id === foreign.id));
      assert.match(catalog.products.find(p => p.id === shirt.id).variants.find(v => v.id === red.id).attributes, /colour: red · size: M/);
    });
    await check('Anonymous, customer and admin server-action attempts are rejected before writes', async () => {
      for (const denied of [null, { userId: vendor.id, role: 'CUSTOMER' }, { userId: vendor.id, role: 'ADMIN' }]) {
        session = denied; assert.equal((await submitVendorStockAdjustment(input(line(basic.id)))).ok, false); assert.equal(await loadVendorStockCatalog(), null);
      }
      session = { userId: vendor.id, role: 'VENDOR' }; assert.equal(await stockOf(basic.id), 20);
    });
    await check('Forged store/actor fields and cross-vendor products cannot deduct stock or reveal names', async () => {
      const forged = await submitVendorStockAdjustment({ ...input(line(foreign.id)), storeId: foreignStore.id, actorId: foreignVendor.id });
      assert.equal(forged.ok, false); assert.equal(await stockOf(foreign.id), 10);
      const response = await submitVendorStockAdjustment({ ...input(line(basic.id), line(foreign.id)), actorId: foreignVendor.id });
      assert.equal(response.ok, false); assert.equal(response.uncertain, false); assert.ok(!response.error.includes(foreign.name));
      assert.equal(await stockOf(basic.id), 20); assert.equal(await stockOf(foreign.id), 10);
    });
    await check('Variant selection is mandatory and foreign/mismatched options are rejected', async () => {
      for (const bad of [line(shirt.id), line(basic.id, 1, red.id), line(shirt.id, 1, 'foreign-variant')]) await assert.rejects(() => adjustment(bad), /exact/);
      assert.equal(await stockOf(shirt.id), 10); assert.equal(await variantStock(red.id), 5);
    });
    await check('Simple and multiple variant deductions atomically update shared and option stock with accurate audit snapshots', async () => {
      const result = await adjustment(line(basic.id, 2), line(shirt.id, 2, red.id), line(shirt.id, 3, blue.id));
      assert.equal(result.receipt.totalQuantity, 7); assert.equal(result.receipt.lines.length, 3);
      assert.equal(await stockOf(basic.id), 18); assert.equal(await stockOf(shirt.id), 5);
      assert.equal(await variantStock(red.id), 3); assert.equal(await variantStock(blue.id), 5);
      const audit = result.receipt.lines.find(l => l.variantId === red.id); assert.equal(audit.productStockBefore, 10); assert.equal(audit.productStockAfter, 5); assert.equal(audit.variantStockBefore, 5); assert.equal(audit.variantStockAfter, 3);
      const row = await real.stockAdjustment.findUniqueOrThrow({ where: { id: result.receipt.id } }); assert.equal(row.actorId, vendor.id); assert.equal(row.reason, 'OFFLINE_LIVE');
    });
    await check('Over-deduction of shared stock across individually available options rolls back the whole batch', async () => {
      const before = await real.stockAdjustment.count();
      await assert.rejects(() => adjustment(line(basic.id, 1), line(shirt.id, 3, red.id), line(shirt.id, 3, blue.id)), /shared/);
      assert.equal(await stockOf(basic.id), 18); assert.equal(await stockOf(shirt.id), 5); assert.equal(await variantStock(red.id), 3); assert.equal(await real.stockAdjustment.count(), before);
    });
    await check('An insufficient later line rolls back an earlier product deduction', async () => {
      const earlier = await product('Earlier', 5, { id: `${prefix}-a` }); const later = await product('Later', 0, { id: `${prefix}-z` });
      await assert.rejects(() => adjustment(line(earlier.id, 2), line(later.id, 1)), /stock/); assert.equal(await stockOf(earlier.id), 5);
    });
    await check('Variant over-deduction rolls back a valid simple-product deduction', async () => {
      await assert.rejects(() => adjustment(line(basic.id, 1), line(shirt.id, 4, red.id)), /not enough stock/);
      assert.equal(await stockOf(basic.id), 18); assert.equal(await stockOf(shirt.id), 5);
    });
    await check('Unlimited semantics: finite option only, shared stock only, and wholly untracked items', async () => {
      const optionOnly = await product('Option only', null, { hasVariants: true, variants: { create: { name: 'M', stock: 4, images: [], attributes: [] } } });
      const option = await real.productVariant.findFirstOrThrow({ where: { productId: optionOnly.id } });
      await adjustment(line(optionOnly.id, 2, option.id)); assert.equal(await stockOf(optionOnly.id), null); assert.equal(await variantStock(option.id), 2);
      const sharedOnly = await product('Shared only', 4, { hasVariants: true, variants: { create: { name: 'L', stock: null, images: [], attributes: [] } } });
      const sharedOption = await real.productVariant.findFirstOrThrow({ where: { productId: sharedOnly.id } });
      await adjustment(line(sharedOnly.id, 2, sharedOption.id)); assert.equal(await stockOf(sharedOnly.id), 2); assert.equal(await variantStock(sharedOption.id), null);
      const unlimited = await product('Unlimited', null); await assert.rejects(() => adjustment(line(unlimited.id)), /set a stock quantity/);
      const noVariants = await product('Broken variants', 5, { hasVariants: true }); await assert.rejects(() => adjustment(line(noVariants.id)), /exact/);
    });
    await check('Archived, service and digital products are excluded from mutation and catalog', async () => {
      const excluded = [];
      for (const flags of [{ isArchived: true }, { isService: true }, { isDigital: true }]) { const p = await product('Excluded', 3, flags); excluded.push(p.id); await assert.rejects(() => adjustment(line(p.id)), /unavailable/); }
      const catalog = await loadVendorStockCatalog(); assert.ok(!catalog.products.some(p => excluded.includes(p.id)));
    });
    await check('Existing variants require explicit selection even if the legacy hasVariants flag is false', async () => {
      const p = await product('Legacy options', 5, { variants: { create: { name: 'Size S', stock: 5, images: [], attributes: [] } } });
      await assert.rejects(() => adjustment(line(p.id)), /exact/);
      const v = await real.productVariant.findFirstOrThrow({ where: { productId: p.id } }); await adjustment(line(p.id, 1, v.id)); assert.equal(await variantStock(v.id), 4);
    });
    await check('Concurrent separate adjustments cannot overdraw a product', async () => {
      const p = await product('Concurrent', 5);
      const results = await Promise.allSettled([adjustment(line(p.id, 4)), adjustment(line(p.id, 4))]);
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(await stockOf(p.id), 1);
    });
    await check('Concurrent variant-only deductions cannot overdraw an option', async () => {
      const p = await product('Concurrent option', null, { hasVariants: true, variants: { create: { name: 'M', stock: 3, images: [], attributes: [] } } });
      const v = await real.productVariant.findFirstOrThrow({ where: { productId: p.id } });
      const results = await Promise.allSettled([adjustment(line(p.id, 2, v.id)), adjustment(line(p.id, 2, v.id))]);
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(await variantStock(v.id), 1);
    });
    await check('Concurrent different options respect their shared product stock', async () => {
      const p = await product('Concurrent shared', 3, { hasVariants: true, variants: { create: ['A', 'B'].map(name => ({ name, stock: 5, images: [], attributes: [] })) } });
      const vs = await real.productVariant.findMany({ where: { productId: p.id } });
      const results = await Promise.allSettled(vs.map(v => adjustment(line(p.id, 2, v.id))));
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(await stockOf(p.id), 1);
      assert.equal((await Promise.all(vs.map(v => variantStock(v.id)))).reduce((a, b) => a + b), 8);
    });
    await check('Simultaneous and repeated identical requests produce one deduction and one receipt', async () => {
      const p = await product('Repeated', 5); const request = input(line(p.id, 2));
      const results = await Promise.all(Array.from({ length: 4 }, () => adjustVendorStock(real, vendor.id, request)));
      assert.equal(new Set(results.map(r => r.receipt.id)).size, 1); assert.equal(results.filter(r => !r.replayed).length, 1); assert.equal(await stockOf(p.id), 3);
      assert.equal(await real.stockAdjustment.count({ where: { storeId: store.id, requestId: request.requestId } }), 1);
      await real.product.update({ where: { id: p.id }, data: { isArchived: true } });
      assert.equal((await adjustVendorStock(real, vendor.id, request)).replayed, true);
      await assert.rejects(() => adjustVendorStock(real, vendor.id, { ...request, lines: [line(p.id, 1)] }), /different adjustment/);
    });
    await check('Line reordering remains idempotent and keys are scoped to the authenticated store', async () => {
      const a = await product('Order A', 5), b = await product('Order B', 5); const request = input(line(a.id), line(b.id));
      const first = await adjustVendorStock(real, vendor.id, request); const repeated = await adjustVendorStock(real, vendor.id, { ...request, lines: request.lines.toReversed() });
      assert.equal(first.receipt.id, repeated.receipt.id);
      await assert.rejects(() => adjustVendorStock(real, foreignVendor.id, { ...request, storeId: foreignStore.id }), /unavailable/);
      await adjustVendorStock(real, foreignVendor.id, { ...request, storeId: foreignStore.id, lines: [line(foreign.id)] }); assert.equal(await stockOf(foreign.id), 9);
    });
    await check('Lost acknowledgement after commit returns uncertain; retry safely recovers the same receipt', async () => {
      const p = await product('Lost response', 5); const request = input(line(p.id, 2)); throwAfterCommit = true;
      const lost = await submitVendorStockAdjustment(request); assert.equal(lost.ok, false); assert.equal(lost.uncertain, true); assert.equal(await stockOf(p.id), 3);
      const retry = await submitVendorStockAdjustment(request); assert.equal(retry.ok, true); assert.equal(retry.replayed, true); assert.equal(await stockOf(p.id), 3);
    });
    await check('Expired or switched sessions retain uncertain requests until the original vendor confirms them', async () => {
      const p = await product('Session recovery', 5); const request = input(line(p.id, 2));
      await submitVendorStockAdjustment(request);
      session = null; const expired = await submitVendorStockAdjustment(request); assert.equal(expired.ok, false); assert.equal(expired.uncertain, true);
      session = { userId: foreignVendor.id, role: 'VENDOR' };
      const switched = await submitVendorStockAdjustment(request); assert.equal(switched.ok, false); assert.equal(switched.uncertain, true);
      session = { userId: vendor.id, role: 'VENDOR' };
      const retry = await submitVendorStockAdjustment(request); assert.equal(retry.ok, true); assert.equal(retry.replayed, true); assert.equal(await stockOf(p.id), 3);
    });
    await check('Audit history is vendor-scoped, capped at ten, and financial records remain unchanged', async () => {
      const catalog = await loadVendorStockCatalog(); assert.equal(catalog.recent.length, 10);
      for (const receipt of catalog.recent) assert.equal((await real.stockAdjustment.findUniqueOrThrow({ where: { id: receipt.id } })).storeId, store.id);
      assert.deepEqual(await Promise.all([real.mainOrder.count(), real.splitOrder.count(), real.vendorLedgerEntry.count(), real.paymentAttempt.count()]), financialBefore);
    });
  } finally {
    if (store && foreignStore) {
      const ids = [store.id, foreignStore.id];
      await real.stockAdjustment.deleteMany({ where: { storeId: { in: ids } } });
      await real.productVariant.deleteMany({ where: { product: { storeId: { in: ids } } } });
      await real.product.deleteMany({ where: { storeId: { in: ids } } });
      await real.store.deleteMany({ where: { id: { in: ids } } });
    }
    await real.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await real.$disconnect();
  }
}
(async () => { await units(); if (process.argv.includes('--integration')) await integration(); console.log(`${passed} stock checks passed. Test fixtures cleaned up.`); })()
  .catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { Module._load = originalLoad; });
