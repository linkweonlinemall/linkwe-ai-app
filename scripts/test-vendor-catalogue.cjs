// Offline action tests: no database, network, credentials or external mutations.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, f);
let session = { userId: 'vendor-a', role: 'VENDOR' };
let rows;
let updateCalls = 0;
const invalidations = [];
const reset = () => { rows = [
  { id: 'live', storeId: 'store-a', isArchived: false, isPublished: true, isFeatured: false, price: 75 },
  { id: 'draft', storeId: 'store-a', isArchived: false, isPublished: false, isFeatured: false, price: 25 },
  { id: 'archived', storeId: 'store-a', isArchived: true, isPublished: true, isFeatured: false, price: 9 },
  { id: 'foreign', storeId: 'store-b', isArchived: false, isPublished: true, isFeatured: false, price: 99 },
]; updateCalls = 0; };
const tx = {
  store: { findUnique: async ({ where }) => where.ownerId === 'vendor-a' ? { id: 'store-a', slug: 'island' } : null },
  product: {
    findMany: async ({ where }) => rows.filter(row => where.id.in.includes(row.id) && row.storeId === where.storeId && row.isArchived === where.isArchived),
    updateMany: async ({ where, data }) => {
      assert.deepEqual(Object.keys(data), ['isFeatured'], 'writes must not publish or overwrite unrelated fields');
      assert.equal(where.storeId, 'store-a'); assert.equal(where.isArchived, false); updateCalls++;
      const row = rows.find(row => Object.entries(where).every(([key, value]) => row[key] === value));
      if (!row) return { count: 0 }; Object.assign(row, data); return { count: 1 };
    },
  },
};
const db = { $transaction: async (callback, options) => {
  assert.equal(options.isolationLevel, 'Serializable');
  const before = structuredClone(rows);
  try { return await callback(tx); } catch (error) { rows = before; throw error; }
} };
const original = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'server-only') return {};
  if (request === '@/lib/prisma') return { prisma: db };
  if (request === '@/lib/auth/session') return { getSession: async () => session };
  if (request === 'next/cache') return { revalidatePath: value => invalidations.push(value) };
  if (request.startsWith('@/')) request = path.join(process.cwd(), request.slice(2));
  return original.call(this, request, parent, main);
};
(async () => {
  const { saveVendorCatalogue } = require('../app/actions/vendor-catalogue.ts');
  const { parseCatalogueChanges } = require('../lib/vendor/catalogue/model.ts');
  const change = (id, selected = true, expected = false) => ({ id, selected, expected });
  const save = changes => saveVendorCatalogue({ storeId: 'store-a', changes });
  reset();
  assert.equal((await save([change('live'), change('draft')])).ok, true);
  assert.equal(rows.find(row => row.id === 'live').isFeatured, true);
  assert.equal(rows.find(row => row.id === 'draft').isFeatured, true);
  assert.equal(rows.find(row => row.id === 'draft').isPublished, false, 'drafts must remain private');
  assert.equal(rows.find(row => row.id === 'live').price, 75);
  assert.ok(invalidations.includes('/store/island'));
  assert.equal((await save([change('live', false, true)])).ok, true);
  assert.equal(rows.find(row => row.id === 'live').isFeatured, false);
  for (const id of ['foreign', 'archived', 'missing']) {
    reset(); assert.equal((await save([change('live'), change(id)])).ok, false);
    assert.equal(updateCalls, 0, 'whole batch rejected before any mutation');
    assert.ok(rows.every(row => !row.isFeatured));
  }
  reset();
  assert.equal((await saveVendorCatalogue({ storeId: 'store-b', changes: [change('live')] })).ok, false);
  assert.equal(updateCalls, 0);
  for (const actor of [null, { userId: 'vendor-a', role: 'CUSTOMER' }, { userId: 'vendor-b', role: 'VENDOR' }]) {
    session = actor; assert.equal((await save([change('live')])).ok, false); assert.equal(updateCalls, 0);
  }
  session = { userId: 'vendor-a', role: 'VENDOR' };
  reset(); rows.find(row => row.id === 'live').isFeatured = true;
  assert.equal((await save([change('draft'), change('live')])).ok, false);
  assert.equal(rows.find(row => row.id === 'draft').isFeatured, false, 'conflict rolls back prior updates');
  for (const input of [null, {}, { storeId: '../escape', changes: [change('live')] }, { storeId: 'store-a', changes: [] },
    { storeId: 'store-a', changes: Array.from({ length: 501 }, (_, i) => change(`p${i}`)) },
    { storeId: 'store-a', changes: [change('live'), change('live')] },
    { storeId: 'store-a', changes: [{ id: 'live', selected: 'true', expected: false }] }]) {
    assert.throws(() => parseCatalogueChanges(input));
  }
  console.log('PASS: selection, deselection, private drafts, ownership, foreign/archived/missing IDs, anonymous/wrong-role access, stale store, bounded validation, optimistic conflict rollback, exact-field writes and public revalidation.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { Module._load = original; });
