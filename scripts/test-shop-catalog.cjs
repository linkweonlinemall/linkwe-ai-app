// Real database queries inside a rolled-back transaction. Loopback only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
require('dotenv').config({path:'.env.local',quiet:true});require('dotenv').config({path:'.env',quiet:true});
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL||'').hostname))throw new Error('Shop checks require a loopback database');
process.env.NODE_ENV='test';
const {PrismaClient}=require('@prisma/client');const prisma=new PrismaClient();let db=prisma;
const load=Module._load;Module._load=function(request,parent,isMain){if(request==='server-only')return {};if(request==='@/lib/prisma')return {get prisma(){return db;}};if(request.startsWith('@/'))request=path.join(process.cwd(),request.slice(2));return load.call(this,request,parent,isMain);};
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {getShopCatalog}=require('../lib/shop/catalog.ts'),{parseShopQuery}=require('../lib/shop/query.ts');
const marker=`shop-check-${Date.now()}`;const rollback=new Error('ROLLBACK_TEST');let checks=0;
function pass(name){checks++;console.log('PASS '+name);}
(async()=>{
 try{await prisma.$transaction(async tx=>{db=tx;
  const user=await tx.user.create({data:{email:`${marker}@linkwe.test`,fullName:'Shop catalogue test',role:'VENDOR',idVerificationStatus:'APPROVED'}});
  const store=await tx.store.create({data:{ownerId:user.id,name:marker,slug:marker,categoryId:'other',region:'san fernando',status:'ACTIVE'}});
  const base={storeId:store.id,category:marker,isPublished:true,tags:[],images:[]};
  await tx.product.createMany({data:Array.from({length:27},(_,i)=>({...base,name:`${marker} item ${i}`,slug:`${marker}-${i}`,price:i,stock:i===0?0:i===1?null:10,condition:'NEW'}))});
  await tx.product.create({data:{...base,name:`${marker} hidden`,slug:`${marker}-hidden`,isPublished:false,price:1}});
  await tx.product.create({data:{...base,name:`${marker} archived`,slug:`${marker}-archived`,isArchived:true,price:1}});
  await tx.product.create({data:{...base,name:`${marker} service`,slug:`${marker}-service`,isService:true,price:1}});
  let result=await getShopCatalog(parseShopQuery({category:marker,sort:'price_asc'}));assert.equal(result.total,27);assert.equal(result.products.length,24);assert.equal(result.pages,2);assert.equal(result.preview,false);const ids=result.products.map(p=>p.id);pass('Published products only; services, drafts and archives are excluded');
  result=await getShopCatalog(parseShopQuery({category:marker,sort:'price_asc',page:'2'}));assert.equal(result.products.length,3);assert.ok(result.products.every(p=>!ids.includes(p.id)));assert.equal(result.products[0].price,24);pass('Second page returns remaining products without duplicates');
  result=await getShopCatalog(parseShopQuery({category:marker,page:'999'}));assert.equal(result.page,2);pass('Out-of-range page resolves to the last page');
  result=await getShopCatalog(parseShopQuery({category:marker,inStock:'true'}));assert.equal(result.total,26);assert.ok(result.products.some(p=>p.stock===null));pass('Unlimited stock remains available; zero stock is excluded');
  result=await getShopCatalog(parseShopQuery({q:marker,region:'san fernando',minPrice:'3',maxPrice:'5'}));assert.equal(result.total,3);pass('Search, location and price combine correctly');
  const variantProduct=await tx.product.create({data:{...base,name:`${marker} variants`,slug:`${marker}-variants`,hasVariants:true,stock:0,variants:{create:[{name:'Red S',stock:0,images:[],attributes:[{name:'Colour',value:'red'},{name:'Size',value:'S'}]},{name:'Blue M',stock:4,images:[],attributes:[{name:'Colour',value:'blue'},{name:'Size',value:'M'}]}]}}});
  result=await getShopCatalog(parseShopQuery({category:marker,colour:'red',size:'M'}));assert.equal(result.total,0);pass('Colour and size must belong to the same variant');
  result=await getShopCatalog(parseShopQuery({category:marker,colour:'red',inStock:'true'}));assert.equal(result.total,0);result=await getShopCatalog(parseShopQuery({category:marker,colour:'blue',size:'M',inStock:'true'}));assert.equal(result.total,1);assert.equal(result.products[0].id,variantProduct.id);pass('In-stock filter checks the selected variant, not another variant');
  await tx.store.update({where:{id:store.id},data:{status:'DRAFT'}});result=await getShopCatalog(parseShopQuery({q:marker}));assert.equal(result.total,0);pass('Non-sellable stores never appear in results');
  throw rollback;
 },{timeout:30000});}catch(error){if(error!==rollback)throw error;}
 assert.equal(await prisma.store.count({where:{slug:marker}}),0);pass('All temporary data rolled back');
 console.log(`${checks} shop catalogue checks passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>prisma.$disconnect());
