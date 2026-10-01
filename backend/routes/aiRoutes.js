const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { analyzeFinances } = require('../controllers/aiController');
const { chatTransaction } = require('../controllers/chatController');
router.post('/chat-transaction', protect, chatTransaction);

// POST /api/ai/analyze - Phân tích tài chính bằng Gemini AI (yêu cầu đăng nhập)
router.post('/analyze', protect, analyzeFinances);

module.exports = router;
