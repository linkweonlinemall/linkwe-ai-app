// Synthetic fixtures only. Explicit disposable localhost database required; fixtures removed on exit.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const { randomUUID } = require('node:crypto');
const url = new URL(process.env.CATALOGUE_TEST_DATABASE_URL || 'http://not-configured');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.port !== '55471' || url.pathname !== '/linkwe_catalogue_test') {
  throw new Error('Set CATALOGUE_TEST_DATABASE_URL to the disposable localhost:55471/linkwe_catalogue_test database.');
}
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient({ datasources: { db: { url: url.href } } });
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, f);
const original = Module._load;
Module._load = function(request, parent, main) { if (request === 'server-only') return {}; return original.call(this, request, parent, main); };
const { saveCatalogueSelection } = require('../lib/vendor/catalogue/save.ts');
const suffix = randomUUID();
const owners = [`catalogue-owner-${suffix}`, `catalogue-other-${suffix}`];
const stores = [`catalogue-store-${suffix}`, `catalogue-foreign-${suffix}`];
const ids = [`a-draft-${suffix}`, `z-live-${suffix}`, `foreign-${suffix}`, `archived-${suffix}`];
const change = (id, selected = true, expected = false) => ({ id, selected, expected });
const save = changes => saveCatalogueSelection(db, owners[0], { storeId: stores[0], changes });
(async () => {
  try {
    for (let i = 0; i < 2; i++) {
      await db.user.create({ data: { id: owners[i], email: `${owners[i]}@example.test`, fullName: 'Synthetic catalogue test', role: 'VENDOR' } });
      await db.store.create({ data: { id: stores[i], ownerId: owners[i], slug: stores[i], name: 'Synthetic catalogue test', categoryId: 'retail', region: 'test', status: 'ACTIVE' } });
    }
    for (let i = 0; i < ids.length; i++) await db.product.create({ data: {
      id: ids[i], name: 'Synthetic listing', slug: ids[i], storeId: i === 2 ? stores[1] : stores[0],
      isPublished: i !== 0, isService: i === 0, isArchived: i === 3, price: 75, tags: [], images: [],
    } });
    await save([change(ids[0]), change(ids[1])]);
    let draft = await db.product.findUniqueOrThrow({ where: { id: ids[0] } });
    assert.equal(draft.isFeatured, true); assert.equal(draft.isPublished, false); assert.equal(draft.price, 75);
    await save([change(ids[0], false, true), change(ids[1], false, true)]);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: ids[1] } })).isFeatured, false);
    for (const unavailable of [ids[2], ids[3], 'missing']) {
      await assert.rejects(save([change(ids[0]), change(unavailable)]));
      assert.equal((await db.product.findUniqueOrThrow({ where: { id: ids[0] } })).isFeatured, false);
    }
    await save([change(ids[1])]);
    await assert.rejects(save([change(ids[0]), change(ids[1])]), /changed elsewhere/);
    draft = await db.product.findUniqueOrThrow({ where: { id: ids[0] } });
    assert.equal(draft.isFeatured, false, 'first update rolls back when second update conflicts');
    await assert.rejects(saveCatalogueSelection(db, owners[1], { storeId: stores[0], changes: [change(ids[0])] }));
    console.log('PASS: real PostgreSQL serializable transactions, select/deselect, private service draft, cross-store/archive/missing rejection, and rollback after partial-update conflict.');
  } finally {
    await db.product.deleteMany({ where: { id: { in: ids }, storeId: { in: stores } } });
    await db.store.deleteMany({ where: { id: { in: stores }, ownerId: { in: owners } } });
    await db.user.deleteMany({ where: { id: { in: owners }, email: { endsWith: '@example.test' } } });
    await db.$disconnect(); Module._load = original;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
