const crypto=require('crypto');
const LIMIT=30;
function selectAssignmentBin(account,bins){
 const size=account.governors.length;
 if(size>LIMIT)return null;
 const eligible=bins.filter(b=>!b.unknown&&(size?b.load+size<=LIMIT:b.load<LIMIT));
 if(account.status!=='ready'){
  // Discovery is interactive customer work: favor an idle worker, then
  // fewer assigned accounts. Preserve best-fit packing for farming.
  eligible.sort((a,b)=>Number(b.status==='idle')-Number(a.status==='idle')||a.accountCount-b.accountCount||a.load-b.load||a.id.localeCompare(b.id));
 }else eligible.sort((a,b)=>b.load-a.load||a.id.localeCompare(b.id));
 return eligible[0]||null;
}
function planFleet(accounts,bots){
 const bins=bots.map(b=>({id:b.id,load:0,accounts:[]}));
 const sorted=[...accounts].sort((a,b)=>b.governors.length-a.governors.length||Number(a.id)-Number(b.id));
 const waiting=[];
 for(const a of sorted){
  const size=a.governors.length;if(!size||size>LIMIT){waiting.push(a.id);continue;}
  const eligible=bins.filter(b=>b.load+size<=LIMIT).sort((a,b)=>b.load-a.load||String(a.id).localeCompare(String(b.id)));
  if(!eligible.length){waiting.push(a.id);continue;}
  eligible[0].accounts.push(a.id);eligible[0].load+=size;
 }
 return {bins,waiting};
}
function encryptionKey(){const k=process.env.ROKBOT_ENCRYPTION_KEY;if(!k||!/^[a-f0-9]{64}$/i.test(k))throw Object.assign(Error('ROK credential encryption unavailable'),{status:503});return Buffer.from(k,'hex');}
function encrypt(value){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey(),iv);const body=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),body].map(b=>b.toString('base64')).join('.');}
function decrypt(value){if(!value)return null;const [iv,tag,body]=value.split('.').map(s=>Buffer.from(s,'base64'));const c=crypto.createDecipheriv('aes-256-gcm',encryptionKey(),iv);c.setAuthTag(tag);return JSON.parse(Buffer.concat([c.update(body),c.final()]).toString('utf8'));}
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
module.exports={LIMIT,planFleet,selectAssignmentBin,encrypt,decrypt,hash};
