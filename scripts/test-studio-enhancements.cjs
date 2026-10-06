// Pure workflow checks: no network requests, database writes or emails leave this process.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
let session = null;
let calls = [], replies = [], delivered = 0, failEmail = false, updated = [];
const people = [{ id: 'vendor-1', fullName: 'Test Vendor', email: 'vendor@example.test', role: 'VENDOR', storesOwned: [] }, { id: 'admin-1', fullName: 'Test Admin', email: 'admin@example.test', role: 'ADMIN', storesOwned: [] }];
const original = Module._load;
Module._load = function(request, parent, main) {
  if (request === '@/lib/auth/session') return { getSession: async () => session };
  if (request === '@/lib/security/rate-limit') return { checkRateLimit: async () => ({ allowed: true }) };
  if (request === 'next/cache') return { revalidatePath() {} };
  if (request === '@/lib/prisma') return { prisma: { user: { findMany: async ({where}) => people.filter(person => where.id.in.includes(person.id)), update: async () => ({}), updateMany: async input => { updated = input.where.id.in; return { count: updated.length }; } } } };
  if (request === '@/lib/email/resend') return { BASE_URL: 'https://example.test', FROM_EMAIL: 'test@example.test', resend: { emails: { send: async () => { if (failEmail) return { error: { message: 'provider unavailable' } }; delivered++; return { data: { id: 'test-only' } }; } } } };
  if (request === './admin-search' && parent?.filename.endsWith('studio-assistant.ts')) return { searchAdminRecords: async () => [{ id: 'store-1', label: 'Sample Store', kind: 'store' }] };
  if (request === './admin-records' && parent?.filename.endsWith('studio-assistant.ts')) return { getAdminRecordWorkspace: async () => ({ title: 'Sample', fields: [{name:'bankDetails',value:{accountNumber:'private-number'}}], stores:[], users:[],detailFields:{} }) };
  if (request === '@anthropic-ai/sdk') return class { messages = { create: async input => { calls.push(input); if (!replies.length) throw new Error('Unexpected model call'); return replies.shift(); } }; };
  if (request.startsWith('@/')) request = path.join(process.cwd(), request.slice(2));
  return original.call(this, request, parent, main);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText, filename);
const { planPhotoAssignments, importPhotoPatch, importPhotos } = require('../lib/imports/photos.ts');
const { validateStudioPatch, redactStudioSecrets } = require('../lib/admin/studio-rex.ts');
const { cleanRichText, richTextHtml } = require('../lib/content/rich-text.ts');
const { askCreationStudioRex } = require('../app/actions/studio-assistant.ts');
const { runBulkUserAction } = require('../app/actions/admin-bulk-user-actions.ts');
let count = 0;
async function check(name, fn) { await fn(); count++; console.log('PASS ' + name); }
const row = (id, urls = [], state = 'created') => ({id, number:2, values:{name:id,storeGallery:urls,coverPhotoUrl:urls[0]},state});
const batch = {kind:'vendor', rows:[row('A',['https://example.test/cover.jpg']),row('B')],assets:[{id:'a',url:'https://example.test/a.jpg'}, {id:'b',url:'https://example.test/b.jpg'}, {id:'c',url:'https://example.test/cover.jpg'}]};
const tool = (name,input) => ({type:'tool_use',id:'tool-'+name,name,input});
const response = (...content) => ({content});
process.env.ANTHROPIC_API_KEY = 'mock-used-only-in-this-process';
async function run() {
  await check('groups photos for one destination and preserves its cover', () => { const plans = planPhotoAssignments(batch,{a:'A',b:'A',c:'A'}); assert.equal(plans.length,1); assert.equal(plans[0].added,2); assert.deepEqual(plans[0].patch.storeGallery, ['https://example.test/cover.jpg','https://example.test/a.jpg','https://example.test/b.jpg']); assert.equal(plans[0].patch.coverPhotoUrl,'https://example.test/cover.jpg'); assert.equal(batch.rows[0].values.storeGallery.length,1); });
  await check('handles several destination groups without mixing photos', () => { const plans=planPhotoAssignments(batch,{a:'A',b:'B'}); assert.equal(plans.length,2); assert.deepEqual(plans.find(p=>p.id==='B').patch.storeGallery,['https://example.test/b.jpg']); });
  await check('retrying attached photos is a no-op', () => { assert.deepEqual(planPhotoAssignments(batch,{c:'A'}),[]); });
  await check('validates every destination before applying any group', () => { const full={...batch,rows:[batch.rows[0],row('B',Array.from({length:20},(_,i)=>`https://example.test/${i}.jpg`))]}; assert.throws(()=>planPhotoAssignments(full,{a:'A',b:'B'}),/21 photos/); assert.equal(full.rows[0].values.storeGallery.length,1); assert.throws(()=>planPhotoAssignments(batch,{missing:'A'}),/no longer available/); assert.throws(()=>planPhotoAssignments({...batch,rows:[row('A',[],'removed')]},{a:'A'}),/destination/i); });
  await check('event and product photo assignments retain their model-specific cover rules', () => { assert.deepEqual(importPhotoPatch('event',['cover','two']),{coverImage:'cover',galleryImages:['two']}); assert.deepEqual(importPhotos('event',{coverImage:'cover',galleryImages:['cover','two']}),['cover','two']); assert.deepEqual(importPhotoPatch('product',['one']),{images:['one']}); });
  await check('private credentials and account numbers are removed recursively', () => { const clean=redactStudioSecrets({values:{password:'private-pass',bankDetails:{accountNumber:'private-bank'},name:'Public'},result:{credentials:[{password:'private-result'}]}}); const json=JSON.stringify(clean); assert.doesNotMatch(json,/private-pass|private-bank|private-result/); assert.match(json,/Public/); });
  await check('Rex patches reject unknown or protected field names', () => { assert.deepEqual(validateStudioPatch({description:'Updated'},['description']),{description:'Updated'}); assert.throws(()=>validateStudioPatch({password:'x'},['description']),/not editable/); assert.throws(()=>validateStudioPatch(JSON.parse('{"__proto__":{}}'),['__proto__']),/not editable/); });
  await check('rich descriptions preserve formatting while stripping executable content', () => { const html=cleanRichText('<h2>Title</h2><p style="text-align:center;color:red" onclick="bad()"><strong>Bold</strong></p><script>bad()</script><a href="javascript:bad()">link</a>'); assert.match(html,/<strong>Bold/); assert.match(html,/text-align:center/); assert.doesNotMatch(html,/script|onclick|javascript|color:red/); assert.equal(richTextHtml('Fresh & local\nUnder < 5'), 'Fresh &amp; local<br>Under &lt; 5'); });
  const input={question:'Change the description',history:[],surfaces:[{key:'record:store:1',title:'Store',state:{values:{name:'Sample',password:'private-context'}},actions:[{name:'record_edit',description:'Edit',parameters:{type:'object',properties:{patch:{type:'object'}}}}]}]};
  await check('Creation Studio Rex requires administrator access', async()=>{ await assert.rejects(()=>askCreationStudioRex(input),/Administrator/); session={role:'VENDOR',userId:'v'}; await assert.rejects(()=>askCreationStudioRex(input),/Administrator/); assert.equal(calls.length,0); session={role:'ADMIN',userId:'admin-1'}; });
  await check('Rex queues form operations and does not claim a database save', async()=>{ calls=[];replies=[response(tool('record_edit',{patch:{description:'Better wording'}}))];const result=await askCreationStudioRex(input);assert.deepEqual(result.steps,[{action:'record_edit',args:{patch:{description:'Better wording'}}}]);assert.doesNotMatch(JSON.stringify(calls),/private-context/);assert.match(calls[0].system,/stages unsaved changes/); });
  await check('lookup tools can inspect records without returning private values to the model', async()=>{calls=[];replies=[response(tool('inspect_studio_record',{kind:'store',id:'store-1'})),response({type:'text',text:'I found the store.'})];const result=await askCreationStudioRex(input);assert.equal(result.steps.length,0);assert.doesNotMatch(JSON.stringify(calls),/private-number/); });
  await check('unknown model tool names do not become executable steps', async()=>{replies=[response(tool('delete_everything',{})),response({type:'text',text:'That control is unavailable.'})];const result=await askCreationStudioRex(input);assert.equal(result.steps.length,0);});
  await check('follow-up model calls receive actual action receipts',async()=>{calls=[];replies=[response({type:'text',text:'Your edits are staged.'})];await askCreationStudioRex({...input,receipts:['Description staged. Not saved.']});assert.match(JSON.stringify(calls[0].messages),/Description staged/);});
  await check('account actions validate names and recipient limits before running',async()=>{assert.match((await runBulkUserAction(['vendor-1'],'wrong')).error,/available/);assert.match((await runBulkUserAction(Array.from({length:251},(_,i)=>String(i)),'welcome')).error,/250/);assert.equal(delivered,0);});
  await check('account access changes report the actual affected count and protect administrators',async()=>{const result=await runBulkUserAction(['vendor-1','admin-1'],'suspend');assert.equal(result.count,1);assert.deepEqual(updated,['vendor-1']);});
  await check('email delivery failures are reported as failures to manual controls and Rex',async()=>{failEmail=true;const result=await runBulkUserAction(['vendor-1'],'welcome');assert.equal(result.count,0);assert.match(result.error,/not sent/);assert.equal(delivered,0);failEmail=false;});
  await check('vendor-only reminders do not go to unrelated accounts',async()=>{const result=await runBulkUserAction(['admin-1'],'complete_store');assert.equal(result.count,0);assert.match(result.error,/for vendors/);assert.equal(delivered,0);});
  console.log(`\n${count} studio enhancement checks passed. AI and email providers were simulated.`);
}
run().catch(error=>{console.error(error);process.exitCode=1;});
