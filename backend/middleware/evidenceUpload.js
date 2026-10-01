const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { evidenceDir, removeEvidence } = require('../services/evidenceService');
const { validateUpload } = require('./validateUpload');
const db = require('../config/db');
fs.mkdirSync(evidenceDir, { recursive: true, mode: 0o700 });
const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const upload = multer({ storage: multer.diskStorage({ destination: evidenceDir, filename: (req,file,done) => {
  const filename = randomUUID() + extensions[file.mimetype];
  db.query('INSERT INTO transaction_evidence_files(filename) VALUES ($1)', [filename]).then(() => done(null,filename),done);
} }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 12, fieldSize: 5000 },
  fileFilter(req,file,done) {
    if (req.user.role !== 'employee') return done(Object.assign(new Error('Evidence is employee-only'), { code: 'LIMIT_UNEXPECTED_FILE' }));
    if (!extensions[file.mimetype] || !/^\.(jpe?g|png|webp|gif)$/i.test(path.extname(file.originalname))) return done(Object.assign(new Error('Invalid image'), { code: 'LIMIT_UNEXPECTED_FILE' }));
    done(null,true);
  }
}).single('evidence');
function evidenceUpload(req,res,next) {
  res.on('finish', () => { if (req.file && !req.evidencePersisted) removeEvidence(req.file.filename).catch(error => console.error('Upload cleanup failed', { code: error.code })); });
  upload(req,res,error => error ? next(error) : validateUpload(req,res,next));
}
module.exports = { evidenceUpload };
