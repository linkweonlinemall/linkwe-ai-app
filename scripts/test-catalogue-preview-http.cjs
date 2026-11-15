// Run AFTER a nonproduction build. All URLs/credentials are local fictional values.
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const fs=require('node:fs');
if(fs.readdirSync('.').some(name=>/^\.env(?:\.|$)/.test(name)&&name!=='.env.example'))throw Error('Use isolated checkout without env files.');
const url='http://127.0.0.1:3099';
const paths=['/dev/store-catalogue?tab=catalogue','/dev/catalogue-preview'];
async function run(mode){
 const env={PATH:process.env.PATH,HOME:'/tmp/linkwe-prisma-home',NODE_ENV:'production',VERCEL_ENV:mode,DATABASE_URL:'postgresql://fixture@127.0.0.1:55479/no_database',DIRECT_URL:'postgresql://fixture@127.0.0.1:55479/no_database',RESEND_API_KEY:'re_fixture_only',NEXT_TELEMETRY_DISABLED:'1'};
 const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3099'],{env,stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
 try {for(let attempt=0;attempt<100;attempt++){if(log.includes('Ready in'))break;if(child.exitCode!==null)throw Error(log);await new Promise(r=>setTimeout(r,100));}
  for(const path of paths){const response=await fetch(url+path);const html=await response.text();if(mode==='production')fs.writeFileSync('/tmp/linkwe-production-fixture-response.html',html);assert.equal(response.status,mode==='preview'?200:404,`${mode} ${path}`);if(mode==='preview'){assert.ok(html.includes(path.startsWith('/dev/store-')?'Island Finds':'Your named catalogues'));assert.ok(!html.includes('Help us make LinkWe easier to use'));}console.log(`PASS HTTP ${response.status}: ${mode} ${path}`);}
  assert.ok(!log.includes('PrismaClientInitializationError'),log);assert.ok(!log.includes('no_database'),log);
 }finally{child.kill('SIGTERM');await new Promise(resolve=>child.on('exit',resolve));}
}
(async()=>{await run('preview');await run('production');})().catch(e=>{console.error(e);process.exitCode=1;});
