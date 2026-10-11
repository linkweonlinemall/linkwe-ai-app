// Exercises the compiled Next route/action over HTTP without controlling a browser.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const database = new URL(process.env.DATABASE_URL || '');
if (database.hostname !== '127.0.0.1' || database.port !== '55439' || database.pathname !== '/linkwe_stock_test') throw new Error('Only the disposable local stock-test database is allowed.');
if (process.env.AUTH_SECRET !== 'local-stock-review-only-not-a-production-secret') throw new Error('Use the isolated local review server configuration.');
const origin = process.env.STOCK_TEST_ORIGIN || 'http://127.0.0.1:3157';
if (!['http://127.0.0.1:3157', 'http://127.0.0.1:3158'].includes(origin)) throw new Error('HTTP checks are restricted to isolated loopback previews.');
const route = `${origin}/dashboard/vendor/catalog`;
const db = new PrismaClient();
(async () => {
  const { SignJWT } = await import('jose');
  const vendor = await db.user.findUniqueOrThrow({ where: { email: 'stock-preview@example.test' } });
  const store = await db.store.findUniqueOrThrow({ where: { ownerId: vendor.id } });
  assert.equal(store.id, 'stock-review-store');
  const cookie = async (user, role = user.role) => `lw_session=${await new SignJWT({ email: user.email, fullName: user.fullName, role }).setProtectedHeader({ alg: 'HS256' }).setSubject(user.id).setIssuedAt().setExpirationTime('5m').sign(new TextEncoder().encode(process.env.AUTH_SECRET))}`;
  const vendorCookie = await cookie(vendor);
  const manifest = require('../.next/server/server-reference-manifest.json');
  const [actionId] = Object.entries(manifest.node).find(([, value]) => value.filename === 'app/actions/vendor-stock.ts' && value.exportedName === 'submitVendorStockAdjustment');
  const [qrActionId] = Object.entries(manifest.node).find(([, value]) => value.filename === 'app/actions/vendor-stock.ts' && value.exportedName === 'resolveVendorStockQr');
  const post = async (input, sessionCookie) => {
    const response = await fetch(route, { method: 'POST', redirect: 'manual', headers: {
      'Content-Type': 'text/plain;charset=UTF-8', 'Next-Action': actionId, Origin: origin, ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    }, body: JSON.stringify([input]) });
    return { status: response.status, body: await response.text() };
  };
  const lookup = async (value, storeId, sessionCookie) => {
    const response = await fetch(route, { method: 'POST', redirect: 'manual', headers: {
      'Content-Type': 'text/plain;charset=UTF-8', 'Next-Action': qrActionId, Origin: origin, ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    }, body: JSON.stringify([value, storeId]) });
    return { status: response.status, body: await response.text() };
  };
  const anonymous = await fetch(route, { redirect: 'manual' });
  assert.equal(anonymous.status, 307); assert.ok(anonymous.headers.get('location').includes('/login'));
  for (const path of ['/pricing', '/features', '/faq']) {
    const publicPage = await fetch(`${origin}${path}`); const publicHtml = await publicPage.text();
    assert.equal(publicPage.status, 200); assert.ok(publicHtml.includes('Live Stock Update'));
    assert.ok(publicHtml.includes('active Pro')); assert.ok(publicHtml.includes('inventory only'));
    if (path === '/pricing') {
      assert.ok(publicHtml.includes('<td>Pro required</td><td>Pro required</td><td>Pro required</td><td>Included with active Pro</td>'));
      assert.ok(publicHtml.includes('<td>Free</td><td>TT$100</td><td>TT$300</td><td>TT$500</td>'));
    } else assert.ok(publicHtml.includes('href="/dashboard/vendor/catalog"'));
  }
  console.log('PASS HTTP: public pricing, feature directory and FAQ describe active-Pro stock updates; comparison prices and eligibility are correct.');
  const page = await fetch(route, { headers: { Cookie: vendorCookie } }); const html = await page.text();
  assert.equal(page.status, 200);
  for (const text of ['Live stock update', 'Vendor workspace', 'Search catalog', 'Scan product QR', 'QR Studio labels', 'Add to update', 'Select &amp; add quantities', 'Everyday linen shirt', 'Colour: Red', 'Size: M', 'Recent stock updates']) assert.ok(html.includes(text), `Page missing ${text}`);
  assert.ok(!html.includes('<video')); assert.match(page.headers.get('permissions-policy'), /camera=\(self\)/);
  assert.ok(!html.includes('This section couldn’t load'));
  console.log('PASS HTTP: anonymous login redirect; authenticated catalog renders the real workspace and option labels.');
  let product, customer, freeVendor, freeStore, freeProduct;
  const requestId = randomUUID();
  try {
    product = await db.product.create({ data: { storeId: store.id, name: 'HTTP stock test', slug: `stock-http-${requestId}`, stock: 5, tags: [], images: [] } });
    const input = { storeId: store.id, requestId, lines: [{ productId: product.id, variantId: null, quantity: 2 }] };
    const denied = await post(input); assert.equal(denied.status, 307);
    customer = await db.user.create({ data: { email: `stock-http-${requestId}@example.test`, fullName: 'HTTP test customer', role: 'CUSTOMER' } });
    const invalidRole = await post(input, await cookie(customer, 'VENDOR'));
    assert.ok(invalidRole.body.includes('"ok":false') || [303, 307].includes(invalidRole.status));
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 5);
    console.log('PASS HTTP: unsigned submissions and a vendor-claim token belonging to a current customer cannot mutate inventory.');
    const label = `https://www.linkweonlinemall.com/products/${product.slug}`;
    const anonymousQr = await lookup(label, store.id); assert.equal(anonymousQr.status, 307);
    const customerQr = await lookup(label, store.id, await cookie(customer, 'VENDOR'));
    assert.ok(customerQr.body.includes('"ok":false') || [303, 307].includes(customerQr.status));
    const wrongStore = await lookup(label, 'not-my-store', vendorCookie); assert.ok(wrongStore.body.includes('"ok":false'));
    const invalidQr = await lookup('https://evil.test/products/book', store.id, vendorCookie); assert.ok(invalidQr.body.includes('"ok":false'));
    const qrFound = await lookup(label, store.id, vendorCookie);
    assert.equal(qrFound.status, 200); assert.ok(qrFound.body.includes('"ok":true')); assert.ok(qrFound.body.includes(`"id":"${product.id}"`));
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 5);
    assert.equal(await db.stockAdjustment.count({ where: { storeId: store.id, requestId } }), 0);
    console.log('PASS HTTP: compiled QR action checks session/role/store/destination and resolves a product without deducting stock.');
    freeVendor = await db.user.create({ data: { email: `stock-free-${requestId}@example.test`, fullName: 'Free stock access test', role: 'VENDOR', region: 'port_of_spain', emailVerified: new Date(), idVerificationStatus: 'APPROVED' } });
    freeStore = await db.store.create({ data: { ownerId: freeVendor.id, name: 'Free stock access test', slug: `stock-free-${requestId}`, region: 'port_of_spain', categoryId: 'clothing_apparel', onboardingStep: 3, status: 'ACTIVE', subscriptionPlan: 'STARTER', subscriptionStatus: 'NONE' } });
    freeProduct = await db.product.create({ data: { storeId: freeStore.id, name: 'Free account private stock product', slug: `stock-free-product-${requestId}`, stock: 4, tags: [], images: [] } });
    const freeCookie = await cookie(freeVendor);
    const freePage = await fetch(route, { headers: { Cookie: freeCookie } }); const freeHtml = await freePage.text();
    assert.equal(freePage.status, 200); assert.ok(freeHtml.includes('An active Pro plan is required.'));
    assert.ok(freeHtml.includes('/dashboard/vendor/finance?tab=plan')); assert.ok(freeHtml.includes('Manage products'));
    assert.ok(!freeHtml.includes('aria-label="Search catalog"')); assert.ok(!freeHtml.includes(freeProduct.name));
    const freeInput = { storeId: freeStore.id, requestId: randomUUID(), subscriptionPlan: 'PRO', lines: [{ productId: freeProduct.id, variantId: null, quantity: 1 }] };
    const freeSubmit = await post(freeInput, freeCookie); assert.ok(freeSubmit.body.includes('"upgradeRequired":true'));
    const freeQr = await lookup(`https://www.linkweonlinemall.com/products/${freeProduct.slug}`, freeStore.id, freeCookie); assert.ok(freeQr.body.includes('"upgradeRequired":true'));
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: freeProduct.id } })).stock, 4);
    assert.equal(await db.stockAdjustment.count({ where: { storeId: freeStore.id } }), 0);
    const creationPage = await fetch(`${origin}/dashboard/vendor/creation?type=product`, { headers: { Cookie: freeCookie } });
    const creationHtml = await creationPage.text(); assert.equal(creationPage.status, 200); assert.ok(creationHtml.includes(freeProduct.name)); assert.ok(creationHtml.includes('upgrade to Pro'));
    for (const sessionCookie of [vendorCookie, freeCookie]) {
      const qrPage = await fetch(`${origin}/dashboard/vendor/qr-studio`, { headers: { Cookie: sessionCookie } }); const qrHtml = await qrPage.text();
      assert.equal(qrPage.status, 200); assert.ok(qrHtml.includes('Your product labels work with Live Stock Update'));
      assert.ok(qrHtml.includes('href="/dashboard/vendor/catalog"')); assert.ok(qrHtml.includes('every plan'));
      const financePage = await fetch(`${origin}/dashboard/vendor/finance?tab=plan`, { headers: { Cookie: sessionCookie } }); const financeHtml = await financePage.text();
      assert.equal(financePage.status, 200); assert.ok(financeHtml.includes('Explore Live Stock Update'));
      assert.ok(financeHtml.includes('active Pro')); assert.ok(financeHtml.includes('href="/dashboard/vendor/catalog"'));
    }
    console.log('PASS HTTP: Free and Pro QR Studio and Finance plan tab display the feature with a working stock-workspace link.');
    console.log('PASS HTTP: Free route shows upgrade without stock data, direct action/QR bypass is denied, and ordinary product management stays accessible.');
    const responses = await Promise.all([post(input, vendorCookie), post(input, vendorCookie)]);
    for (const response of responses) { assert.equal(response.status, 200); assert.ok(response.body.includes('"ok":true'), 'Server action must return success'); }
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 3);
    assert.equal(await db.stockAdjustment.count({ where: { storeId: store.id, requestId } }), 1);
    const changed = await post({ ...input, lines: [{ ...input.lines[0], quantity: 1 }] }, vendorCookie);
    assert.ok(changed.body.includes('"ok":false')); assert.equal((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 3);
    console.log('PASS HTTP: actual compiled server action, concurrent duplicate requests, one receipt and changed-payload rejection.');
  } finally {
    await db.stockAdjustment.deleteMany({ where: { storeId: store.id, requestId } });
    if (product) await db.product.delete({ where: { id: product.id } });
    if (customer) await db.user.delete({ where: { id: customer.id } });
    if (freeProduct) await db.product.delete({ where: { id: freeProduct.id } });
    if (freeStore) await db.store.delete({ where: { id: freeStore.id } });
    if (freeVendor) await db.user.delete({ where: { id: freeVendor.id } });
  }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
