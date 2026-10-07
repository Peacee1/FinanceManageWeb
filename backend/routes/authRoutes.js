const express = require('express');
const router = express.Router();
const { register, login, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const web=require('../controllers/webAuthController');
router.get('/session',protect,web.session);
router.post('/web-session',protect,web.upgrade);
router.post('/logout',web.logout);
router.use((req,res,next)=>{if(req.headers.origin&&!require('../utils/webSession').safeOrigin(req)&&!(process.env.CORS_ORIGINS||'').split(',').includes(req.headers.origin))return res.status(403).json({message:'Yêu cầu không hợp lệ.'});next();});
router.get('/captcha-config',require('../middleware/captcha').config);
router.post('/native-refresh',require('../controllers/nativeSessionController').refresh);
router.post('/native-logout',require('../controllers/nativeSessionController').logout);
router.post('/native-session',protect,require('../controllers/nativeSessionController').upgrade);
router.post('/register', require('../middleware/captcha').requireCaptcha('register'),register);
router.post('/login', require('../middleware/captcha').requireCaptcha('login'),login);
router.post('/change-password', protect, changePassword);

module.exports = router;
