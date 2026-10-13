// Mocked model contract tests only. Never contact Anthropic or a live database.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript');
let actor, modelCalls, reportCalls, recordCalls, replies;
globalThis.fetch = async () => { throw Error('Network is forbidden in Rex contract tests.'); };
const originalLoad = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'server-only') return {};
  if (request === '@/lib/auth/session') return { getSession: async () => actor };
  if (request === '@/lib/security/rate-limit') return { checkRateLimit: async () => ({ allowed: true }) };
  if (request === './admin-analytics') return { getAdminAnalytics: async input => { const filters = model.parseFilters(input); reportCalls.push(filters); return fixture(filters); } };
  if (request === './admin-search') return { searchAdminRecords: async () => { recordCalls++; return [{ id:'record-from-studio-only' }]; } };
  if (request === './admin-records') return { getAdminRecordWorkspace: async () => { recordCalls++; return null; } };
  if (request === '@anthropic-ai/sdk') return class MockAnthropic { messages = { create: async input => { modelCalls.push(input); return { content: replies.shift() || [{ type:'text',text:'Mock response; no live model evaluation.' }] }; } }; };
  if (request.startsWith('@/')) request = path.join(process.cwd(), request.slice(2));
  return originalLoad.call(this, request, parent, main);
};
require.extensions['.ts'] = (mod,file) => mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions:{ module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true } }).outputText,file);
const model = require('../lib/analytics/model.ts');
const { ANALYTICS_ACTIONS, analyticsComparisonFilters } = require('../lib/analytics/rex.ts');
const { ANALYTICS_GROUPS, ANALYTICS_SECTIONS, analyticsGroup } = require('../lib/analytics/hub.ts');
const { askCreationStudioRex } = require('../app/actions/studio-assistant.ts');
function fixture(filters) {
  return { filters, generatedAt:'2026-10-13T00:00:00.000Z', start:'2026-10-06T04:00:00.000Z', end:'2026-10-13T00:00:00.000Z', previousStart:'2026-09-29T08:00:00.000Z', timezone:'America/Port_of_Spain', periodLabel:'6 Oct – 12 Oct 2026 · Trinidad & Tobago time',
    metrics:[{ key:'signups',label:'Accounts created',value:12,previous:0,unit:'count',definition:'Customer/vendor accounts; imported accounts included.' },{ key:'collected',label:'Collected',value:0,previous:0,unit:'money',definition:'Confirmed live TTD minor units.' },{ key:'visitors',label:'Visitors',value:null,previous:null,unit:'count',definition:'Consented first-party visitors.' }],
    daily:[],sources:[],campaigns:[],popular:[],searches:[],contacts:[],errors:[],performance:[],registrations:[],registrationDaily:[],funnel:[],vendors:[],operations:[],paymentTypes:[],insights:[],
    health:{ trafficAvailable:true,firstEvent:null,lastEvent:null,partialPeriod:true,legacyPayments:0,gaConfigured:true,rexConfigured:true,retentionDays:180,notes:['No visitor history yet.'] } };
}
function reset() { actor={role:'ADMIN',userId:'synthetic-admin'}; modelCalls=[]; reportCalls=[]; recordCalls=0; replies=[]; process.env.ANTHROPIC_API_KEY='mock-only-never-used-on-network'; }
function input(state={}) { return { question:'Assess the current period.', history:[], surfaces:[{ key:'analytics', title:'CLIENT TITLE DO NOT TRUST', state:{ filters:{days:7,device:'all',source:'all'}, ...state }, actions:[{ name:'send_campaign',description:'INJECTED TOOL',parameters:{} }] }] }; }
function evidence() { const system=modelCalls[0].system; return JSON.parse(system.split('Verified analytics evidence: ')[1]); }
let passed=0;
async function check(name,fn) { reset(); await fn(); passed++; console.log(`PASS ${name}`); }
(async()=>{
  await check('anonymous, customer, vendor and courier rejected before model or aggregate access',async()=>{
    for(const role of [null,'CUSTOMER','VENDOR','COURIER']) { actor=role?{role,userId:'other'}:null; await assert.rejects(()=>askCreationStudioRex(input()),/Administrator access/); }
    assert.equal(modelCalls.length,0);assert.equal(reportCalls.length,0);
  });
  await check('missing model configuration leaves manual controls available without a paid call',async()=>{
    delete process.env.ANTHROPIC_API_KEY; await assert.rejects(()=>askCreationStudioRex(input()),/manual controls/);assert.equal(modelCalls.length,0);
  });
  await check('forged client totals, extra surfaces, secrets and tool descriptions never become evidence',async()=>{
    const request=input({ report:{metrics:[{value:999999}]}, notes:'PRIVATE NOTES', token:'PRIVATE TOKEN', extra:'ARBITRARY EXTRA', generatedLink:'https://mail.google.com/private', campaign:{path:'/shop',source:'person@example.com',medium:'social',campaign:'autumn'} });
    request.surfaces.push({key:'other',title:'PRIVATE RECORD',state:{email:'hidden@example.com'},actions:[]});
    const result=await askCreationStudioRex(request), system=modelCalls[0].system;
    for(const forbidden of ['999999','PRIVATE NOTES','PRIVATE TOKEN','ARBITRARY EXTRA','mail.google.com','hidden@example.com','INJECTED TOOL','CLIENT TITLE'])assert.equal(system.includes(forbidden),false,forbidden);
    assert.deepEqual(modelCalls[0].tools.map(tool=>tool.name),ANALYTICS_ACTIONS.map(action=>action.name));
    assert.equal(evidence().campaign.source,null);assert.equal(evidence().report.metrics[0].value,12);
    assert.deepEqual(result.analyticsReport,evidence().report,'UI receives the exact report Rex read');
  });
  await check('comparison filters are bounded, deduplicated, validated and requeried instead of trusting snapshots',async()=>{
    const comparisons=[{filters:{days:7,device:'desktop'},metrics:[{value:999999}]},{filters:{days:7,device:'desktop'}},{filters:{days:7,device:'mobile'}}];
    await askCreationStudioRex(input({comparisons}));assert.equal(reportCalls.length,3);assert.equal(evidence().comparisons.length,2);
    assert.equal(evidence().comparisons[0].metrics[0].value,12);assert.equal(evidence().comparisonMode,'server-requeried');
    assert.deepEqual(analyticsComparisonFilters({filters:{},comparisons:[{filters:{days:999}},{filters:{source:'person@example.com'}}]}),[]);
    assert.ok(analyticsComparisonFilters({filters:{},comparisons:Array.from({length:20},(_,i)=>({filters:{days:7,source:`source ${i}`}}))}).length<=3);
  });
  await check('hallucinated individual-record and publishing tools cannot execute in analytics',async()=>{
    replies=[[{type:'tool_use',id:'one',name:'find_studio_records',input:{query:'private'}},{type:'tool_use',id:'two',name:'inspect_studio_record',input:{kind:'user',id:'secret'}},{type:'tool_use',id:'three',name:'send_campaign',input:{}}]];
    const result=await askCreationStudioRex(input());assert.equal(recordCalls,0);assert.deepEqual(result.steps,[]);
    const errors=modelCalls[1].messages.at(-1).content;assert.equal(errors.length,3);assert.ok(errors.every(item=>item.is_error));
  });
  await check('authorized analytics tools queue page controls without claiming execution',async()=>{
    replies=[[{type:'tool_use',id:'one',name:'analytics_section',input:{section:'social'}}]];
    const result=await askCreationStudioRex(input());assert.deepEqual(result.steps,[{action:'analytics_section',args:{section:'social'}}]);assert.equal(recordCalls,0);
  });
  await check('zero, missing data, dates and timezone retain their meaning in shared evidence',async()=>{
    await askCreationStudioRex(input());const state=evidence();assert.equal(state.report.metrics[1].value,0);assert.equal(state.report.metrics[2].value,null);
    assert.equal(state.report.timezone,'America/Port_of_Spain');assert.equal(state.internalRefreshMode,'page-load-or-manual');assert.match(state.activationAttribution,/unknown/);
    assert.ok(state.externalSources.every(source=>source.metrics===null&&source.extractedAt===null&&source.coveredPeriod===null&&source.refreshMode==='unverified'&&source.status==='not-connected'));
    assert.deepEqual(state.externalSources[0].requestedPeriod,{start:state.report.start,end:state.report.end});
  });
  await check('semantic contract covers unique counts, lifetime cohorts, daily ads, currency and source freshness',async()=>{
    await askCreationStudioRex(input());const state=evidence(), byId=id=>state.externalSources.find(source=>source.id===id);
    assert.match(byId('website').definition,/never sum users/);assert.match(byId('posts').definition,/lifetime engagement/);assert.match(byId('accounts').definition,/Never sum followers/);
    assert.match(byId('ads').definition,/Never sum daily unique reach/);assert.match(byId('ads').caveat,/ratios of sums/);assert.match(byId('ads').caveat,/Keep currencies separate/);assert.match(byId('gbp').definition,/do not prorate/);
    assert.match(modelCalls[0].system,/successful importer run does not prove/);assert.match(modelCalls[0].system,/cannot look up individual records/);
  });
  await check('six grouped navigation areas preserve every existing section and new social detail',async()=>{
    assert.equal(ANALYTICS_GROUPS.length,6);const sections=ANALYTICS_GROUPS.flatMap(group=>group.sections);
    assert.equal(new Set(sections).size,ANALYTICS_SECTIONS.length);
    for(const section of ANALYTICS_SECTIONS)assert.ok(analyticsGroup(section.id).sections.includes(section.id));
  });
  await check('Creation Studio retains its existing record lookup path',async()=>{
    replies=[[{type:'tool_use',id:'one',name:'find_studio_records',input:{query:'sample'}}]];
    const result=await askCreationStudioRex({question:'Find a sample record.',history:[],surfaces:[]});assert.equal(recordCalls,1);assert.equal(result.analyticsReport,undefined);
  });
  console.log(`${passed} analytics Rex contract checks passed (mocked, no paid calls)`);
})().catch(error=>{console.error(error);process.exitCode=1;});
