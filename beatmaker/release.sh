#!/usr/bin/env bash
set -euo pipefail
cd /home/ec2-user/FinanceManageWeb
expected_commit=${1:?Expected commit required}
[[ $(git rev-parse HEAD) == "$expected_commit" ]]
[[ -z $(git status --porcelain --untracked-files=no) ]]
release_dir="/home/ec2-user/finance-releases/beatmaker-$expected_commit"
mkdir -p "$release_dir"
chmod 700 "$release_dir"
cd backend
npm ci --omit=dev
node <<'NODE' > "$release_dir/database.dump"
require('dotenv').config({quiet:true});
const {spawnSync}=require('child_process');
const result=spawnSync('pg_dump',['-Fc','-h',process.env.DB_HOST||'localhost','-p',process.env.DB_PORT||'5432','-U',process.env.DB_USER,process.env.DB_NAME],{env:{...process.env,PGPASSWORD:process.env.DB_PASSWORD},stdio:['ignore','inherit','inherit']});
process.exit(result.status??1);
NODE
chmod 600 "$release_dir/database.dump"
npm run migrate
node --test test/auth.test.js test/beatProject.test.js test/melody.test.js
cd ..
pm2 restart backend-api --update-env
healthy=false
for attempt in {1..15};do
 if curl --fail --silent http://127.0.0.1:5000/api/health;then healthy=true;break;fi
 sleep 2
done
[[ "$healthy" == true ]] || { echo 'Backend health failed';exit 1; }
bash beatmaker/deploy.sh "$release_dir"
cd backend
node scripts/verify-beatmaker.js
pm2 save
echo "DEPLOYED BEATMAKER $expected_commit"
