// Runs with fixtures only: no database writes, emails or courier requests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = name => mocks[name] ?? (name.startsWith('@/') ? load(path.resolve(name.slice(2) + '.ts'), mocks) : require(name));
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, Date, Error, console, process, Buffer, TextEncoder, TextDecoder, URL, URLSearchParams, Response, Request, ReadableStream });
  return module.exports;
}
async function main() {
  const { escapeCsvCell } = load('lib/csv/escape-cell.ts');
  assert.equal(escapeCsvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  assert.equal(escapeCsvCell('a,b\nquoted "text"'), '"a,b\nquoted ""text"""');
  assert.equal(escapeCsvCell(-40), '-40');
  const { csvDownload, exportDateRange } = load('lib/admin/csv-stream.ts');
  assert.throws(() => exportDateRange(new URLSearchParams('from=2026-02-30')));
  assert.throws(() => exportDateRange(new URLSearchParams('from=2025-09-02&to=2025-09-01')));
  const range = exportDateRange(new URLSearchParams('from=2025-09-01&to=2025-09-01'));
  assert.equal(range.gte.toISOString(), '2025-09-01T04:00:00.000Z');
  assert.equal(range.lt.toISOString(), '2025-09-02T04:00:00.000Z');
  const cursors = [];
  const csv = csvDownload('test', ['Message'], async cursor => { cursors.push(cursor); return cursor ? [] : [{ id: 'm1', cells: ['=formula'] }]; });
  assert.match(await csv.text(), /Message\r\n'=formula/);
  assert.deepEqual(cursors, [undefined, 'm1']);
  assert.equal(csv.headers.get('cache-control'), 'private, no-store');
  console.log('PASS: formula-safe CSV, paged downloads, inclusive Trinidad date filters.');

  const bays = load('lib/fulfillment/bays.ts');
  let state = { parcels: [{ id:'s1', status:'AT_WAREHOUSE', bayNumber:null },{ id:'s2', status:'AT_WAREHOUSE', bayNumber:null }], bays:[] };
  const matches = (b,w) => (w.bayNumber == null || b.bayNumber === w.bayNumber) && (w.isOccupied == null || b.isOccupied === w.isOccupied) && (!Object.hasOwn(w,'splitOrderId') || (typeof w.splitOrderId === 'object' && w.splitOrderId ? w.splitOrderId.in.includes(b.splitOrderId) : b.splitOrderId === w.splitOrderId));
  const tx = {
    dockBay: {
      upsert: async ({where,create}) => { let b=state.bays.find(b=>b.bayNumber===where.bayNumber); if(!b) {b={...create,splitOrderId:null,isOccupied:false};state.bays.push(b);} return b; },
      updateMany: async ({where,data}) => { const rows=state.bays.filter(b=>matches(b,where)); rows.forEach(b=>Object.assign(b,data)); return {count:rows.length}; },
    },
    splitOrder: {
      findFirst: async ({where}) => state.parcels.find(p=>p.bayNumber===where.bayNumber && p.id!==where.id.not && where.status.in.includes(p.status)),
      update: async ({where,data}) => Object.assign(state.parcels.find(p=>p.id===where.id),data),
      updateMany: async ({where,data}) => {state.parcels.filter(p=>where.id.in.includes(p.id)).forEach(p=>Object.assign(p,data));},
    },
  };
  const transaction = async fn => { const before=structuredClone(state);try{return await fn();}catch(e){state=before;throw e;} };
  await transaction(()=>bays.assignBay(tx,'s1',1));
  await assert.rejects(()=>transaction(()=>bays.assignBay(tx,'s2',1)),/another vendor order/);
  assert.equal(state.bays[0].splitOrderId,'s1');
  await transaction(()=>bays.assignBay(tx,'s1',2));
  assert.equal(state.bays[0].isOccupied,false);
  assert.equal(state.bays[1].splitOrderId,'s1');
  await transaction(()=>bays.assignBay(tx,'s2',1));
  await assert.rejects(()=>transaction(()=>bays.assignBay(tx,'s1',1)),/another vendor order/);
  assert.equal(state.bays[1].splitOrderId,'s1','failed move preserves previous assignment');
  await bays.releaseBays(tx,['s1']);
  assert.equal(state.parcels[0].bayNumber,null);
  assert.equal(state.bays[1].isOccupied,false);
  state.parcels[0].bayNumber=7;
  await assert.rejects(()=>transaction(()=>bays.assignBay(tx,'s2',7)),/another vendor order/);
  await assert.rejects(()=>transaction(()=>bays.assignBay(tx,'s2',0)),/Choose a bay/);
  console.log('PASS: bay assignment, occupied-bay protection, failed-move rollback, legacy occupancy, release.');

  let account = { id:'a',email:'a@example.com',fullName:'Admin',role:'ADMIN',isActive:true,suspended:false };
  const session = load('lib/auth/session.ts', {
    react:{cache:fn=>fn}, 'next/headers':{cookies:async()=>({get:()=>({value:'fixture'})})},
    './constants':{SESSION_COOKIE_NAME:'session'}, './token':{verifySessionToken:async()=>({userId:'a',role:'ADMIN'})},
    '@/lib/prisma':{prisma:{user:{findUnique:async()=>account}}},
  });
  assert.equal((await session.getSession()).role,'ADMIN');
  account.role='CUSTOMER';assert.equal((await session.getSession()).role,'CUSTOMER');
  account.suspended=true;assert.equal(await session.getSession(),null);
  account.suspended=false;account.role='COURIER';assert.equal((await session.getSession()).role,'CUSTOMER');
  console.log('PASS: demotion and suspension take effect with existing cookies; courier access retired.');

  let role='ADMIN';let created;let calls=0;
  const userTx={user:{create:async({data})=>{created=data;calls++;return{id:'new-user'};}},notification:{create:async()=>({})}};
  const users=load('app/actions/admin-users.ts',{
    '@/lib/auth/session':{getSession:async()=>({role,userId:'a',fullName:'Admin'})},
    '@/lib/auth/password':{hashPassword:async()=> 'hashed-value'},
    '@/lib/prisma':{prisma:{$transaction:async fn=>fn(userTx)}},'next/cache':{revalidatePath:()=>{}},
  });
  const input={fullName:'New staff',email:'STAFF@example.com',password:'long-password-example',role:'ADMIN'};
  role='CUSTOMER';await assert.rejects(()=>users.createAdminUser(input));role='ADMIN';
  assert.ok((await users.createAdminUser({...input,role:'COURIER'})).error);
  assert.ok((await users.createAdminUser({...input,password:'short'})).error);
  assert.equal(calls,0);
  assert.equal((await users.createAdminUser(input)).id,'new-user');
  assert.equal(created.role,'ADMIN');assert.equal(created.email,'staff@example.com');assert.equal(created.passwordHash,'hashed-value');assert.equal(created.password,undefined);
  console.log('PASS: authorised Admin creation, password checks and retired-role rejection.');

  const records=load('app/actions/admin-records.ts',{'@/lib/auth/session':{getSession:async()=>({role:'ADMIN',userId:'a'})},'@/lib/prisma':{prisma:{$transaction:async fn=>fn({product:{update:async()=>({})},notification:{create:async()=>({})}})}},'next/cache':{revalidatePath:()=>{}}});
  assert.equal((await records.saveAdminEditableRecord('product','p',{weightUnit:'',condition:'',price:0})).ok,true);
  assert.equal((await records.saveAdminEditableRecord('service','s',{serviceLocation:'',serviceType:'BOOKABLE',durationMinutes:60})).ok,true);
  assert.ok((await records.saveAdminEditableRecord('service','s',{durationMinutes:0})).error);
  console.log('PASS: nullable product/service fields save; invalid service duration rejected.');

  const jose=await import('jose');
  const savedSecret=process.env.AUTH_SECRET;process.env.AUTH_SECRET='test-only-admin-action-signing-secret-123456789';
  try {
    const signed=load('lib/admin/assistant-actions.ts',{jose});
    const action={orderId:'o',action:'move_bay',splitId:'s',bay:4,expectedUpdatedAt:'2025-09-01T00:00:00.000Z'};
    const token=await signed.signAdminAction('a',action);
    assert.equal((await signed.readAdminAction('a',token)).bay,4);
    await assert.rejects(()=>signed.readAdminAction('other',token));
    await assert.rejects(()=>signed.readAdminAction('a',token.slice(0,-5)+'XXXXX'));
    const expired=await new jose.SignJWT({input:action}).setProtectedHeader({alg:'HS256'}).setSubject('a').setAudience('linkwe-admin-action').setExpirationTime(1).sign(new TextEncoder().encode(process.env.AUTH_SECRET));
    await assert.rejects(()=>signed.readAdminAction('a',expired));
  } finally { if(savedSecret===undefined) delete process.env.AUTH_SECRET;else process.env.AUTH_SECRET=savedSecret; }
  let mutated=false;
  const operations=load('app/actions/admin-operations.ts',{
    '@/lib/auth/session':{getSession:async()=>({role:'ADMIN',userId:'a'})},
    '@/lib/prisma':{prisma:{$transaction:async fn=>fn({mainOrder:{updateMany:async()=>({count:0}),findUniqueOrThrow:async()=>{mutated=true;}}})}},
    '@/lib/fulfillment/admin-alerts':{}, '@/lib/finance/complete-order':{}, '@/lib/fulfillment/order-status':{}, 'next/cache':{revalidatePath:()=>{}},
  });
  const stale=await operations.updateWarehouseOrder({orderId:'o',action:'move_bay',bay:4,expectedUpdatedAt:'2025-09-01T00:00:00.000Z'});
  assert.equal(stale.ok,false);assert.match(stale.error,/changed after/);assert.equal(mutated,false);
  console.log('PASS: signed AI proposals reject tampering, another user, expiry and stale order versions.');

  for(const kind of ['messages','orders','bays']) {
    const route=load(`app/api/admin/${kind}/export/route.ts`,{'@/lib/auth/session':{getSession:async()=>({role:'CUSTOMER'})},'@/lib/prisma':{prisma:{}},'@/app/actions/admin-bays':{}});
    assert.equal((await route.GET(new Request('https://example.com/export'))).status,403);
  }
  const statusStore={status:'DELIVERED'};
  const recalc=load('lib/fulfillment/order-status.ts',{'@/lib/finance/complete-order':{},'@/lib/prisma':{prisma:{mainOrder:{findUnique:async()=>statusStore,update:async({data})=>Object.assign(statusStore,data)},splitOrder:{findMany:async()=>[{status:'COMPLETED'},{status:'COMPLETED'}]}}}});
  await recalc.recalculateMainOrderStatus('o');assert.equal(statusStore.status,'COMPLETED');
  console.log('PASS: exports deny non-admin access; all completed parcels complete the customer order.');

  if(process.env.ADMIN_AI_SMOKE==='1') {
    const fixture={updatedAt:new Date().toISOString(),verification:0,payouts:0,warehouses:[],orders:[{id:'test-order',referenceNumber:'TEST-ORDER',status:'READY_TO_SHIP',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),buyer:{fullName:'Example customer'},splitOrders:[{id:'test-split',referenceNumber:'TEST-PARCEL-1',status:'AT_WAREHOUSE',bayNumber:1,warehouseReceivedAt:new Date().toISOString(),store:{name:'Example vendor'}}]}]};
    const assistant=load('app/actions/admin-assistant.ts',{'@/lib/auth/session':{getSession:async()=>({role:'ADMIN',userId:'test-admin'})},'@/app/actions/admin-operations':{getOperationsWorkspace:async()=>fixture,updateWarehouseOrder:async()=>{throw Error('Smoke test must not execute mutations');}},'@/app/actions/admin-bays':{getDockBayData:async()=>({bays:[{bayNumber:4,occupants:[],blocked:false}],unassigned:[]})},'@/lib/security/rate-limit':{checkRateLimit:async()=>({allowed:true})},jose});
    const response=await assistant.askOperationsAssistant('Move vendor order TEST-PARCEL-1 to bay 4.');
    assert.ok(!response.error,response.error);
    const proposal=response.actions?.find(a=>a.token);
    assert.ok(proposal,'Live AI returns a reviewable action');
    const signer=load('lib/admin/assistant-actions.ts',{jose});
    const input=await signer.readAdminAction('test-admin',proposal.token);
    assert.equal(input.action,'move_bay');assert.equal(input.splitId,'test-split');assert.equal(input.bay,4);
    console.log('PASS: live AI prepared a correctly targeted signed bay-move preview using fictional records only.');
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
