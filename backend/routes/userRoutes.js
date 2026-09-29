const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getProfile, verifyEmail, updatePhone, verifyPhone, upgradePlan, checkIn, updateAvatar } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, req.user.userId + '-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

router.get('/me', protect, getProfile);
router.post('/verify-email', protect, verifyEmail);
router.post('/update-phone', protect, updatePhone);
router.post('/verify-phone', protect, verifyPhone);
router.post('/upgrade-plan', protect, upgradePlan);
router.post('/checkin', protect, checkIn);
router.post('/update-avatar', protect, upload.single('avatar'), updateAvatar);

module.exports = router;
