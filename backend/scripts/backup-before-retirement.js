// Run on the server from backend; never prints database credentials.
require('dotenv').config();
const {spawnSync}=require('child_process');
const fs=require('fs');
const {createHash}=require('crypto');
const directory=process.argv[2];
if(!directory || !directory.startsWith('/home/ec2-user/finance-releases/'))throw new Error('Invalid backup directory');
fs.mkdirSync(directory,{recursive:true,mode:0o700});
const file=directory+'/database.dump';
const env={...process.env,PGPASSWORD:process.env.DB_PASSWORD};
const result=spawnSync('pg_dump',['-h',process.env.DB_HOST,'-p',process.env.DB_PORT||'5432','-U',process.env.DB_USER,'-d',process.env.DB_NAME,'-Fc','-f',file],{env,encoding:'utf8'});
if(result.status!==0)throw new Error('Database backup failed');
fs.chmodSync(file,0o600);
const check=spawnSync('pg_restore',['--list',file],{encoding:'utf8'});
if(check.status!==0 || !check.stdout.includes('businesses'))throw new Error('Backup verification failed');
const digest=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
fs.writeFileSync(file+'.sha256',digest+'  database.dump\n',{mode:0o600});
console.log(JSON.stringify({backup:file,bytes:fs.statSync(file).size,sha256:digest,verified:true}));
