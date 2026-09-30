const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
process.env.MAX_IN_FLIGHT = '1';
process.env.INTERNAL_METRICS_TOKEN = 'test-metrics-token';
const { operations, metrics, stop } = require('../middleware/operations');
const db = require('../config/db');
after(async () => { stop(); await db.close(); });
test('load shedding protects capacity while health remains available and metrics stay private', async () => {
  let release;
  const app = express(); app.use('/internal/metrics', metrics); app.use('/api', operations);
  app.get('/api/business/hold', async (req, res) => { await new Promise(resolve => { release = resolve; }); res.json({ ok: true }); });
  app.get('/api/health', (req, res) => res.json({ ok: true }));
  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const pending = fetch(base + '/api/business/hold');
  try {
    for (let i = 0; !release && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.ok(release);
    assert.equal((await fetch(base + '/api/business/hold')).status, 503);
    assert.equal((await fetch(base + '/api/health')).status, 200);
    assert.equal((await fetch(base + '/internal/metrics')).status, 404);
    const metric = await fetch(base + '/internal/metrics', { headers: { Authorization: 'Bearer test-metrics-token' } });
    assert.equal(metric.status, 200); assert.equal((await metric.json()).activeRequests, 1);
    release(); assert.equal((await pending).status, 200);
  } finally { release?.(); await new Promise(resolve => server.close(resolve)); }
});
