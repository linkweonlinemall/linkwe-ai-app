/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node regression runner, matching repository test scripts. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, filename);
const {tutorialCatalog: catalog, learningPaths} = require('../lib/vendor/tutorial-catalog.ts');
const {tutorialRouteMatches, tutorialDestination, tutorialPageAllowsTarget, matchingTutorials} = require('../lib/vendor/tutorial-navigation.ts');
const {normalizeTutorialProgress, readTutorialProgress, saveTutorialProgress, readActiveTutorial, saveActiveTutorial, isTutorialName} = require('../lib/vendor/tutorial-progress.ts');
let count = 0;
function check(label, test) { test(); count++; console.log(`PASS ${label}`); }
function sources(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?sources(path.join(dir,e.name)):/\.tsx$/.test(e.name)?[fs.readFileSync(path.join(dir,e.name),'utf8')]:[]); }
const source = [...sources(path.join(root,'app')),...sources(path.join(root,'components'))].join('\n').replaceAll('&amp;','&');
check('Every lesson has a unique path entry, preparation, access, outcome and actionable checkpoints',()=>{
 const names=learningPaths.flatMap(p=>p.lessons);assert.equal(new Set(names).size,names.length);assert.deepEqual([...names].sort(),Object.keys(catalog).sort());
 for(const [name,lesson] of Object.entries(catalog)) {
  for(const field of ['prepare','access','outcome','troubleshooting','workspace']) assert.ok(lesson[field].length>0,`${name} ${field}`);
  assert.ok(lesson.steps.length>=3,name);assert.equal(new Set(lesson.steps.map(s=>s.id)).size,lesson.steps.length,name);
  for(const step of lesson.steps) {for(const field of ['id','title','body','selector','where','fallback','check']) assert.ok(step[field],`${name}/${step.id}: ${field}`);}
 }
});
check('Every static lesson destination resolves to an existing vendor page',()=>{
 for(const [name,lesson] of Object.entries(catalog))for(const route of [lesson.route,...lesson.steps.map(s=>s.route).filter(Boolean)]) {
  assert.ok(route.startsWith('/dashboard/vendor'),`${name}: ${route}`);
  const pathname=new URL(route,'https://local.test').pathname;
  assert.ok(fs.existsSync(path.join(root,'app/(dashboard)',pathname,'page.tsx')),`${name}: ${pathname}`);
 }
});
check('Every lesson target has a source-backed element or explicitly dynamic value',()=>{
 const dynamic=new Set(['[data-tour="collab-incoming"]','[data-tour="collab-outgoing"]','[data-service-type="BOOKABLE"]','[data-service-type="QUOTE"]','[data-service-type="SUBSCRIPTION"]','[data-service-type="ON_DEMAND"]','[data-service-type="VIRTUAL"]','textarea[id^="reply-"]']);
 const missing=[];
 for(const [name,lesson] of Object.entries(catalog))for(const step of lesson.steps){
  const attribute=step.selector.match(/^\[([^=\]]+)(?:="([^"]+)")?\]$/);
  if(dynamic.has(step.selector))continue;
  if(attribute){const [,key,value]=attribute; if(!source.includes(value===undefined?key:`${key}="${value}"`))missing.push(`${name}/${step.id}: ${step.selector}`);}
  else if(!source.includes(step.selector.replace(/^nav\[/,'').replace(/\]$/,'')))missing.push(`${name}/${step.id}: ${step.selector}`);
 }
 assert.deepEqual(missing,[]);
});
check('Record selections and extra query parameters do not invalidate matching workspace URLs',()=>{
 assert.equal(tutorialRouteMatches('/dashboard/vendor/service-desk?type=booking&record=booking%3Afixture&q=local','/dashboard/vendor/service-desk?type=booking'),true);
 assert.equal(tutorialRouteMatches('/dashboard/vendor/creation/new?type=product&guide=fixture','/dashboard/vendor/creation/new?type=product'),true);
 assert.equal(tutorialRouteMatches('/dashboard/vendor/finance?tab=bank','/dashboard/vendor/finance?tab=earnings'),false);
 assert.equal(tutorialRouteMatches('/dashboard/vendor/creation/new?type=event','/dashboard/vendor/creation/new?type=product'),false);
 assert.equal(tutorialPageAllowsTarget('/dashboard/vendor/orders/local-fixture','orders',1),true);
 assert.equal(tutorialPageAllowsTarget('/dashboard/vendor/messages/local-fixture','orders',1),false);
 assert.equal(tutorialDestination('finance',2),'/dashboard/vendor/finance?tab=bank');
});
check('Search combines terms and includes access restrictions and step content',()=>{
 assert.ok(matchingTutorials('product photos','All lessons').length>0);
 assert.equal(matchingTutorials('variable product','All lessons')[0][0],'productVariable');
 assert.ok(matchingTutorials('active Pro','Business operations').some(([name])=>name==='liveStock'));
 assert.equal(matchingTutorials('nothing-match-934861','All lessons').length,0);
});
check('Progress uses stable checkpoint IDs and does not complete skipped lessons',()=>{
 const saved=normalizeTutorialProgress({store:{stepId:'unknown-old-step',reviewed:['identity','identity','missing'],complete:true,updatedAt:9}});
 assert.deepEqual(saved.store.reviewed,['identity']);assert.equal(saved.store.complete,false);assert.equal(saved.store.stepId,catalog.store.steps[0].id);
 assert.equal(normalizeTutorialProgress({store:{reviewed:catalog.store.steps.map(s=>s.id)}}).store.complete,true);
 assert.deepEqual(normalizeTutorialProgress(null),{});assert.deepEqual(normalizeTutorialProgress('bad'),{});
 assert.equal(isTutorialName('__proto__'),false);assert.equal(isTutorialName('serviceBooking'),true);
});
const data=new Map();const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
global.localStorage=storage;global.sessionStorage=storage;
check('Progress and active lessons stay scoped to the store; reload preserves the checkpoint',()=>{
 const progress=normalizeTutorialProgress({store:{stepId:'hours',reviewed:['identity','logo']}});
 assert.equal(saveTutorialProgress('fixture-a',progress),true);assert.deepEqual(readTutorialProgress('fixture-a'),progress);assert.deepEqual(readTutorialProgress('fixture-b'),{});
 saveActiveTutorial('fixture-a',{name:'store',stepId:'hours',minimized:true});assert.equal(readActiveTutorial('fixture-a').stepId,'hours');assert.equal(readActiveTutorial('fixture-b'),null);
 saveActiveTutorial('fixture-a',null);assert.equal(readActiveTutorial('fixture-a'),null);
});
check('Blocked and corrupt storage never blocks learning',()=>{
 data.set('linkwe-academy:v3:fixture-a','{invalid');assert.deepEqual(readTutorialProgress('fixture-a'),{});
 global.localStorage={getItem(){throw Error('blocked')},setItem(){throw Error('quota')}};
 assert.deepEqual(readTutorialProgress('fixture-a'),{});assert.equal(saveTutorialProgress('fixture-a',{}),false);
});
check('Companion cannot auto-click, submit a form, or navigate from a route effect',()=>{
 const ui=fs.readFileSync(path.join(root,'components/vendor/VendorGuidedTours.tsx'),'utf8');
 assert.equal(/\.click\(|\.submit\(|\.requestSubmit\(/.test(ui),false);
 assert.equal((ui.match(/router\.push\(/g)||[]).length,1);
 assert.ok(ui.includes('Save any unfinished form first.'));
 assert.ok(ui.includes('onClick={() => { setNavigation(false); router.push(destination); }}'));
 assert.ok(ui.includes('if (event.key === "Escape" && !inDialog)'));
});
console.log(`${count} tutorial checks passed across ${Object.keys(catalog).length} lessons / ${Object.values(catalog).reduce((n,l)=>n+l.steps.length,0)} steps. No database, account, tracking or external calls.`);
