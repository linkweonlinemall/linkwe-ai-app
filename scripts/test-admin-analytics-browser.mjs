// Isolated headless QA using the installed Chrome binary and Node's WebSocket.
// Never attaches to the interactive browser. Only the disposable localhost preview is allowed.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.resolve(root,'../linkwe-admin-analytics-qa/enhanced');
const origin='http://127.0.0.1:3159';
const database=new URL(process.env.DATABASE_URL||'');
if(database.hostname!=='127.0.0.1'||database.port!=='55440'||database.pathname!=='/linkwe_analytics_test')throw Error('Disposable analytics database only.');
if(process.env.AUTH_SECRET!=='local-analytics-review-only-not-a-production-secret')throw Error('Local-only signing fixture required.');
const executable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
await fs.mkdir(output,{recursive:true});
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'linkwe-analytics-headless-'));
const child=spawn(executable,['--headless=new',`--user-data-dir=${profile}`,'--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions','--metrics-recording-only','--mute-audio','about:blank'],{stdio:['ignore','ignore','pipe']});
let diagnostics='',ws,seq=0,session;const pending=new Map(),errors=[],results=[],shots=[],requests=[],network=[];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
child.stderr.on('data',chunk=>{diagnostics+=chunk.toString();});
async function until(predicate,label,timeout=20000){const started=Date.now();while(Date.now()-started<timeout){try{if(await predicate())return;}catch{}await delay(100);}throw Error(`Timed out: ${label}`);}
function call(method,params={},sessionId=session){return new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error(`CDP timeout: ${method}`));},15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});}
async function evaluate(expression){const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.text);return result.result.value;}
const text=()=>evaluate('document.body.innerText');
async function navigate(relative){assert.ok(relative.startsWith('/')&&!relative.startsWith('//'));await call('Page.navigate',{url:origin+relative});}
async function waitText(value){await until(async()=>String(await text()).includes(value),value);}
async function click(selector){await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);await delay(100);const point=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Element missing');const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await call('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});}
async function clickText(value){const selector=await evaluate(`(()=>{const all=[...document.querySelectorAll('button')];const i=all.findIndex(e=>e.innerText.trim()===${JSON.stringify(value)}&&e.getBoundingClientRect().width>0);if(i<0)throw Error('Button missing');all[i].setAttribute('data-qa-click','yes');return '[data-qa-click="yes"]'})()`);await click(selector);await evaluate("document.querySelector('[data-qa-click]')?.removeAttribute('data-qa-click')");}
async function fill(selector,value){await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);await call('Input.insertText',{text:value});}
async function select(selector,value){await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
async function viewport(width,height,mobile=false){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});await call('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:mobile?5:1});}
async function shot(name){await evaluate('document.fonts.ready.then(()=>true)');await delay(150);const image=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});const filename=`${name}.png`;await fs.writeFile(path.join(output,filename),Buffer.from(image.data,'base64'));shots.push(filename);}
async function check(name,run){await run();results.push({name,passed:true});console.log('PASS '+name);}
async function noOverflow(){const sizes=await evaluate(`({viewport:innerWidth,body:document.documentElement.scrollWidth,main:document.querySelector('#admin-main')?.clientWidth,mainScroll:document.querySelector('#admin-main')?.scrollWidth})`);assert.ok(sizes.body<=sizes.viewport+1,JSON.stringify(sizes));if(sizes.main)assert.ok(sizes.mainScroll<=sizes.main+1,JSON.stringify(sizes));return sizes;}
async function goBack(){const h=await call('Page.getNavigationHistory');assert.ok(h.currentIndex>0);await call('Page.navigateToHistoryEntry',{entryId:h.entries[h.currentIndex-1].id});}
try{
 await until(()=>/DevTools listening on (ws:\/\/[^\s]+)/.test(diagnostics),'isolated headless browser startup');
 const endpoint=diagnostics.match(/DevTools listening on (ws:\/\/[^\s]+)/)[1];assert.ok(endpoint.startsWith('ws://127.0.0.1:'));
 ws=new WebSocket(endpoint);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 ws.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id){const item=pending.get(data.id);if(item){pending.delete(data.id);clearTimeout(item.timer);data.error?item.reject(Error(JSON.stringify(data.error))):item.resolve(data.result);}return;}
  if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.exception?.description||data.params.exceptionDetails.text);
  if(data.method==='Network.responseReceived'&&(data.params.type==='Document'||new URL(data.params.response.url).pathname==='/login')){const r=data.params.response;network.push({path:new URL(r.url).pathname,status:r.status,type:data.params.type,headers:Object.fromEntries(Object.entries(r.headers).filter(([k])=>!['set-cookie','cookie'].includes(k.toLowerCase())))});if(data.params.type!=='Document'&&new URL(r.url).pathname==='/login')call('Network.getResponseBody',{requestId:data.params.requestId},data.sessionId).then(body=>network.push({loginResponse:body.body})).catch(e=>network.push({bodyError:String(e)}));}
  if(data.method==='Runtime.consoleAPICalled'&&data.params.type==='error')network.push({consoleError:data.params.args.map(a=>a.value||a.description)});
  if(data.method==='Network.loadingFailed')network.push({failed:data.params.errorText,blocked:data.params.blockedReason});
  if(data.method==='Network.responseReceivedExtraInfo'&&data.params.blockedCookies?.length)network.push({blockedCookies:data.params.blockedCookies.map(item=>item.blockedReasons)});
  if(data.method==='Fetch.requestPaused'){const url=data.params.request.url;const allowed=url.startsWith(origin+'/')||url.startsWith('http://127.0.0.1:3159/')||url.startsWith('data:');if(data.params.request.method==='POST'||!allowed)requests.push({method:data.params.request.method,origin:new URL(url).origin,path:new URL(url).pathname,allowed,serverAction:Object.keys(data.params.request.headers).some(k=>k.toLowerCase()==='next-action')});call(allowed?'Fetch.continueRequest':'Fetch.failRequest',allowed?{requestId:data.params.requestId}:{requestId:data.params.requestId,errorReason:'BlockedByClient'},data.sessionId).catch(()=>{});}
 });
 const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Network.setBlockedURLs',{urls:['https://*']});
 await viewport(1440,1000);
 await check('Anonymous requests redirect before using an explicitly signed local admin test session',async()=>{
  await navigate('/dashboard/admin/analytics');await until(()=>evaluate("location.pathname==='/login'&&!!document.querySelector('#login-email')"),'anonymous login redirect');
  assert.ok(!(await text()).includes('Accounts created'));
  const {PrismaClient}=await import('@prisma/client'),{SignJWT}=await import('jose');const db=new PrismaClient();
  let admin;try{admin=await db.user.findUniqueOrThrow({where:{email:'analytics-preview@example.test'}});}finally{await db.$disconnect();}
  assert.equal(admin.role,'ADMIN');assert.equal(admin.isActive,true);assert.equal(admin.suspended,false);
  const value=await new SignJWT({email:admin.email,fullName:admin.fullName,role:'ADMIN'}).setProtectedHeader({alg:'HS256'}).setSubject(admin.id).setIssuedAt().setExpirationTime('10m').sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  await call('Network.setCookie',{name:'lw_session',value,url:origin,httpOnly:true,sameSite:'Lax'});
  await navigate('/dashboard/admin/analytics');await waitText('Accounts created');await noOverflow();await shot('desktop-overview');
 });
 await check('Existing sections and social availability render at desktop and phone widths without horizontal overflow',async()=>{
  for(const [name,section,width,height] of [['desktop-acquisition','audience',1440,1000],['mobile-overview','overview',390,844],['mobile-activation','registrations',390,844],['mobile-social','social',390,844],['mobile-sources','connections',390,844],['narrow-overview','overview',320,740]]){
    await viewport(width,height,width<640);await navigate('/dashboard/admin/analytics?section='+section+'&days=7');
    await until(()=>evaluate('document.readyState==="complete"'),'page loaded');await waitText('Coverage details');await noOverflow();await shot(name);
    if(section==='social'){assert.ok((await text()).includes('Performance data unavailable here'));assert.ok(!(await text()).includes('3435'));}
    if(section==='connections'){
      assert.ok((await text()).includes('Not connected'));assert.ok((await text()).includes('Freshness unavailable here'));
      assert.ok((await text()).includes('not configured in this environment'));
      assert.equal(await evaluate("[...document.querySelectorAll('a')].some(a=>a.href.includes('datastudio.google.com')||a.href.includes('lookerstudio.google.com'))"),false);assert.equal(await evaluate("document.querySelectorAll('iframe').length"),0);
    }
  }
 });
 await check('Mobile grouped navigation and filter changes update the report and survive reload',async()=>{
  await viewport(390,844,true);await navigate('/dashboard/admin/analytics');await waitText('Accounts created');
  await until(()=>evaluate("Object.keys(document.querySelector('select')).some(k=>k.startsWith('__reactProps'))"),'hydration');
  await select('label[class*=mobileSection] select','activation');await waitText('Account creation by day');
  await select('select','7');await until(()=>evaluate("new URL(location.href).searchParams.get('days')==='7'"),'date filter');
  await call('Page.reload');await waitText('Account creation by day');assert.equal(await evaluate('document.querySelector("select").value'),'7');
  await noOverflow();await shot('mobile-activation-filtered');
 });
 await check('Rex opens and closes without making a model request; collapsed control does not float over content',async()=>{
  await navigate('/dashboard/admin/analytics');await waitText('Accounts created');
  await until(()=>evaluate("Object.keys(document.querySelector('[class*=analyticsRexBar] button')).some(k=>k.startsWith('__reactProps'))"),'Rex control hydration');
  await click('[class*=analyticsRexBar] button');await until(()=>evaluate("document.querySelector('aside[data-open]').dataset.open==='true'"),'Rex panel open');await shot('mobile-rex');
  await click('button[aria-label="Close Rex conversation"]');await until(()=>evaluate("document.querySelector('aside[data-open]').dataset.open==='false'"),'Rex panel closed');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[class*=analyticsRexBar] button')).position"),'static');
 });
 await check('Clearing the local test session prevents cached navigation and direct page access',async()=>{
  await call('Network.deleteCookies',{name:'lw_session',url:origin});await call('Network.clearBrowserCache');
  await navigate('/dashboard/admin/analytics?section=connections');await until(()=>evaluate("location.pathname==='/login'&&!!document.querySelector('#login-email')&&document.readyState==='complete'"),'signed-out redirect');
  assert.ok(!(await text()).includes('WebsiteDaily'));await shot('signed-out-protection');
 });
 assert.deepEqual(errors,[],'Unexpected browser runtime exceptions');
 await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checkedAt:new Date().toISOString(),passed:results.length,results,screenshots:shots,interactiveBrowserUsed:false,isolatedProfile:true,externalPagesOpened:false,authentication:'signed disposable ADMIN fixture; this does not test the login form',runtimeErrors:errors},null,2));
 console.log(`${results.length} isolated headless browser checks passed. Screenshots: ${output}`);
}catch(error){const page=await evaluate(`({path:location.pathname,formValid:document.querySelector('form')?.checkValidity(),notices:[...document.querySelectorAll('[role="alert"]')].map(e=>e.innerText),text:document.body.innerText})`).catch(()=>null);const cookies=await call('Network.getCookies',{urls:[origin]}).then(r=>r.cookies.map(c=>({name:c.name,secure:c.secure,domain:c.domain}))).catch(()=>[]);await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({error:String(error),results,screenshots:shots,runtimeErrors:errors,requests,network,page,cookies},null,2));try{await shot('failure-state');}catch{}console.error(error);process.exitCode=1;}
finally{
 if(ws?.readyState===WebSocket.OPEN){try{await call('Browser.close',{},null);}catch{}ws.close();}
 if(child.exitCode===null)child.kill('SIGTERM');
 await delay(400);await fs.rm(profile,{recursive:true,force:true});
 for(const item of pending.values())clearTimeout(item.timer);
}
