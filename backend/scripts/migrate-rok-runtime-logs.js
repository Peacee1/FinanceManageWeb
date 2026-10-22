const fs=require('fs'),path=require('path'),db=require('../config/db');
db.transaction(async c=>{
 await c.query('SELECT pg_advisory_xact_lock(732619)');
 await c.query(fs.readFileSync(path.join(__dirname,'../migrations/044_rokbot_runtime_logs.sql'),'utf8'));
 await c.query('INSERT INTO schema_migrations(name) VALUES($1) ON CONFLICT(name) DO NOTHING',['044_rokbot_runtime_logs.sql']);
}).then(()=>console.log('Runtime logs migration applied.')).catch(e=>{console.error('Migration failed:',e.code);process.exitCode=1;}).finally(()=>db.close());
