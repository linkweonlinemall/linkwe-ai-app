// Demo fixtures restricted to this task's disposable localhost database.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const database = new URL(process.env.DATABASE_URL || '');
if(database.hostname !== '127.0.0.1' || database.port !== '55440' || database.pathname !== '/linkwe_analytics_test') throw Error('Only the isolated analytics preview database is allowed.');
const db = new PrismaClient();
(async()=>{
 await db.user.upsert({where:{email:'analytics-preview@example.test'},update:{},create:{id:'analytics-local-admin',email:'analytics-preview@example.test',fullName:'Local analytics preview',role:'ADMIN',passwordHash:await bcrypt.hash('AnalyticsPreview-LocalOnly!',10),emailVerified:new Date()}});
 for(let i=0;i<8;i++) {
  const id=`analytics-local-customer-${i}`;
  await db.user.upsert({where:{id},update:{},create:{id,email:`${id}@example.test`,fullName:'Local demo customer',role:'CUSTOMER',createdAt:new Date(Date.now()-(i+1)*86400_000)}});
 }
 for(let i=0;i<4;i++) {
  const id=`analytics-local-vendor-${i}`;
  await db.user.upsert({where:{id},update:{},create:{id,email:`${id}@example.test`,fullName:'Local demo vendor',role:'VENDOR',createdAt:new Date(Date.now()-(i+1)*86400_000)}});
  await db.store.upsert({where:{id},update:{},create:{id,ownerId:id,name:`Local demo store ${i+1}`,slug:id,categoryId:'clothing_apparel',region:'port_of_spain',onboardingStep:i<2?3:1,status:i===0?'ACTIVE':'DRAFT',createdAt:new Date(Date.now()-(i+1)*86400_000)}});
 }
 console.log('Local demo only: analytics-preview@example.test / AnalyticsPreview-LocalOnly!');
 console.log('12 account creations, 4 stores, 2 saved setups. No payments, social totals or production records created.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
