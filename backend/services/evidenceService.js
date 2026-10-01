const path = require('path');
const fs = require('fs/promises');
const db = require('../config/db');
const evidenceDir = path.join(__dirname, '../private-evidence');
const safeFilename = name => typeof name === 'string' && /^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/.test(name);
async function removeEvidence(filename) {
  if (!safeFilename(filename)) throw new Error('Invalid evidence filename');
  try { await fs.unlink(path.join(evidenceDir, filename)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await db.query('DELETE FROM transaction_evidence_files WHERE filename=$1', [filename]);
}
let running = false;
async function cleanupEvidence() {
  if (running) return;
  running = true;
  try {
    for (let batch = 0; batch < 20; batch++) {
      const rows = (await db.query('SELECT filename FROM transaction_evidence_files WHERE expires_at<=now() ORDER BY expires_at,filename LIMIT 100')).rows;
      for (const row of rows) {
        await removeEvidence(row.filename);
        await db.query('UPDATE transactions SET evidence_filename=NULL,evidence_mime=NULL WHERE evidence_filename=$1', [row.filename]);
      }
      if (rows.length < 100) break;
    }
  } finally { running = false; }
}
function startEvidenceCleanup() {
  const run = () => cleanupEvidence().catch(error => console.error('Evidence cleanup failed', { code: error.code || 'INTERNAL' }));
  run();
  const timer = setInterval(run, 5 * 60 * 1000); timer.unref();
  return () => clearInterval(timer);
}
module.exports = { evidenceDir, safeFilename, removeEvidence, cleanupEvidence, startEvidenceCleanup };
