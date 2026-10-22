const fs=require('fs'),db=require('../config/db');
const [id,output]=process.argv.slice(2);
if(!/^[a-f0-9-]{36}$/i.test(id||'')||!output)throw Error('Usage: node export-rok-last-error.js CLIENT_UUID OUTPUT.jpg');
db.query('SELECT version,stage,message,screenshot,created_at FROM rokbot_last_error WHERE agent_id=$1',[id]).then(({rows})=>{
 const row=rows[0];if(!row)throw Error('No diagnostic');
 if(row.screenshot)fs.writeFileSync(output,Buffer.from(row.screenshot,'base64'));
 const {screenshot,...info}=row;fs.writeFileSync(output+'.json',JSON.stringify(info,null,2));
 console.log(row.screenshot?'Diagnostic exported.':'Metadata only; no safe screenshot.');
}).catch(()=>{console.error('Could not export diagnostic.');process.exitCode=1;}).finally(()=>db.close());
