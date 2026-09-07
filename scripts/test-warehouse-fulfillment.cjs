// Regression checks with in-memory data. No database or provider calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = name => mocks[name] ?? (name.startsWith('@/') ? load(path.resolve(name.slice(2) + '.ts'), mocks) : require(name));
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, Date, console, process });
  return module.exports;
}
const { computePerStoreShipping: shipping } = load(path.resolve('lib/shipping/per-store-shipping.ts'));
const store = (id, weight = 2, digital = false) => ({ storeId: id, storeName: id, shippingMode: 'LINKWE', latitude: 10.4, longitude: -61.3, region: 'chaguanas', totalWeightLbs: weight, allItemsDigitalOrPickup: digital, isDigitalOnly: digital });
const input = { region: 'chaguanas', warehouse: { latitude: 10.5, longitude: -61.4, region: 'chaguanas' }, destinationLatitude: 10.5, destinationLongitude: -61.4 };
assert.equal(shipping({ ...input, stores: [store('a')] }).totalShippingMinor, 4000);
assert.equal(shipping({ ...input, stores: [store('a'), store('b'), store('c')] }).totalShippingMinor, 4000);
assert.equal(shipping({ ...input, stores: [store('a', 0, true), store('b')] }).perStore[0].shippingMinor, 0);
assert.equal(shipping({ ...input, stores: [store('a', 0, true), store('b', 0, true)] }).totalShippingMinor, 0);
assert.equal(shipping({ ...input, stores: [] }).totalShippingMinor, 0);
assert.equal(shipping({ ...input, stores: [store('a', 30), store('b', 31)] }).totalShippingMinor, 8000);
const { getCourierPickupFeeMinor } = load(path.resolve('lib/fulfillment/courier-pickup-rates.ts'));
for (const region of ['chaguanas', 'tobago', 'unknown']) for (const weight of [1, 50, 150]) assert.equal(getCourierPickupFeeMinor(region, weight), 4000);
const entries = [];
let inbound = 'PICKUP_REQUESTED';
const tx = {
  splitOrder: { findUnique: async () => ({ vendorInboundMethod: inbound, inboundShipmentId: 'ship1', inboundShipment: { pickupFeeMinor: 4000 } }) },
  vendorLedgerEntry: {
    findFirst: async ({ where }) => entries.find(e => e.idempotencyKey === where.idempotencyKey),
    upsert: async ({ where, create }) => { const found = entries.find(e => e.idempotencyKey === where.idempotencyKey); if (!found) entries.push(create); return found ?? create; },
    create: async ({ data }) => { entries.push(data); return data; },
  },
};
const ledger = load(path.resolve('lib/finance/release-earnings.ts'), { '@/lib/prisma': { prisma: {} } });
(async () => {
  const payload = { storeId: 'store1', splitOrderId: 'split1', mainOrderId: 'main1', subtotalMinor: 10000, plan: 'STARTER', ledgerEntryType: 'ORDER_REVENUE', idempotencyKey: 'split:split1:ORDER_REVENUE', description: 'test' };
  await ledger.createProductOrderEarningsLedger(tx, payload);
  await ledger.createProductOrderEarningsLedger(tx, payload);
  assert.equal(entries.filter(e => e.ledgerEntryType === 'COURIER_PICKUP_FEE').length, 1);
  assert.equal(entries.find(e => e.ledgerEntryType === 'COURIER_PICKUP_FEE').entryType, 'DEBIT_ADJUSTMENT');
  await ledger.createProductOrderEarningsLedger(tx, { ...payload, splitOrderId: 'split2', idempotencyKey: 'split:split2:ORDER_AUTO_COMPLETE', ledgerEntryType: 'ORDER_AUTO_COMPLETE' });
  assert.equal(entries.filter(e => e.ledgerEntryType === 'COURIER_PICKUP_FEE').length, 1, 'legacy batched shipment charged once');
  inbound = 'VENDOR_DROPOFF';
  await ledger.createProductOrderEarningsLedger(tx, { ...payload, splitOrderId: 'split3', idempotencyKey: 'split:split3:ORDER_REVENUE' });
  assert.equal(entries.filter(e => e.ledgerEntryType === 'COURIER_PICKUP_FEE').length, 1, 'dropoff stays free');
  console.log('PASS: consolidated shipping, digital exemptions, weight bands, flat collection fees, idempotent settlement and free dropoff.');
})().catch(error => { console.error(error); process.exitCode = 1; });

(async () => {
  let role = 'ADMIN';
  let state;
  function reset() { state = { id: 'order', buyerId: 'buyer', status: 'PROCESSING', shippingAddressId: 'address', referenceNumber: 'LW-1', items: [{ storeId: 'store1', product: { isDigital: false } }, { storeId: 'store2', product: { isDigital: false } }], splitOrders: [{ id: 's1', storeId: 'store1', status: 'VENDOR_PREPARING', warehouseReceivedAt: null }, { id: 's2', storeId: 'store2', status: 'VENDOR_PREPARING', warehouseReceivedAt: null }], shippingBundles: [] }; }
  reset();
  const tx = {
    mainOrder: { update: async () => ({}), findUniqueOrThrow: async () => structuredClone(state) },
    splitOrder: {
      update: async ({ where, data }) => Object.assign(state.splitOrders.find(s => s.id === where.id), data),
      updateMany: async ({ where, data }) => { for (const s of state.splitOrders) if (where.id.in.includes(s.id)) Object.assign(s, data); return { count: 2 }; },
    },
    warehouse: { findFirst: async () => ({ id: 'warehouse' }) },
    store: { findUniqueOrThrow: async () => ({ ownerId: 'vendor' }) },
    notification: { create: async () => ({}) },
    orderDocument: { create: async () => ({}) },
    shippingBundle: { create: async ({ data }) => { const b = { id: 'bundle', ...data }; state.shippingBundles.push(b); return b; }, update: async ({ where, data }) => Object.assign(state.shippingBundles.find(b => b.id === where.id), data) },
    shipment: { create: async ({ data }) => ({ id: 'shipment', ...data }), updateMany: async () => ({ count: 1 }) },
    dockBay: { updateMany: async () => ({ count: 1 }) },
  };
  const ops = load(path.resolve('app/actions/admin-operations.ts'), {
    '@/lib/auth/session': { getSession: async () => ({ role, userId: 'admin', fullName: 'Staff' }) },
    '@/lib/prisma': { prisma: { $transaction: async (fn) => { const before = structuredClone(state); try { return await fn(tx); } catch (e) { state = before; throw e; } } } },
    '@/lib/fulfillment/admin-alerts': { alertOperations: async () => {} },
    '@/lib/fulfillment/order-status': { recalculateMainOrderStatus: async () => {} },
    '@/lib/finance/complete-order': { getOrderAutoCompleteAt: d => d },
    'next/cache': { revalidatePath: () => {} },
  });
  const act = (action, more = {}) => ops.updateWarehouseOrder({ orderId: 'order', action, ...more });
  role = 'VENDOR'; await assert.rejects(() => act('pack')); role = 'ADMIN';
  assert.equal((await act('dispatch', { reference: 'CSF1' })).ok, false, 'cannot bypass warehouse');
  assert.equal((await act('pack')).ok, false, 'cannot pack missing parcels');
  assert.equal((await act('receive', { splitId: 's1' })).ok, true);
  assert.equal((await act('receive', { splitId: 's1' })).ok, false, 'no duplicate receipt');
  assert.equal((await act('pack')).ok, false, 'one missing vendor blocks pack');
  assert.equal((await act('receive', { splitId: 's2' })).ok, true);
  assert.equal((await act('pack')).ok, true);
  assert.equal(state.shippingBundles.length, 1);
  assert.equal((await act('pack')).ok, false, 'no duplicate bundle');
  assert.equal((await act('dispatch')).ok, false, 'CSF reference required');
  assert.equal((await act('dispatch', { reference: 'CSF1' })).ok, true);
  assert.equal((await act('dispatch', { reference: 'CSF2' })).ok, false, 'no duplicate dispatch');
  assert.equal((await act('deliver')).ok, false, 'delivery evidence required');
  assert.equal((await act('deliver', { note: 'CSF confirmed receipt' })).ok, true);
  reset(); state.shippingAddressId = null; state.splitOrders.forEach(s => { s.status = 'PACKAGED'; s.warehouseReceivedAt = new Date(); });
  assert.equal((await act('dispatch', { reference: 'CSF1' })).ok, false, 'warehouse pickup cannot be courier dispatched');
  assert.equal((await act('pickup_ready')).ok, true);
  console.log('PASS: admin authorization, partial receipt guards, assembly, booking references, duplicate dispatch prevention and warehouse pickup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
