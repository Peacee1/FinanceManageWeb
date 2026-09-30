const { performance, monitorEventLoopDelay } = require('perf_hooks');
const { timingSafeEqual } = require('crypto');
const db = require('../config/db');
const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();
const groups = new Set(['auth', 'business', 'transactions', 'users', 'ai', 'uploads', 'health']);
const totals = new Map();
let active = 0;
const maxActive = Number(process.env.MAX_IN_FLIGHT || 100);
if (!Number.isInteger(maxActive) || maxActive < 1 || maxActive > 10000) throw new Error('Invalid MAX_IN_FLIGHT');

function operations(req, res, next) {
  const started = performance.now();
  const group = req.originalUrl.split('?')[0].split('/')[2];
  const method = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(req.method) ? req.method : 'OTHER';
  const label = groups.has(group) ? group : 'other';
  if (label !== 'health' && active >= maxActive) {
    res.setHeader('Retry-After', '2');
    return res.status(503).json({ message: 'Server đang bận. Vui lòng thử lại sau.', requestId: req.requestId });
  }
  active++;
  let released = false;
  const release = () => {
    if (released) return;
    released = true; active--;
    const duration = performance.now() - started;
    const key = `${label}:${method}:${res.statusCode}`;
    const value = totals.get(key) || { count: 0, durationMs: 0, maxMs: 0 };
    value.count++; value.durationMs += duration; value.maxMs = Math.max(value.maxMs, duration);
    totals.set(key, value);
    if (duration > 1000 || res.statusCode >= 500) console.warn('Request diagnostic', { requestId: req.requestId, group: label, method: req.method, status: res.statusCode, durationMs: Math.round(duration) });
  };
  res.once('finish', release); res.once('close', release);
  next();
}
function metrics(req, res) {
  const expected = process.env.INTERNAL_METRICS_TOKEN;
  const actual = req.headers.authorization?.replace(/^Bearer /, '') || '';
  if (!expected || Buffer.byteLength(expected) !== Buffer.byteLength(actual) || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) return res.sendStatus(404);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ uptimeSeconds: Math.round(process.uptime()), activeRequests: active, maxActiveRequests: maxActive, memory: process.memoryUsage(), database: db.stats(), eventLoop: { p95Ms: histogram.percentile(95) / 1e6, maxMs: histogram.max / 1e6 }, requests: Object.fromEntries(totals) });
}
module.exports = { operations, metrics, stop: () => histogram.disable() };
