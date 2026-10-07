const db=require('../config/db');
const jwt=require('jsonwebtoken');
const {safeOrigin,setSession,clearSession}=require('../utils/webSession');
async function session(req,res,next){try{
 const user=(await db.query('SELECT id,name,email,plan,role,must_change_password FROM users WHERE id=$1',[req.user.userId])).rows[0];
 res.json({user:{id:user.id,name:user.name,email:user.email,plan:user.plan,role:user.role,mustChangePassword:user.must_change_password||false}});
}catch(error){next(error);}}
async function upgrade(req,res,next){
 if(!safeOrigin(req))return res.status(403).json({message:'Yêu cầu không hợp lệ.'});
 const version=(await db.query('SELECT session_version FROM users WHERE id=$1',[req.user.userId])).rows[0].session_version;
 setSession(res,jwt.sign({userId:req.user.userId,role:req.user.role,sv:version},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'1d'}));
 res.json({ok:true});
}
function logout(req,res){if(!safeOrigin(req))return res.status(403).json({message:'Yêu cầu không hợp lệ.'});clearSession(res);res.json({ok:true});}
module.exports={session,upgrade,logout};
