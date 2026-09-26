// Local database integration checks. Writes roll back; external services are stubbed.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
require('dotenv').config({path:'.env.local',quiet:true});require('dotenv').config({path:'.env',quiet:true});
const db=new URL(process.env.DATABASE_URL||'');if(!['localhost','127.0.0.1','[::1]'].includes(db.hostname)||db.pathname!=='/linkwe_dev')throw new Error('Only local linkwe_dev is permitted.');
const {PrismaClient}=require('@prisma/client'),real=new PrismaClient(),rollback=new Error('ROLLBACK');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const data=values=>{const fd=new FormData();for(const [key,value]of Object.entries(values))fd.set(key,value);return fd;};
(async()=>{try{await real.$transaction(async tx=>{
 const vendor=await tx.user.create({data:{email:'onboarding-actions-test@linkwe.test',role:'VENDOR',fullName:'Onboarding Test'}});
 let currentId=vendor.id,currentRole='VENDOR',uploads=0,checkouts=0,plan=null,confirmed=false,emails=0,sessions=0;
 const old=Module._load;Module._load=function(request,parent,main){
  if(request==='server-only')return{};
  if(request==='@/lib/prisma')return{prisma:tx};
  if(request==='@/lib/auth/current-user')return{getCurrentUser:async()=>currentId?{...await tx.user.findUniqueOrThrow({where:{id:currentId}}),role:currentRole}:null};
  if(request==='next/navigation')return{redirect:url=>{throw new Error('REDIRECT:'+url);}};
  if(request==='next/headers')return{headers:async()=>({get:()=>null})};
  if(request==='@/lib/security/rate-limit')return{checkRateLimit:async()=>({allowed:true}),resetRateLimit:()=>{}};
  if(request==='@/lib/auth/session')return{createSessionFromUser:async()=>{sessions++;},destroySession:async()=>{}};
  if(request==='@/lib/auth/email-verification')return{sendVerificationEmail:async()=>{emails++;}};
  if(request==='@/lib/auth/landing')return{resolveAuthLandingPath:async user=>user.role==='VENDOR'?'/onboarding/business/plan':'/dashboard/customer'};
  if(request==='@/lib/onboarding/intended-plan')return{getIntendedPlanCookie:async()=>plan,getPlanPickerConfirmedCookie:async()=>confirmed,setIntendedPlanCookie:async value=>{plan=value;},setPlanPickerConfirmedCookie:async()=>{confirmed=true;},clearIntendedPlanCookie:async()=>{plan=null;},parseIntendedPlanParam:raw=>['STARTER','GROWTH','PRO'].includes(raw.toUpperCase())?raw.toUpperCase():null};
  if(request==='@/lib/onboarding/save-kyc-upload')return{saveKycDocumentUpload:async()=>{uploads++;return{ok:true,publicPath:'/test-only-upload-'+uploads};}};
  if(request==='@/app/actions/vendor')return{startSubscriptionCheckout:async()=>{checkouts++;return{ok:true,checkoutUrl:'/test-only-checkout'};}};
  if(request.startsWith('@/'))request=path.join(process.cwd(),request.slice(2));return old.call(this,request,parent,main);
 };
 try {
  const actions=require('../app/(app)/onboarding/business/actions.ts');
  const profile=data({fullName:'Preview Owner',region:'San Fernando',phone:''});
  currentId=null;assert.ok((await actions.saveBusinessOnboardingStep1({},profile)).error);await assert.rejects(actions.skipBusinessIdentityVerification(),/REDIRECT:\/login/);
  currentId=vendor.id;currentRole='CUSTOMER';assert.ok((await actions.confirmBusinessPlanChoice({},data({plan:'PRO'}))).error);currentRole='VENDOR';
  assert.ok((await actions.confirmBusinessPlanChoice({},data({plan:'UNKNOWN'}))).error);await assert.rejects(actions.confirmBusinessPlanChoice({},data({plan:'STARTER'})),/step-1/);assert.equal(confirmed,true);assert.equal(plan,'STARTER');
  const storeForm=data({name:'Onboarding action test',slug:'onboarding-action-test',categoryId:'professional_services',region:'San Fernando',tagline:'Test storefront only.'});
  assert.ok((await actions.saveBusinessOnboardingStep3({},storeForm)).error);await assert.rejects(actions.skipBusinessIdentityVerification(),/step-1/);
  assert.ok((await actions.saveBusinessOnboardingStep1({},data({fullName:'Preview Owner',region:'Invalid region'}))).error);
  await assert.rejects(actions.saveBusinessOnboardingStep1({},profile),/step-2/);assert.equal((await tx.user.findUniqueOrThrow({where:{id:vendor.id}})).phone,null);
  await assert.rejects(actions.skipBusinessIdentityVerification(),/step-3/);assert.equal(uploads,0);assert.equal((await tx.user.findUniqueOrThrow({where:{id:vendor.id}})).idVerificationStatus,'UNSUBMITTED');
  const partial=data({document:new File(['pdf'],'test.pdf',{type:'application/pdf'})});assert.ok((await actions.saveBusinessOnboardingStep2({},partial)).error);assert.equal(uploads,0);
  const invalid=data({document:new File(['pdf'],'test.pdf',{type:'application/pdf'}),selfieWithId:new File(['bad'],'test.svg',{type:'image/svg+xml'})});assert.ok((await actions.saveBusinessOnboardingStep2({},invalid)).error);assert.equal(uploads,0);
  invalid.set('selfieWithId',new File([new Uint8Array(3*1024*1024+1)],'large.jpg',{type:'image/jpeg'}));assert.ok((await actions.saveBusinessOnboardingStep2({},invalid)).error);assert.equal(uploads,0);
  const notACategory=data({name:'Test',slug:'onboarding-test-category',categoryId:'invalid',region:'San Fernando',tagline:'Test'});assert.ok((await actions.saveBusinessOnboardingStep3({},notACategory)).error);
  await assert.rejects(actions.saveBusinessOnboardingStep3({},storeForm),/store_created=1/);
  const store=await tx.store.findUniqueOrThrow({where:{ownerId:vendor.id}});assert.equal(store.status,'DRAFT');assert.equal(store.onboardingStep,3);assert.equal(checkouts,0);
  const {isStoreSellable}=require('../lib/store/sellable-store.ts');assert.equal(isStoreSellable({...store,owner:{idVerificationStatus:'UNSUBMITTED'}}),false);
  const {getNextBusinessOnboardingStep}=require('../lib/onboarding/business-progress.ts');assert.equal(getNextBusinessOnboardingStep(await tx.user.findUniqueOrThrow({where:{id:vendor.id}}),store),null);
  await tx.store.update({where:{id:store.id},data:{status:'ACTIVE'}});await assert.rejects(actions.saveBusinessOnboardingStep3({},storeForm),/REDIRECT:\/dashboard\/vendor$/);assert.equal((await tx.store.findUniqueOrThrow({where:{id:store.id}})).status,'ACTIVE');assert.equal(checkouts,0);
  const second=await tx.user.create({data:{email:'onboarding-upload-test@linkwe.test',role:'VENDOR',fullName:'Upload Test',region:'San Fernando'}});currentId=second.id;
  const pair=data({document:new File(['pdf'],'test.pdf',{type:'application/pdf'}),selfieWithId:new File(['photo'],'test.jpg',{type:'image/jpeg'})});await assert.rejects(actions.saveBusinessOnboardingStep2({},pair),/step-3/);assert.equal(uploads,2);assert.equal((await tx.user.findUniqueOrThrow({where:{id:second.id}})).idVerificationStatus,'PENDING');
  await assert.rejects(actions.skipBusinessIdentityVerification(),/step-3/);assert.equal((await tx.user.findUniqueOrThrow({where:{id:second.id}})).idVerificationStatus,'PENDING');
  assert.ok((await actions.saveBusinessOnboardingStep3({},storeForm)).error);assert.equal(await tx.store.count({where:{ownerId:second.id}}),0);
  plan='PRO';storeForm.set('slug','onboarding-paid-test');await assert.rejects(actions.saveBusinessOnboardingStep3({},storeForm),/test-only-checkout/);assert.equal(checkouts,1);assert.ok(await tx.store.findUnique({where:{ownerId:second.id}}));
  const auth=require('../app/(auth)/auth-actions.ts');const registration=data({signupKind:'CUSTOMER',email:'onboarding-registration-test@linkwe.test',password:'TestOnly!2026',fullName:'Customer Test'});assert.ok((await auth.registerAction({},registration)).error);assert.equal(sessions,0);assert.equal(emails,0);
  registration.set('termsAccepted','yes');await assert.rejects(auth.registerAction({},registration),/dashboard\/customer\?signup_success=customer/);assert.equal(sessions,1);assert.equal(emails,1);assert.ok((await auth.registerAction({},registration)).error);assert.equal(sessions,1);
  console.log('PASS auth/role guards, plan selection, required details, optional phone, identity skip preserves status with zero uploads, incomplete/type/size upload rejection, valid pair submission, valid categories, slug conflicts, draft creation without ID, public visibility gate, repeat submission protection, paid checkout order, registration terms and duplicate email.');
 } finally {Module._load=old;}
 throw rollback;
},{timeout:45000});}catch(error){if(error!==rollback)throw error;}finally{await real.$disconnect();}})().then(()=>console.log('All writes rolled back. No real emails, uploads or payments.')).catch(error=>{console.error(error);process.exitCode=1;});
