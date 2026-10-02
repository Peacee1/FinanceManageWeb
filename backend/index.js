const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { randomUUID } = require('crypto');
require('dotenv').config();
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');

// Tạo thư mục uploads nếu chưa có (Tránh lỗi multer trên server)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const userRoutes = require('./routes/userRoutes');
const aiRoutes = require('./routes/aiRoutes');
const businessRoutes = require('./routes/businessRoutes');
const { operations, metrics, stop: stopMetrics } = require('./middleware/operations');

const app = express();

// Middleware
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-origin' } }));
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({ exposedHeaders: ['X-Next-Cursor'], origin(origin, callback) { callback(null, !origin || allowedOrigins.includes(origin)); } }));
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});
app.get('/internal/metrics', metrics);
app.use('/api', operations);
app.use('/api', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.post('/api/payments/sepay/:id',express.raw({ type:'application/json',limit:'32kb' }),require('./controllers/bankController').webhook);
app.use(express.json({ limit: '100kb' }));
const limiter = (limit, windowMs) => rateLimit({ limit, windowMs, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' } });
app.use('/api/auth', limiter(30, 15 * 60 * 1000));
app.use('/api/ai', limiter(5, 60 * 1000));
app.use('/api/uploads', (req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/payments', require('./routes/paymentRoutes'));

const db = require('./config/db');
const stopEvidenceCleanup = require('./services/evidenceService').startEvidenceCleanup();
const stopNotifications = require('./services/notificationService').startNotificationScheduler();
app.get('/api/health', async (req, res) => {
  try { await db.query('SELECT 1'); res.json({ status: 'ok' }); }
  catch { res.status(503).json({ status: 'unavailable' }); }
});
app.use((error, req, res, next) => {
  console.error('Request failed', { requestId: req.requestId, code: error.code || error.type || 'INTERNAL' });
  if (res.headersSent) return next(error);
  const status = error.code === 'DB_OVERLOADED' || error.code === '53300' || error.code === '57014' ? 503 : error.type === 'entity.too.large' ? 413 : error instanceof SyntaxError || error.code?.startsWith('LIMIT_') ? 400 : 500;
  res.status(status).json({ message: status === 503 ? 'Server đang bận. Vui lòng thử lại.' : status === 500 ? 'Lỗi server.' : 'Dữ liệu gửi lên không hợp lệ.', requestId: req.requestId });
});

// Khởi chạy server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, process.env.HOST || '127.0.0.1', () => {
  console.log(`🚀 Server Backend đang chạy tại http://localhost:${PORT}`);
});

server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.keepAliveTimeout = 5000;
const shutdown = () => {
  stopMetrics();
  stopEvidenceCleanup();
  stopNotifications();
  const timeout = setTimeout(() => process.exit(1), 10000).unref();
  server.close(async () => { await db.close(); clearTimeout(timeout); process.exit(0); });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
