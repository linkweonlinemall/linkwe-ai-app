// Local integration: real saves inside one rolled-back transaction, simulated AI.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
require('dotenv').config({path:'.env.local',quiet:true}); require('dotenv').config({path:'.env',quiet:true});
const db = new URL(process.env.DATABASE_URL || '');
if (!['localhost','127.0.0.1','[::1]'].includes(db.hostname) || db.pathname !== '/linkwe_dev') throw new Error('Only local linkwe_dev is permitted.');
const {PrismaClient} = require('@prisma/client'), real = new PrismaClient(), rollback = new Error('ROLLBACK');
require.extensions['.ts'] = (m,f) => m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
(async()=>{try{await real.$transaction(async tx=>{
  const vendor=await tx.user.findUniqueOrThrow({where:{email:'vendor-preview@linkwe.test'}}), admin=await tx.user.findUniqueOrThrow({where:{email:'admin-preview@linkwe.test'}}), store=await tx.store.findUniqueOrThrow({where:{ownerId:vendor.id}});
  let session={userId:vendor.id,role:'VENDOR'}, modelCalls=[], replies=[]; const invalidations=[];
  const original=Module._load;
  Module._load=function(request,parent,main){
    if(request==='server-only')return{};
    if(request==='@/lib/auth/session')return{getSession:async()=>session};
    if(request==='@/lib/prisma')return{prisma:{...tx,$transaction:fn=>fn(tx)}};
    if(request==='next/cache')return{revalidatePath:p=>invalidations.push(p)};
    if(request==='@/lib/notifications/create')return{createNotification:async()=>{throw new Error('Unexpected notification');}};
    if(request==='@/lib/uploads/upload')return{uploadFile:async()=>{throw new Error('Unexpected upload');}};
    if(request==='@/lib/finance/ai-usage')return{getAIUsageState:async()=>({remaining:10,topupRemaining:0}),consumeAIUse:async()=>({ok:true,remaining:9}),recordAITokens:async()=>{}};
    if(request==='@anthropic-ai/sdk')return class{messages={stream:input=>{modelCalls.push(input);const reply=replies.shift();assert.ok(reply,'Unexpected model call');return{on(){},finalMessage:async()=>typeof reply==='function'?reply(input):reply};}}};
    if(parent?.filename.endsWith('/api/vendor-ai/route.ts') && ['@/app/actions/ai-vendor-store','@/app/actions/ai-vendor','@/app/actions/ai-vendor-image'].includes(request))return{};
    if(parent?.filename.endsWith('/api/vendor-ai/route.ts') && request==='@/lib/chat/vendor-workspace-tools')return{WORKSPACE_TOOLS:[]};
    if(request.startsWith('@/'))request=path.join(process.cwd(),request.slice(2));
    return original.call(this,request,parent,main);
  };
  try {
    const fields=require('../lib/chat/vendor-listing-fields.ts'), offers=require('../lib/services/offer-fields.ts'), {RECORD_FIELDS}=require('../lib/admin/record-fields.ts'), {RECORD_SECTIONS}=require('../lib/admin/record-design.ts');
    const api=require('../app/actions/ai-vendor-update.ts'), create=require('../app/actions/ai-vendor-service.ts').createServiceFromAI;
    const {importFields}=require('../lib/imports/fields.ts');
    for(const kind of ['service','product'])for(const name of RECORD_FIELDS[kind]){
      assert.ok(RECORD_SECTIONS[kind].some(section=>section.fields.includes(name)),`${kind}.${name} missing in the Admin form`);
      assert.ok(fields.vendorListingFields(kind).some(field=>field.name===name)||fields.LISTING_FIELD_WORKFLOWS[name],`${kind}.${name} missing from Rex or its dedicated controls`);
    }
    for(const field of offers.SERVICE_OFFER_FIELDS){
      assert.equal(fields.listingFieldGuide('service').fields[field.name].maxLength,1500);
      assert.ok(fields.listingFieldGuide('service').fields[field.name].description.includes(field.label));
      assert.equal(importFields('service').filter(f=>f.name===field.name).length,1,'no duplicate import fields');
    }
    const categories=require('../lib/categories.ts');for(const category of [...categories.PRODUCT_CATEGORIES,...categories.SERVICE_CATEGORIES])assert.ok(fields.vendorListingUpdateProperties().category.enum.includes(category.value));
    console.log('PASS shared form coverage, field discovery, labels, limits and import uniqueness');
    await tx.store.update({where:{id:store.id},data:{subscriptionPlan:'PRO',subscriptionStatus:'ACTIVE'}});
    const service=await tx.product.create({data:{storeId:store.id,name:'Rex field regression',slug:`rex-field-${Date.now()}`,isService:true,serviceType:'BOOKABLE',serviceDuration:60,durationMinutes:60,price:80,isPublished:false,description:'Keep description',serviceRequirements:'Keep preparation',images:['https://example.test/keep.jpg'],tags:['keep'],requiresDeposit:true,depositAmount:20}});
    const edit=async(patch,id=service.id)=>{const row=await tx.product.findUniqueOrThrow({where:{id}});return api.updateProductFromAI({productId:id,expectedUpdatedAt:row.updatedAt.toISOString(),...patch},vendor.id,store.id);};
    const details=await api.getVendorProductDetails(service.id);assert.equal(details.serviceRequirements,'Keep preparation');assert.ok(details.editableFields.fields.serviceInclusions);assert.equal(details.digitalFileUrl,undefined);
    assert.ok((await api.searchVendorProducts('Rex field regression')).some(row=>row.id===service.id&&row.isService));
    assert.equal((await edit({serviceInclusions:'Consultation and two revisions',serviceDeliverables:'One final PDF'})).ok,true);
    let row=await tx.product.findUniqueOrThrow({where:{id:service.id}});
    assert.equal(row.serviceInclusions,'Consultation and two revisions');assert.equal(row.serviceDeliverables,'One final PDF');assert.equal(row.serviceRequirements,'Keep preparation');assert.equal(row.description,'Keep description');assert.equal(row.price,80);assert.equal(row.isPublished,false);assert.deepEqual(row.tags,['keep']);assert.deepEqual(row.images,['https://example.test/keep.jpg']);assert.equal(row.depositAmount,20);
    assert.equal((await edit({serviceInclusions:null})).ok,true);assert.equal((await tx.product.findUniqueOrThrow({where:{id:service.id}})).serviceInclusions,null);
    assert.equal((await edit({serviceInclusions:'x'.repeat(1501)})).ok,false);
    assert.equal((await edit({serviceDuration:45,bufferMinutes:15,maxGroupSize:4,cancellationHours:24})).ok,true);
    row=await tx.product.findUniqueOrThrow({where:{id:service.id}});assert.equal(row.durationMinutes,45);assert.equal(row.bufferMinutes,15);assert.equal(row.maxGroupSize,4);
    assert.equal((await edit({serviceDuration:0})).ok,false);assert.equal((await edit({depositAmount:90})).ok,false);
    assert.equal((await edit({useStoreHours:false,availableDays:['monday'],availableFrom:'09:00',availableTo:'08:00'})).ok,false);
    assert.equal((await edit({useStoreHours:false,availableDays:['monday'],availableFrom:'09:00',availableTo:'17:00'})).ok,true);
    for(const patch of [{storeId:'other'},{viewCount:500},{serviceRequirements:{nested:'invalid'}},{digitalFileUrl:'https://example.test/file.pdf'},JSON.parse('{"__proto__":{}}')])assert.equal((await edit(patch)).ok,false);
    assert.equal((await api.updateProductFromAI({productId:service.id,expectedUpdatedAt:new Date(0).toISOString(),name:'Stale'},vendor.id,store.id)).ok,false);
    const product=await tx.product.create({data:{storeId:store.id,name:'Rex product fields',slug:`rex-product-${Date.now()}`,price:20,isDigital:true}});
    assert.equal((await edit({serviceInclusions:'Wrong kind'},product.id)).ok,false);
    assert.equal((await edit({downloadLimit:3,downloadExpiryDays:30,licenceType:'PERSONAL',previewUrl:'https://example.test/preview',address:'San Fernando',latitude:10.28,longitude:-61.46,checkoutFields:[{id:'gift',label:'Gift message',type:'text',required:false,options:[]}]},product.id)).ok,true);
    const savedProduct=await tx.product.findUniqueOrThrow({where:{id:product.id}});assert.equal(savedProduct.downloadLimit,3);assert.equal(savedProduct.checkoutFields[0].id,'gift');
    console.log('PASS precise service/product saves, null clearing, other-field preservation, duration sync, validation and stale edits');
    session={userId:admin.id,role:'VENDOR'};assert.equal(await api.getVendorProductDetails(service.id),null);assert.equal((await api.updateProductFromAI({productId:service.id,serviceInclusions:'Unauthorized'},admin.id,store.id)).ok,false);
    session={userId:vendor.id,role:'CUSTOMER'};assert.equal((await create({name:'No access'})).ok,false);assert.equal((await api.updateProductFromAI({productId:service.id,name:'No access'},vendor.id,store.id)).ok,false);await assert.rejects(()=>api.getVendorListingFieldGuide('service'),/Vendor/);
    session={userId:vendor.id,role:'VENDOR'};
    assert.equal((await create({name:'Bad subscription',price:80,serviceType:'SUBSCRIPTION'})).ok,false);
    assert.equal((await create({name:'Bad duration',price:80,serviceType:'BOOKABLE',serviceDuration:0})).ok,false);
    const made=await create({name:'Rex complete subscription',price:80,serviceType:'SUBSCRIPTION',subscriptionInterval:'monthly',sessionsIncluded:4,subscriptionTrialPeriod:7,subscriptionTrialPrice:0,subscriptionCanPause:true,subscriptionPauseMaxWeeks:2,serviceInclusions:'Four sessions',serviceRequirements:'Bring a notebook',serviceDeliverables:'Monthly progress report'});assert.equal(made.ok,true,JSON.stringify(made));
    const subscription=await tx.product.findUniqueOrThrow({where:{id:made.serviceId}});assert.equal(subscription.serviceInclusions,'Four sessions');assert.equal(subscription.sessionsIncluded,4);assert.equal(subscription.bookingPaymentMode,'ONLINE_ONLY');assert.equal(subscription.isPublished,false);
    await tx.store.update({where:{id:store.id},data:{subscriptionPlan:'STARTER',subscriptionStatus:'NONE'}});
    assert.equal((await edit({price:101})).ok,false);assert.equal((await edit({bookingPaymentMode:'ON_ARRIVAL_ONLY'})).ok,false);
    assert.equal((await create({name:'Over plan',price:101,serviceType:'ON_DEMAND'})).ok,false);
    await tx.store.update({where:{id:store.id},data:{subscriptionPlan:'PRO',subscriptionStatus:'ACTIVE'}});
    console.log('PASS role/owner isolation, draft defaults, subscription validation and plan/payment rules');
    session={userId:admin.id,role:'ADMIN'};
    const records=require('../app/actions/admin-records.ts');
    const workspace=await records.getAdminRecordWorkspace('service',service.id);
    for(const name of offers.SERVICE_OFFER_FIELD_NAMES)assert.ok(workspace.fields.some(field=>field.name===name));
    assert.equal((await records.saveAdminEditableRecord('service',service.id,{serviceInclusions:'Saved through Admin Rex fields'},workspace.version)).ok,true);
    assert.equal((await tx.product.findUniqueOrThrow({where:{id:service.id}})).serviceInclusions,'Saved through Admin Rex fields');
    const current=await records.getAdminRecordWorkspace('service',service.id);assert.ok((await records.saveAdminEditableRecord('service',service.id,{serviceDeliverables:'x'.repeat(1501)},current.version)).error);
    console.log('PASS Admin Studio exposes and saves all customer expectation fields using the same validation');
    session={userId:vendor.id,role:'VENDOR'};process.env.ANTHROPIC_API_KEY='simulated-provider-only';
    const tool=(name,input)=>({stop_reason:'tool_use',content:[{type:'tool_use',id:'tool-'+name,name,input}]});
    replies=[tool('get_listing_edit_fields',{kind:'service'}),tool('get_product_details',{product_id:service.id}),input=>{
      const latest=JSON.parse(input.messages.at(-1).content[0].content);assert.equal(latest.id,service.id);assert.ok(latest.editableFields.fields.serviceInclusions);
      return tool('update_product',{product_id:service.id,expectedUpdatedAt:latest.updatedAt,serviceInclusions:'Saved through the Rex route'});
    },input=>{const result=JSON.parse(input.messages.at(-1).content[0].content);assert.equal(result.ok,true);assert.equal(result.updatedFields.serviceInclusions,'Saved through the Rex route');return{stop_reason:'end_turn',content:[]};}];
    const route=require('../app/api/vendor-ai/route.ts');const response=await route.POST(new Request('http://localhost/api/vendor-ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'Update the service inclusions.'}]})}));
    assert.equal(response.status,200);const stream=await response.text();assert.ok(!stream.includes('"error"'),stream);assert.equal(replies.length,0);
    assert.equal((await tx.product.findUniqueOrThrow({where:{id:service.id}})).serviceInclusions,'Saved through the Rex route');
    const updateTool=modelCalls[0].tools.find(tool=>tool.name==='update_product'),createTool=modelCalls[0].tools.find(tool=>tool.name==='create_service');assert.ok(updateTool.input_schema.properties.serviceRequirements);assert.ok(createTool.input_schema.properties.serviceDeliverables);assert.ok(invalidations.includes(`/service/${service.slug}`));
    console.log('PASS simulated Rex conversation discovers, reads and updates the real requested field through the API route');
    const event=await tx.event.create({data:{storeId:store.id,title:'Rex ticket fields',slug:`rex-ticket-${Date.now()}`,startDate:new Date('2027-01-15T22:00:00Z'),endDate:new Date('2027-01-16T02:00:00Z'),tags:[],galleryImages:[]}});
    const tier=await tx.eventTicketType.create({data:{eventId:event.id,name:'VIP',price:200,quantity:50,description:'Keep ticket description',perks:'Old perks',maxPerOrder:4,isVisible:true}});
    replies=[tool('get_listing_edit_fields',{kind:'ticket'}),tool('get_event_details',{eventId:event.id}),input=>{
      const details=JSON.parse(input.messages.at(-1).content[0].content);assert.equal(details.ticketTypes[0].id,tier.id);
      return tool('update_ticket_type',{ticketTypeId:tier.id,perks:'Food and VIP lounge access'});
    },input=>{assert.equal(JSON.parse(input.messages.at(-1).content[0].content).success,true);return{stop_reason:'end_turn',content:[]};}];
    const ticketResponse=await route.POST(new Request('http://localhost/api/vendor-ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'Update what is included in the VIP ticket.'}]})}));
    const ticketStream=await ticketResponse.text();assert.ok(!ticketStream.includes('"error"'),ticketStream);assert.equal(replies.length,0);
    const savedTier=await tx.eventTicketType.findUniqueOrThrow({where:{id:tier.id}});assert.equal(savedTier.perks,'Food and VIP lounge access');assert.equal(savedTier.description,'Keep ticket description');assert.equal(savedTier.price,200);assert.equal(savedTier.quantity,50);assert.equal(savedTier.maxPerOrder,4);
    const tickets=require('../app/actions/events.ts'),{ticketPatchFormData}=require('../lib/chat/vendor-ticket-fields.ts');
    assert.equal((await tickets.updateTicketType(tier.id,ticketPatchFormData({perks:null,isVisible:false}))).success,true);
    assert.equal((await tx.eventTicketType.findUniqueOrThrow({where:{id:tier.id}})).perks,null);
    assert.throws(()=>ticketPatchFormData(JSON.parse('{"__proto__":{}}')),/cannot be edited/);assert.throws(()=>ticketPatchFormData({quantitySold:10}),/cannot be changed/);assert.throws(()=>ticketPatchFormData({maxPerOrder:0}),/at least one/);
    session={userId:admin.id,role:'VENDOR'};assert.ok((await tickets.updateTicketType(tier.id,ticketPatchFormData({perks:'No permission'}))).error);
    console.log('PASS Rex edits existing ticket inclusions without changing price, stock or description; clearing and owner checks work');
  } finally { Module._load=original; }
  throw rollback;
},{timeout:60000});}catch(error){if(error!==rollback)throw error;}finally{await real.$disconnect();}})().then(()=>console.log('All database writes rolled back. No model calls, payments, emails or uploads.')).catch(error=>{console.error(error);process.exitCode=1;});
