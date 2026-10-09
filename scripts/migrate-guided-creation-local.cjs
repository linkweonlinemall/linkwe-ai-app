const fs=require('node:fs');
require('dotenv').config({path:'.env.local',quiet:true});require('dotenv').config({path:'.env',quiet:true});
const db=new URL(process.env.DATABASE_URL||'');
if(!['localhost','127.0.0.1','[::1]'].includes(db.hostname)||db.pathname!=='/linkwe_dev')throw Error('Local linkwe_dev database required.');
const {PrismaClient}=require('@prisma/client'),prisma=new PrismaClient();
(async()=>{try{const rows=await prisma.$queryRaw`SELECT to_regclass('public."GuidedCreationPlan"')::text AS name`;if(rows[0].name){console.log('Guided Creation table already exists.');return;}const sql=fs.readFileSync('prisma/migrations/20261008020000_guided_creation/migration.sql','utf8');await prisma.$transaction(async tx=>{for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await tx.$executeRawUnsafe(statement);});console.log('Applied Guided Creation migration to local database only.');}finally{await prisma.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
