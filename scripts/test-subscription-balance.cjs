// In-memory regression tests. Never connects to a database or payment provider.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
let store, entries, conflict;
const prisma = { $transaction: async (run, options) => {
  assert.equal(options.isolationLevel, 'Serializable');
  if (conflict) throw { code: conflict };
  return run({
    store: { findUnique: async () => store, update: async ({data}) => Object.assign(store, data) },
    vendorLedgerEntry: {
      findFirst: async ({where}) => entries.find(e => where.idempotencyKey.in.includes(e.idempotencyKey)),
      findMany: async () => entries,
      create: async ({data}) => { entries.push(data); return data; },
    },
  });
} };
function load(file) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const localRequire = name => name === '@/lib/prisma' ? { prisma }
    : name.startsWith('@/') ? load(path.resolve(name.slice(2) + '.ts')) : require(name);
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, Date });
  return module.exports;
}
const { chargeSubscriptionFromBalance: charge } = load(path.resolve('lib/finance/subscription-billing.ts'));
function reset(plan, balance) {
  store = { subscriptionPlan: plan, planRenewsAt: null };
  entries = [{ entryType: 'CREDIT_ORDER_SETTLEMENT', amountMinor: balance }];
  conflict = null;
}
(async () => {
  reset('STARTER', 1880);
  assert.equal((await charge('test', 'STARTER', null, 'GROWTH')).reason, 'insufficient_balance');
  assert.equal(entries.length, 1);
  assert.equal(store.subscriptionPlan, 'STARTER');
  reset('STARTER', 50000);
  assert.equal((await charge('test', 'STARTER', null, 'GROWTH')).charged, true);
  assert.equal(entries[1].amountMinor, 30000);
  assert.equal((await charge('test', 'STARTER', null, 'GROWTH')).ok, false);
  assert.equal((await charge('test', 'GROWTH', store.planRenewsAt)).ok, false);
  assert.equal(entries.length, 2);
  reset('PRO', 100000);
  assert.equal((await charge('test', 'PRO', null, 'GROWTH')).ok, false);
  assert.equal(entries.length, 1);
  reset('GROWTH', 50000);
  assert.equal((await charge('test', 'GROWTH', null, 'PRO')).charged, true);
  assert.equal(entries[1].amountMinor, 50000);
  assert.equal(store.subscriptionPlan, 'PRO');
  reset('GROWTH', 100000);
  const { getCurrentPeriodKey } = load(path.resolve('lib/finance/ai-usage-period.ts'));
  entries.push({ idempotencyKey: `subscription:test:${getCurrentPeriodKey(null)}` });
  assert.equal((await charge('test', 'GROWTH', null)).reason, 'already_charged_this_period');
  for (const code of ['P2034', 'P2002']) {
    reset('STARTER', 100000); conflict = code;
    assert.equal((await charge('test', 'STARTER', null, 'PRO')).ok, false);
    assert.equal(entries.length, 1);
  }
  console.log('PASS: insufficient funds, exact balance, stale/repeat requests, early renewal, downgrade, legacy payment and transaction conflicts. No live payments.');
})().catch(error => { console.error(error); process.exitCode = 1; });
