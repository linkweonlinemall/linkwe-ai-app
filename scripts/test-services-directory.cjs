// Directory rules plus real public queries in a rolled-back, loopback-only transaction.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
require('dotenv').config({path:'.env.local',quiet:true});require('dotenv').config({path:'.env',quiet:true});
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL||'').hostname))throw new Error('Directory checks require a loopback database');
process.env.NODE_ENV='test';
const {PrismaClient}=require('@prisma/client');const prisma=new PrismaClient();let db=prisma;
const load=Module._load;Module._load=function(request,parent,isMain){if(request==='server-only')return {};if(request==='@/lib/prisma')return {get prisma(){return db;}};if(request.startsWith('@/'))request=path.join(process.cwd(),request.slice(2));return load.call(this,request,parent,isMain);};
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {parseDirectoryQuery,selectDirectory,directoryHref}=require('../lib/services/directory-query.ts');
const {getServiceDirectory}=require('../lib/services/directory.ts');
let checks=0;function pass(name){checks++;console.log('PASS '+name);}
const example={id:'a',name:'A session',slug:'a',price:100,images:[],category:'test',serviceType:'BOOKABLE',quotePriceType:null,serviceLocation:'AT_VENDOR',serviceDuration:null,durationMinutes:45,isFeatured:false,requiresDeposit:false,depositAmount:null,subscriptionInterval:null,responseTime:null,isAvailable:true,shortDescription:'A relaxed appointment',tags:['wellness'],sessionsIncluded:null,reviewAvg:4.5,reviewCount:4,store:{name:'Test studio',slug:'studio',region:'san fernando',logoUrl:null}};
const quote={...example,id:'b',name:'B quote',serviceType:'QUOTE',quotePriceType:'FREE_QUOTE',price:0};
const online={...example,id:'c',name:'C online',serviceType:'VIRTUAL',serviceLocation:null,durationMinutes:30,price:70};
const unknown={...example,id:'d',name:'D custom',serviceType:'QUOTE',quotePriceType:null,price:0};
const callout={...example,id:'e',name:'E assessment',serviceType:'QUOTE',quotePriceType:'CALLOUT_FEE',price:50};
(async()=>{
 let q=parseDirectoryQuery({minPrice:'Infinity',maxPrice:'-5',serviceType:'BAD',minimumRating:'9',page:'bad'});assert.equal(q.minPrice,undefined);assert.equal(q.maxPrice,undefined);assert.equal(q.serviceType,'');assert.equal(q.minimumRating,0);assert.equal(q.page,1);pass('Malformed query values are normalised');
 q=parseDirectoryQuery({minPrice:'120',maxPrice:'0'});assert.equal(q.minPrice,0);assert.equal(q.maxPrice,120);pass('Zero prices and reversed ranges handled');
 const url=new URL(directoryHref({q:'hair & nails',region:'san fernando',page:'2'},{serviceType:'QUOTE',page:undefined}),'https://example.com');assert.equal(url.searchParams.get('q'),'hair & nails');assert.equal(url.searchParams.get('region'),'san fernando');assert.equal(url.searchParams.has('page'),false);pass('Refinements preserve search and reset pagination');
 const inventory=[example,quote,online,unknown,callout];
 let result=selectDirectory(inventory,parseDirectoryQuery({maxPrice:'80'}));assert.deepEqual(result.services.map(s=>s.id).sort(),['c','e']);pass('Custom and free quotes are not treated as free services by fee filters');
 for(const sort of ['price_asc','price_desc']){result=selectDirectory(inventory,parseDirectoryQuery({sort}));assert.ok(result.services.slice(-2).every(s=>['b','d'].includes(s.id)));}pass('Unpriced quotes follow listed fees in both price sort directions');
 result=selectDirectory(inventory,parseDirectoryQuery({location:'VIRTUAL'}));assert.equal(result.services[0].id,'c');assert.equal(result.total,1);pass('Virtual type is recognised even without an explicit location');
 result=selectDirectory([example,online],parseDirectoryQuery({sort:'duration'}));assert.equal(result.services[0].id,'c');pass('Duration sorting uses the actual session duration');
 result=selectDirectory([example,{...online,reviewCount:0}],parseDirectoryQuery({minimumRating:'4'}));assert.equal(result.total,1);pass('Rating filter excludes unrated services');
 result=selectDirectory(inventory,parseDirectoryQuery({q:'wellness',region:'san fernando',serviceType:'BOOKABLE'}));assert.equal(result.total,1);pass('Search covers tags and combines with location and service type');
 const many=Array.from({length:40},(_,i)=>({...example,id:String(i),name:`Session ${String(i).padStart(2,'0')}`}));const first=selectDirectory(many,parseDirectoryQuery({}));const second=selectDirectory(many,parseDirectoryQuery({page:'2'}));assert.equal(first.services.length,18);assert.equal(second.services.length,18);assert.ok(second.services.every(s=>!first.services.some(a=>a.id===s.id)));assert.equal(selectDirectory(many,parseDirectoryQuery({page:'1000'})).page,3);pass('Pagination has no duplicate records and clamps impossible pages');
 const marker=`services-check-${Date.now()}`,rollback=new Error('ROLLBACK_TEST');
 try{await prisma.$transaction(async tx=>{db=tx;
  const user=await tx.user.create({data:{email:`${marker}@linkwe.test`,fullName:'Directory test',role:'VENDOR',idVerificationStatus:'APPROVED'}});
  const store=await tx.store.create({data:{ownerId:user.id,name:marker,slug:marker,categoryId:'other',region:'san fernando',status:'ACTIVE'}});
  const data={storeId:store.id,category:marker,isService:true,isPublished:true,tags:[],images:[],serviceType:'BOOKABLE',durationMinutes:45,price:100};
  await tx.product.createMany({data:[{...data,name:'Visible service',slug:marker},{...data,name:'Draft service',slug:`${marker}-draft`,isPublished:false},{...data,name:'Archived service',slug:`${marker}-archived`,isArchived:true},{...data,name:'Product',slug:`${marker}-product`,isService:false}]});
  result=await getServiceDirectory(parseDirectoryQuery({category:marker}));assert.equal(result.total,1);assert.equal(result.preview,false);assert.equal(result.services[0].durationMinutes,45);pass('Database query excludes drafts, archives and products');
  await tx.store.update({where:{id:store.id},data:{status:'DRAFT'}});result=await getServiceDirectory(parseDirectoryQuery({category:marker}));assert.equal(result.total,0);pass('Services from non-sellable stores stay hidden');
  await tx.store.update({where:{id:store.id},data:{status:'ACTIVE'}});await tx.user.update({where:{id:user.id},data:{idVerificationStatus:'UNSUBMITTED'}});result=await getServiceDirectory(parseDirectoryQuery({category:marker}));assert.equal(result.total,0);pass('Unverified owners stay excluded');
  throw rollback;
 },{timeout:30000});}catch(error){if(error!==rollback)throw error;}
 assert.equal(await prisma.store.count({where:{slug:marker}}),0);pass('All temporary data rolled back');
 console.log(`${checks} services directory checks passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>prisma.$disconnect());
