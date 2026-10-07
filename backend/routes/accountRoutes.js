const router=require('express').Router();
const {rateLimit}=require('express-rate-limit');
const {protect}=require('../middleware/authMiddleware');
const account=require('../controllers/accountController');
router.use((req,res,next)=>{if(req.method!=='GET'&&req.headers.origin&&!require('../utils/webSession').safeOrigin(req))return res.status(403).json({message:'Yêu cầu không hợp lệ.'});next();});
router.use(rateLimit({limit:15,windowMs:15*60*1000,standardHeaders:'draft-8',legacyHeaders:false,message:{message:'Quá nhiều yêu cầu. Vui lòng thử lại sau.'}}));
router.post('/forgot-password',require('../middleware/captcha').requireCaptcha('recovery'),account.requestCode('reset'));
router.post('/reset-password',account.resetPassword);
router.post('/email/request',account.requestCode('email'));
router.post('/email/verify',account.verifyEmail);
router.get('/',protect,account.profile);
router.post('/change-password',protect,async(req,res,next)=>{
 try {
  const bcrypt=require('bcrypt'),db=require('../config/db');
  if(typeof req.body.currentPassword!=='string'||!require('../utils/validation').isPassword(req.body.newPassword))return res.status(400).json({message:'Nhập mật khẩu hiện tại và mật khẩu mới hợp lệ (ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt).'});
  const changed=await db.transaction(async c=>{
   const user=(await c.query('SELECT password_hash FROM users WHERE id=$1 FOR UPDATE',[req.user.userId])).rows[0];
   if(!user||!await bcrypt.compare(req.body.currentPassword,user.password_hash))return false;
   await c.query('UPDATE users SET password_hash=$1,must_change_password=false,session_version=session_version+1 WHERE id=$2',[await bcrypt.hash(req.body.newPassword,10),req.user.userId]);
   return true;
  });
  if(!changed)return res.status(400).json({message:'Mật khẩu hiện tại không đúng.'});
  require('../utils/webSession').clearSession(res);
  res.json({message:'Đã đổi mật khẩu. Vui lòng đăng nhập lại.'});
 }catch(e){next(e);}
});
router.put('/phone',protect,account.updatePhone);
router.post('/phone/request',protect,account.requestCode('phone'));
router.post('/phone/verify',protect,account.verifyPhone);
module.exports=router;
