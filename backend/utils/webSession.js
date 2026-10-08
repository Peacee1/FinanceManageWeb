const COOKIE='peacee1_session';
const origins=new Set(['https://peacee1.io.vn','https://www.peacee1.io.vn','https://finance.peacee1.io.vn','https://salesmanager.peacee1.io.vn','https://tasks.peacee1.io.vn','https://boardgame.peacee1.io.vn','https://beatmaker.peacee1.io.vn']);
function cookieToken(req){const value=(req.headers.cookie||'').split(';').map(part=>part.trim()).find(part=>part.startsWith(COOKIE+'='));return value?.slice(COOKIE.length+1);}
function safeOrigin(req){return origins.has(req.headers.origin);}
function setSession(res,token){res.cookie(COOKIE,token,{httpOnly:true,secure:true,sameSite:'lax',domain:'.peacee1.io.vn',path:'/',maxAge:86400000});}
function clearSession(res){res.clearCookie(COOKIE,{httpOnly:true,secure:true,sameSite:'lax',domain:'.peacee1.io.vn',path:'/'});}
module.exports={cookieToken,safeOrigin,setSession,clearSession};
