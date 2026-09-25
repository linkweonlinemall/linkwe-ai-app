const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
let session={userId:'buyer-1',role:'CUSTOMER'},ticket=null,rendered=0,query=null;
const old=Module._load;Module._load=function(request,parent,main){
 if(request==='@/lib/auth/session')return {getSession:async()=>session};
 if(request==='@/lib/prisma')return {prisma:{ticket:{findFirst:async q=>{query=q;return ticket;}}}};
 if(request==='@/lib/tickets/qr-code')return {generateTicketQRCodeDataURL:async()=>'test-qr'};
 if(request==='@react-pdf/renderer')return {renderToBuffer:async()=>{rendered++;return Buffer.from('test-pdf');}};
 if(request==='@/components/tickets/TicketDocument')return {TicketDocument:()=>null};
 if(request.startsWith('@/'))request=path.join(process.cwd(),request.slice(2));return old.call(this,request,parent,main);
};
(async()=>{
 const {GET}=require('../app/api/ticket-pdf/[ticketId]/route.ts');const request=()=>GET({}, {params:Promise.resolve({ticketId:'ticket-1'})});
 const base={id:'ticket-1',ticketNumber:'TEST1',holderName:'Preview',status:'VALID',transferredAt:null,qrToken:'test-only',event:{title:'Future event',status:'PUBLISHED',startDate:new Date(Date.now()+86400000),endDate:null,venueName:'Preview'},ticketType:{name:'General',color:null},ticketOrder:{status:'PAID',reference:'TESTORDER',total:100}};
 session=null;assert.equal((await request()).status,401);session={userId:'buyer-1',role:'CUSTOMER'};assert.equal((await request()).status,404);assert.equal(query.where.userId,'buyer-1');assert.equal(query.where.ticketOrder.is.status,'PAID');
 for(const override of [{transferredAt:new Date()},{status:'USED'},{status:'CANCELLED'},{status:'REFUNDED'},{event:{...base.event,status:'CANCELLED'}},{event:{...base.event,startDate:new Date('2020-01-01')}}]){ticket={...base,...override};assert.equal((await request()).status,403);}
 assert.equal(rendered,0);ticket=base;assert.equal((await request()).status,200);assert.equal(rendered,1);
 console.log('PASS: ticket PDF requires sign-in and ownership; transferred, used, cancelled, refunded and past tickets never generate entry codes. Valid paid tickets still download.');
})().catch(error=>{console.error(error);process.exitCode=1;});
