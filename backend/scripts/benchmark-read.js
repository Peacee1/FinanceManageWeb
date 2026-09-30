const { performance } = require('perf_hooks');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

async function benchmark() {
  if (process.env.RUN_READ_BENCHMARK !== '1') throw new Error('Set RUN_READ_BENCHMARK=1 to run this read-only benchmark');
  const owner = (await db.query('SELECT b.owner_id, b.id FROM businesses b JOIN users u ON u.id = b.owner_id WHERE u.is_active AND NOT u.must_change_password ORDER BY b.id LIMIT 1')).rows[0];
  if (!owner) throw new Error('An active business is required');
  const count = 100;
  const concurrency = 5;
  const headers = { Authorization: `Bearer ${jwt.sign({ userId: owner.owner_id }, process.env.JWT_SECRET, { expiresIn: '2m' })}` };
  const paths = ['/api/transactions/summary?scope=business', '/api/transactions?scope=business&limit=50', '/api/business/inventory/movements'];
  const latencies = []; let failed = 0; let next = 0;
  const started = performance.now();
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < count) {
      const index = next++; const start = performance.now();
      try {
        const response = await fetch(`http://127.0.0.1:5000${paths[index % paths.length]}`, { headers, signal: AbortSignal.timeout(10000) });
        if (!response.ok) failed++;
        await response.arrayBuffer();
      } catch { failed++; }
      latencies.push(performance.now() - start);
    }
  }));
  const elapsed = performance.now() - started;
  latencies.sort((a, b) => a - b);
  console.log(JSON.stringify({ requests: count, concurrency, failed, elapsedMs: Math.round(elapsed), requestsPerSecond: Math.round(count * 1000 / elapsed), p50Ms: Math.round(latencies[Math.floor(count * .50)]), p95Ms: Math.round(latencies[Math.floor(count * .95)]), maxMs: Math.round(latencies.at(-1)), scope: 'read-only loopback on current small dataset; not a capacity certification' }, null, 2));
}
benchmark().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.close());
