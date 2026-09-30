const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { analyzeFinances } = require('../controllers/aiController');

// POST /api/ai/analyze - Phân tích tài chính bằng Gemini AI (yêu cầu đăng nhập)
router.post('/analyze', protect, analyzeFinances);

module.exports = router;
