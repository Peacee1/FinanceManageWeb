// Run with SHARP_MODULE pointing to a local Sharp installation; no runtime app dependency.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require(process.env.SHARP_MODULE || 'sharp');

async function main() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const records = JSON.parse(input);
  const root = path.resolve(__dirname, '../frontend/public/themes');
  let totalBytes = 0;
  let nextRecord = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
  while (nextRecord < records.length) {
    const record = records[nextRecord++];
    if (!['purple','pink','green','blue','yellow'].includes(record.color) || !/^[a-z_]+$/.test(record.asset)) throw Error('Invalid asset target');
    const destination = path.join(root, record.color, `${record.asset}.webp`);
    try {
      const existing = await sharp(destination).metadata();
      const file = await fs.stat(destination);
      if (existing.format === 'webp' && file.mtimeMs >= (await fs.stat(record.source)).mtimeMs && (!record.transparent || existing.hasAlpha)) { totalBytes += file.size; continue; }
    } catch { /* Resume partially prepared artwork; re-encode missing or incomplete files. */ }
    const metadata = await sharp(record.source).metadata();
    if (record.transparent) {
      const stats = await sharp(record.source).stats();
      if (!metadata.hasAlpha || stats.channels.at(-1).min !== 0) throw Error(`Missing transparency: ${record.color}/${record.asset}`);
    }
    const directory = path.join(root, record.color);
    await fs.mkdir(directory, { recursive: true });
    const wide = ['login_bg','checkin_banner'].includes(record.asset);
    const limit = wide ? 1280 : 640;
    await sharp(record.source).resize({ width: limit, height: wide ? undefined : limit, fit: 'inside', withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100, effort: 4 }).toFile(destination);
    totalBytes += (await fs.stat(destination)).size;
  }
  }));
  console.log(JSON.stringify({ prepared: records.length, bytes: totalBytes }));
  const colors = ['purple','pink','green','blue','yellow'];
  const assets = ['cat_mascot','wallet_logo','cat_ai_mascot','biz_cat','cat_budget_mascot','goal_mascot','login_bg','checkin_banner'];
  const complete = colors.every(color => assets.every(asset => records.some(record => record.color === color && record.asset === asset)));
  if (complete) {
    const tile = 200;
    const composites = [];
    for (let row = 0; row < assets.length; row++) for (let column = 0; column < colors.length; column++) {
      const buffer = await sharp(path.join(root, colors[column], `${assets[row]}.webp`)).resize(tile - 16, tile - 16, { fit: 'contain', background: { r: 250, g: 249, b: 255, alpha: 1 } }).png().toBuffer();
      composites.push({ input: buffer, top: row * tile + 8, left: column * tile + 8 });
    }
    await sharp({ create: { width: colors.length * tile, height: assets.length * tile, channels: 4, background: '#FAF9FF' } }).composite(composites).webp({ quality: 90 }).toFile(path.join(root, 'theme-preview.webp'));
    console.log('All 40 theme assets prepared; preview saved.');
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
