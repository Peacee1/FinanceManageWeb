const db=require('../config/db');
function active(license,now=Date.now()){return !!license&&new Date(license.expires_at).getTime()>now;}
async function getLicense(userId,client=db){return (await client.query('SELECT capacity,expires_at,auto_run FROM rokbot_licenses WHERE user_id=$1',[userId])).rows[0]||null;}
async function requireSlot(client,userId,alreadyEnabled){
 return requireSlots(client,userId,alreadyEnabled?0:1);
}
async function requireSlots(client,userId,additional){
 const license=await getLicense(userId,client);
 if(!active(license))throw Object.assign(Error('Nhập mã kích hoạt còn hạn để chạy farm.'),{status:403});
 const accounts=(await client.query('SELECT governors FROM rokbot_accounts WHERE user_id=$1',[userId])).rows;
 const used=accounts.reduce((n,a)=>n+a.governors.filter(g=>g.enabled).length,0);
 if(used+additional>license.capacity)throw Object.assign(Error('Gói cho phép '+license.capacity+' nhân vật; đang bật '+used+', cần thêm '+additional+'.'),{status:403});
 return license;
}
module.exports={active,getLicense,requireSlot,requireSlots};
