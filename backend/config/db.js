const { Pool } = require('pg');
require('dotenv').config();

const maxPool = Number(process.env.DB_POOL_MAX || 5);
const maxQueue = Number(process.env.DB_QUEUE_MAX || 50);
if (!Number.isInteger(maxPool) || maxPool < 1 || maxPool > 100 || !Number.isInteger(maxQueue) || maxQueue < 1) throw new Error('Invalid database pool configuration');
const assertCapacity = () => { if (pool.waitingCount >= maxQueue) throw Object.assign(new Error('Database queue full'), { code: 'DB_OVERLOADED', status: 503 }); };
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  max: maxPool,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  statement_timeout: 15000,
  options: '-c timezone=UTC',
});

pool.on('error', error => console.error('Database pool error', { code: error.code }));

module.exports = {
  query: (text, params) => { assertCapacity(); return pool.query(text, params); },
  stats: () => ({ connections: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount, max: maxPool, maxQueue }),
  async transaction(work) {
    assertCapacity();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  },
  close: () => pool.end(),
};
