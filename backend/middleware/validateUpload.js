const fs = require('fs/promises');
function imageType(bytes) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii'))) return 'image/gif';
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}
async function validateUpload(req, res, next) {
  if (!req.file) return next();
  try {
    const handle = await fs.open(req.file.path, 'r');
    const bytes = Buffer.alloc(12);
    let bytesRead;
    try { ({ bytesRead } = await handle.read(bytes, 0, 12, 0)); }
    finally { await handle.close(); }
    if (imageType(bytes.subarray(0, bytesRead)) !== req.file.mimetype) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ message: 'Nội dung file ảnh không hợp lệ.' });
    }
    return next();
  } catch (error) { return next(error); }
}
module.exports = { validateUpload, imageType };
