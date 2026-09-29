const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// Route Đăng ký (POST /api/auth/register)
router.post('/register', register);

// Route Đăng nhập (POST /api/auth/login)
router.post('/login', login);

module.exports = router;
