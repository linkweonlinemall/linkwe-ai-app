const fs=require('node:fs');
require('dotenv').config({path:'.env.local',quiet:true});require('dotenv').config({path:'.env',quiet:true});
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL||'').hostname))throw new Error('This helper only applies the additive analytics migration to a loopback development database.');
const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();
(async()=>{
 const existing=await p.$queryRaw`SELECT to_regclass('public.analytics_events')::text AS name`;
 const sql=fs.readFileSync('prisma/migrations/20261008010000_marketplace_analytics/migration.sql','utf8');
 if(existing[0].name){
   await p.$transaction(async tx=>{for(const statement of sql.split(';').filter(s=>/CREATE INDEX/.test(s)))await tx.$executeRawUnsafe(statement.replace('CREATE INDEX','CREATE INDEX IF NOT EXISTS'));});
   console.log('Analytics tables already exist; supporting indexes are ready.');return;
 }
 await p.$transaction(async tx=>{for(const statement of sql.split(';').filter(s=>s.trim()))await tx.$executeRawUnsafe(statement);});
 console.log('Applied additive analytics migration to local database.');
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>p.$disconnect());
