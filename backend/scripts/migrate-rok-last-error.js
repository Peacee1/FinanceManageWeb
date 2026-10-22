const fs=require('fs'),path=require('path'),db=require('../config/db');
db.transaction(async c=>{
 await c.query('SELECT pg_advisory_xact_lock(732619)');
 await c.query(fs.readFileSync(path.join(__dirname,'../migrations/043_rokbot_last_error.sql'),'utf8'));
 await c.query('INSERT INTO schema_migrations(name) VALUES($1) ON CONFLICT(name) DO NOTHING',['043_rokbot_last_error.sql']);
}).then(()=>console.log('Last error migration applied.')).catch(e=>{console.error('Migration failed:',e.code);process.exitCode=1;}).finally(()=>db.close());
