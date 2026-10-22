#!/usr/bin/env bash
set -euo pipefail
cd /home/ec2-user/FinanceManageWeb
release_dir="/home/ec2-user/finance-releases/rokbot-$(date +%Y%m%d%H%M%S)"
mkdir -p "$release_dir"
chmod 700 "$release_dir"
cp backend/index.js backend/utils/webSession.js "$release_dir/"
cp /usr/share/nginx/peacee1-portal/auth.js "$release_dir/portal-auth.js"
cd backend
node <<'NODE' > "$release_dir/database.dump"
require('dotenv').config({quiet:true});const {spawnSync}=require('child_process');const r=spawnSync('pg_dump',['-Fc','-h',process.env.DB_HOST||'localhost','-p',process.env.DB_PORT||'5432','-U',process.env.DB_USER,process.env.DB_NAME],{env:{...process.env,PGPASSWORD:process.env.DB_PASSWORD},stdio:['ignore','inherit','inherit']});process.exit(r.status??1);
NODE
chmod 600 "$release_dir/database.dump"
node <<'NODE'
const fs=require('fs'),crypto=require('crypto');let env=fs.readFileSync('.env','utf8');if(!/^ROKBOT_ENCRYPTION_KEY=/m.test(env)){fs.appendFileSync('.env','\nROKBOT_ENCRYPTION_KEY='+crypto.randomBytes(32).toString('hex')+'\n');}fs.chmodSync('.env',0o600);
const p='index.js';let s=fs.readFileSync(p,'utf8');if(!s.includes("'/api/rok-agent'"))s=s.replace("app.use('/api/beatmaker'","app.use('/api/rok-agent',limiter(120,60000),require('./routes/rokAgentRoutes'));\napp.use('/api/rokbot',limiter(120,60000),require('./routes/rokbotRoutes'));\napp.use('/api/beatmaker'");fs.writeFileSync(p,s);
const w='utils/webSession.js';s=fs.readFileSync(w,'utf8');if(!s.includes('https://rokbot.peacee1.io.vn'))s=s.replace("'https://beatmaker.peacee1.io.vn'","'https://beatmaker.peacee1.io.vn','https://rokbot.peacee1.io.vn'");fs.writeFileSync(w,s);
for(const p of ['../portal/shared-auth.js','../portal/auth.js','/usr/share/nginx/peacee1-portal/auth.js']){try{let s=fs.readFileSync(p,'utf8');if(!s.includes('rokbot.peacee1.io.vn'))s=s.replace(/(['"])beatmaker\.peacee1\.io\.vn\1/g,"'beatmaker.peacee1.io.vn','rokbot.peacee1.io.vn'");fs.writeFileSync(p,s);}catch(e){if(e.code!=='ENOENT'&&e.code!=='EACCES')throw e;}}
NODE
node <<'NODE'
const db=require('./config/db'),fs=require('fs');db.transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(732619)');for(const name of ['038_rokbot_profiles.sql','039_rokbot_fleet.sql']){if(!(await c.query('SELECT 1 FROM schema_migrations WHERE name=$1',[name])).rows.length){await c.query(fs.readFileSync('migrations/'+name,'utf8'));await c.query('INSERT INTO schema_migrations(name) VALUES($1)',[name]);console.log('Applied '+name);}}}).catch(e=>{console.error('ROK migration failed',e.code);process.exitCode=1;}).finally(()=>db.close());
NODE
node --check index.js
node --test test/rokFleet.test.js test/rokApi.test.js test/auth.test.js
pm2 restart backend-api --update-env
cd ..
bash rokbot/deploy.sh
pm2 save
curl --fail --silent http://127.0.0.1:5000/api/health
printf '\nROKBOT DEPLOYED\n'
