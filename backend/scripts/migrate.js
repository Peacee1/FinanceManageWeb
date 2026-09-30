const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function migrate() {
  await db.transaction(async client => {
    await client.query("SELECT pg_advisory_xact_lock(732619)");
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
    const directory = path.join(__dirname, '../migrations');
    for (const name of fs.readdirSync(directory).filter(name => name.endsWith('.sql')).sort()) {
      const applied = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
      if (applied.rows.length) continue;
      await client.query(fs.readFileSync(path.join(directory, name), 'utf8'));
      await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [name]);
      console.log(`Applied ${name}`);
    }
  });
}
migrate().catch(error => { console.error('Migration failed', { code: error.code }); process.exitCode = 1; }).finally(() => db.close());
