const actions=new Set(['login','register','recovery']);
const jwt=require('jsonwebtoken'),{createHash}=require('crypto');
const cookie='__Host-peacee1_captcha';
const binding=req=>createHash('sha256').update((req.ip||'')+'|'+(req.headers?.['user-agent']||'')).digest('hex');
function proof(req,action){try{const value=(req.headers?.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookie+'='))?.slice(cookie.length+1);const p=jwt.verify(value,process.env.TURNSTILE_SECRET_KEY,{algorithms:['HS256'],audience:'captcha',issuer:'peacee1'});return p.action===action&&p.binding===binding(req)?p:null;}catch{return null;}}
function enabled(){return process.env.TURNSTILE_ENABLED==='true';}
function config(req,res){res.json({enabled:enabled(),siteKey:enabled()?process.env.TURNSTILE_SITE_KEY:null});}
const requireCaptcha=action=>async(req,res,next)=>{
 if(!enabled())return next();
 if(!process.env.TURNSTILE_SECRET_KEY||!process.env.TURNSTILE_SITE_KEY)return res.status(503).json({message:'Xác minh bảo mật chưa sẵn sàng.'});
 const existing=proof(req,action);
 if(existing){res.setHeader('X-Captcha-Verified-Until',String(existing.exp*1000));return next();}
 const token=req.body.captchaToken;
 if(!actions.has(action)||typeof token!=='string'||!token||token.length>2048)return res.status(400).json({message:'Vui lòng hoàn tất CAPTCHA.'});
 try{
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:process.env.TURNSTILE_SECRET_KEY,response:token,remoteip:req.ip})});
  const result=await response.json();
  const hosts=(process.env.TURNSTILE_HOSTNAMES||'peacee1.io.vn,www.peacee1.io.vn').split(',');
  if(!response.ok||!result.success||result.action!==action||!hosts.includes(result.hostname))return res.status(400).json({message:'CAPTCHA không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.'});
  const grant=jwt.sign({action,binding:binding(req)},process.env.TURNSTILE_SECRET_KEY,{algorithm:'HS256',expiresIn:600,audience:'captcha',issuer:'peacee1'});
  res.cookie(cookie,grant,{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:600000});
  res.setHeader('X-Captcha-Verified-Until',String(jwt.decode(grant).exp*1000));
  next();
 }catch{return res.status(503).json({message:'Không thể xác minh CAPTCHA. Vui lòng thử lại.'});}
};
module.exports={config,requireCaptcha};
