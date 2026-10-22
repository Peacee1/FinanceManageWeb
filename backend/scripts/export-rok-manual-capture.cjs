const fs=require('fs'),db=require('../config/db');
const [id,output]=process.argv.slice(2);
if(!/^[a-f0-9-]{36}$/i.test(id||'')||!output)throw Error('Usage: UUID OUTPUT');
db.query('SELECT completed_at,message,screenshot FROM rokbot_capture WHERE agent_id=$1',[id]).then(({rows})=>{
 const r=rows[0];if(!r?.screenshot)throw Error('No image');
 fs.writeFileSync(output,Buffer.from(r.screenshot,'base64'));
 console.log(JSON.stringify({completed_at:r.completed_at,message:r.message}));
}).catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.close());
