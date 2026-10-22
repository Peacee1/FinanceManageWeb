#!/usr/bin/env bash
set -euo pipefail
cd /home/ec2-user/FinanceManageWeb/backend
node <<'NODE'
require('dotenv').config({quiet:true});const db=require('./config/db'),fs=require('fs');
db.transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(732619)');const name='040_rokbot_licenses.sql';if(!(await c.query('SELECT 1 FROM schema_migrations WHERE name=$1',[name])).rows.length){await c.query(fs.readFileSync('migrations/'+name,'utf8'));await c.query('INSERT INTO schema_migrations(name) VALUES($1)',[name]);console.log('Applied license migration');}}).catch(e=>{console.error(e.code);process.exitCode=1;}).finally(()=>db.close());
NODE
node --check routes/rokbotRoutes.js
node --check routes/rokAgentRoutes.js
node --test test/rokApi.test.js test/rokLicense.test.js
pm2 restart backend-api --update-env
cd ..
bash rokbot/deploy.sh
