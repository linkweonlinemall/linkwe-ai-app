// Real local database queries; all changes roll back. Notifications are stubbed.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),{randomUUID}=require('node:crypto');
require('dotenv').config({path:'.env.local',quiet:true});require('dotenv').config({path:'.env',quiet:true});
const db=new URL(process.env.DATABASE_URL||'');
if(!['localhost','127.0.0.1','[::1]'].includes(db.hostname)||db.pathname!=='/linkwe_dev')throw new Error('Only local linkwe_dev is permitted.');
const {PrismaClient}=require('@prisma/client');const real=new PrismaClient();const rollback=new Error('TEST_ROLLBACK');
(async()=>{
 const vendor=await real.user.findUniqueOrThrow({where:{email:'vendor-preview@linkwe.test'}});
 const customer=await real.user.findUniqueOrThrow({where:{email:'customer-preview@linkwe.test'}});
 const store=await real.store.findUniqueOrThrow({where:{slug:'admin-preview-cocoa-coast'}});
 let session={userId:vendor.id,role:'VENDOR'};let notifications=0;
 try{await real.$transaction(async tx=>{
  const conv=await tx.conversation.findUniqueOrThrow({where:{customerId_storeId:{customerId:customer.id,storeId:store.id}}});
  const old=Module._load;
  Module._load=function(request,parent,main){
   if(request==='@/lib/prisma')return {prisma:{...tx,$transaction:entries=>Promise.all(entries)}};
   if(request==='@/lib/auth/session')return {getSession:async()=>session};
   if(request==='@/lib/notifications/create')return {createNotification:async()=>{notifications++;}};
   if(request==='server-only')return {};
   if(request.startsWith('@/'))request=path.join(process.cwd(),request.slice(2));
   return old.call(this,request,parent,main);
  };
  require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
  try{
   const a=require('../app/actions/messages.ts');const {getVendorMessageContext}=require('../lib/vendor/message-context.ts');
   await tx.conversation.update({where:{id:conv.id},data:{storeUnread:3}});
   const snapshot=await a.getConversationMessages(conv.id,false);assert.equal(snapshot.ok,true);
   assert.equal((await tx.conversation.findUniqueOrThrow({where:{id:conv.id}})).storeUnread,3,'render/prefetch does not mark read');
   const later=new Date(snapshot.snapshotAt.getTime()+1000);
   await tx.conversation.update({where:{id:conv.id},data:{lastMessageAt:later,storeUnread:4}});
   assert.equal((await a.markVendorConversationRead(conv.id,snapshot.snapshotAt.toISOString())).cleared,false);
   assert.equal((await tx.conversation.findUniqueOrThrow({where:{id:conv.id}})).storeUnread,4);
   assert.equal((await a.markVendorConversationRead(conv.id,later.toISOString())).cleared,true);
   assert.equal((await tx.conversation.findUniqueOrThrow({where:{id:conv.id}})).storeUnread,0);
   assert.equal((await a.markVendorConversationRead(conv.id,'invalid')).ok,false);
   console.log('PASS: prefetched threads stay unread; stale read snapshots cannot erase a newer arrival.');
   const count=await tx.message.count({where:{conversationId:conv.id}});
   const before=(await tx.conversation.findUniqueOrThrow({where:{id:conv.id}})).customerUnread;
   const token=randomUUID();
   assert.equal((await a.sendMessage(conv.id,'   ')).ok,false);
   assert.equal((await a.sendMessage(conv.id,'a'.repeat(5001))).ok,false);
   assert.equal((await a.sendMessage(conv.id,'Hello','bad-id')).ok,false);
   const sent=await a.sendMessage(conv.id,'Local test reply',token);assert.equal(sent.ok,true);assert.equal(sent.message.id,token);
   const retried=await a.sendMessage(conv.id,'Local test reply',token);assert.equal(retried.ok,true);assert.equal(retried.message.id,token);
   assert.equal(await tx.message.count({where:{conversationId:conv.id}}),count+1);
   assert.equal((await tx.conversation.findUniqueOrThrow({where:{id:conv.id}})).customerUnread,before+1);
   assert.equal(notifications,1);
   assert.equal((await a.sendMessage(conv.id,'Changed text',token)).ok,false);
   const inbox=await a.getMyConversations();assert.equal(inbox.side,'vendor');assert.equal(inbox.conversations.find(c=>c.id===conv.id).lastSenderRole,'VENDOR');
   const context=await getVendorMessageContext(conv.id,vendor.id);assert.ok(context.orders.length);assert.ok(context.services.length);
   console.log('PASS: valid send persists once, retry is idempotent, unread increments once, invalid drafts blocked, order context loads.');
   session={userId:'not-this-vendor',role:'VENDOR'};
   assert.equal((await a.getConversationMessages(conv.id,false)).ok,false);
   assert.equal((await a.sendMessage(conv.id,'Unauthorised',randomUUID())).ok,false);
   assert.equal((await a.markVendorConversationRead(conv.id,later.toISOString())).cleared,false);
   assert.equal(await getVendorMessageContext(conv.id,'not-this-vendor'),null);
   session={userId:customer.id,role:'CUSTOMER'};
   assert.equal((await a.getConversationMessages(conv.id,false)).ok,true);
   assert.equal((await a.markVendorConversationRead(conv.id,later.toISOString())).ok,false);
   const customerSend=await a.sendMessage(conv.id,'Customer test reply');assert.equal(customerSend.ok,true);assert.equal(customerSend.message.senderRole,'CUSTOMER');
   session=null;assert.equal((await a.sendMessage(conv.id,'No session')).ok,false);
   console.log('PASS: other vendors denied reads/sends/order context; customer messaging remains compatible; anonymous sends blocked.');
  }finally{Module._load=old;}
  throw rollback;
 },{timeout:30000});}catch(error){if(error!==rollback)throw error;}
 console.log('PASS: every database change rolled back. No real messages or notifications sent.');
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>real.$disconnect());
