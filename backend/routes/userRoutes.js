const express = require('express');
const router = express.Router();
const { getProfile, verifyEmail, updatePhone, verifyPhone, upgradePlan } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/me', protect, getProfile);
router.post('/verify-email', protect, verifyEmail);
router.post('/update-phone', protect, updatePhone);
router.post('/verify-phone', protect, verifyPhone);
router.post('/upgrade-plan', protect, upgradePlan);

module.exports = router;
