const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { validateUpload } = require('../middleware/validateUpload');
const { getProfile, verifyEmail, updatePhone, verifyPhone, upgradePlan, checkIn, updateAvatar, initGoal, updateCategories, updateSettings } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, req.user.userId + '-' + Date.now() + path.extname(file.originalname));
  }
});
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Chỉ cho phép tải lên hình ảnh!'));
  }
};
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/me', protect, getProfile);
const savedLocations = require('../controllers/savedLocationController');
router.get('/saved-locations', protect, savedLocations.list);
router.post('/saved-locations', protect, savedLocations.save);
router.delete('/saved-locations/:id', protect, savedLocations.remove);
const notifications = require('../controllers/notificationController');
router.get('/notifications', protect, notifications.listNotifications);
router.post('/notifications/read', protect, notifications.markRead);
const family = require('../controllers/familyController');
router.get('/family', protect, family.getFamily);
router.post('/family/create', protect, family.createFamily);
router.post('/family/join', protect, family.joinFamily);
router.post('/family/dissolve', protect, family.dissolveFamily);
router.post('/family/resolve-dissolution', protect, family.resolveDissolution);
router.post('/family/buy-slot', protect, family.buySlot);
router.post('/family/leave', protect, family.leaveFamily);
router.post('/verify-email', protect, verifyEmail);
router.post('/update-phone', protect, updatePhone);
router.post('/verify-phone', protect, verifyPhone);
router.post('/upgrade-plan', protect, upgradePlan);
router.post('/checkin', protect, checkIn);
router.post('/update-avatar', protect, upload.single('avatar'), validateUpload, updateAvatar);
router.post('/init-goal', protect, initGoal);
router.post('/update-categories', protect, updateCategories);
router.post('/settings', protect, updateSettings);

module.exports = router;
