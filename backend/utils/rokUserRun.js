const {active,getLicense}=require('./rokLicense');
async function setUserRun(c,userId,enabled,source,requireCapacity=false){
 const license=await getLicense(userId,c);
 const accounts=(await c.query('SELECT id,governors FROM rokbot_accounts WHERE user_id=$1 ORDER BY id FOR UPDATE',[userId])).rows;
 const total=accounts.reduce((n,a)=>n+a.governors.length,0);
 if(enabled&&(!active(license)||total>license.capacity))throw Object.assign(Error(!active(license)?'Cần mã kích hoạt còn hạn.':'Đã đăng ký '+total+' nhân vật, gói chỉ cho phép '+license.capacity+'.'),{status:403});
 const plans=enabled&&requireCapacity?await require('./rokCapacity').checkCapacity(c,accounts):null;
 if(source){const account=accounts.find(a=>String(a.id)===String(source.accountId));const g=account?.governors.find(g=>g.id===source.governorId);if(!g)throw Object.assign(Error('Không tìm thấy nhân vật của bạn.'),{status:400});if(source.applyOthers)for(const item of account.governors)item.config=source.config;else g.config=source.config;}
 const changed=[];
 for(const a of accounts){let invalidate=false;for(const g of a.governors){if(enabled&&!g.enabled){g.enabled=true;g.state='queued';g.next_at=null;invalidate=true;}if(!enabled&&g.enabled){g.enabled=false;g.state='stopped';invalidate=true;}}
  await c.query('UPDATE rokbot_accounts SET governors=$1,updated_at=now() WHERE id=$2',[JSON.stringify(a.governors),a.id]);
  if(invalidate){await c.query('DELETE FROM rokbot_assignments WHERE account_id=$1',[a.id]);changed.push(String(a.id));}
 }
 if(plans)await require('./rokCapacity').reserveCapacity(c,plans,changed);
 await c.query('UPDATE rokbot_licenses SET auto_run=$1 WHERE user_id=$2',[enabled,userId]);return {count:total,changed};
}
module.exports={setUserRun};
