const db = require('../config/db');
const path = require('path');
const { transactionScope } = require('../utils/transactionScope');
const { isPositiveInteger } = require('../utils/validation');
const { publicTransactionColumns, publicTransaction } = require('../utils/transactionProjection');
const { evidenceDir, safeFilename } = require('../services/evidenceService');
async function businessScope(req,res) {
  const scope = await transactionScope({ ...req,query: { ...req.query,scope: 'business' } });
  if (scope.error) { res.status(scope.error).json({ message: scope.message }); return null; }
  return scope;
}
async function getSettings(req,res,next) {
  try {
    const scope = await businessScope(req,res); if (!scope) return;
    const settings = (await db.query('SELECT auto_approve_transactions FROM businesses WHERE id=$1', [scope.businessId])).rows[0];
    res.json(settings);
  } catch (error) { next(error); }
}
async function saveSettings(req,res,next) {
  if (typeof req.body?.autoApprove !== 'boolean') return res.status(400).json({ message: 'Tuỳ chọn tự động duyệt không hợp lệ.' });
  try {
    const scope = await businessScope(req,res); if (!scope) return;
    await db.query('UPDATE businesses SET auto_approve_transactions=$1 WHERE id=$2', [req.body.autoApprove,scope.businessId]);
    res.json({ auto_approve_transactions: req.body.autoApprove });
  } catch (error) { next(error); }
}
async function listApprovals(req,res,next) {
  const status = req.query.status || 'PENDING';
  if (!['PENDING','APPROVED','REJECTED'].includes(status) || (req.query.cursor && !isPositiveInteger(req.query.cursor))) return res.status(400).json({ message: 'Bộ lọc không hợp lệ.' });
  try {
    const scope = await businessScope(req,res); if (!scope) return;
    const rows = (await db.query(`SELECT ${publicTransactionColumns},u.name AS submitter_name FROM transactions t LEFT JOIN users u ON u.id=t.user_id WHERE t.business_id=$1 AND t.approval_status=$2 AND ($3::int IS NULL OR t.id<$3) ORDER BY t.id DESC LIMIT 51`, [scope.businessId,status,req.query.cursor || null])).rows;
    const visible = rows.slice(0,50);
    res.json({ transactions: visible,nextCursor: rows.length>50 ? String(visible.at(-1).id) : null });
  } catch (error) { next(error); }
}
async function reviewTransaction(req,res,next) {
  const decision = req.body?.decision;
  if (!isPositiveInteger(req.params.id) || !['APPROVED','REJECTED'].includes(decision)) return res.status(400).json({ message: 'Quyết định duyệt không hợp lệ.' });
  try {
    const scope = await businessScope(req,res); if (!scope) return;
    const result = await db.transaction(async client => {
      const current = (await client.query('SELECT * FROM transactions WHERE id=$1 AND business_id=$2 FOR UPDATE', [req.params.id,scope.businessId])).rows[0];
      if (!current) return { status: 404,message: 'Không tìm thấy khoản thu chi trong doanh nghiệp.' };
      if (current.approval_status === decision) return { row: current };
      if (current.approval_status !== 'PENDING') return { status: 409,message: 'Khoản thu chi đã được xử lý. Vui lòng tải lại.' };
      const row = (await client.query('UPDATE transactions SET approval_status=$1,reviewed_by=$2,reviewed_at=now() WHERE id=$3 RETURNING *', [decision,req.user.userId,current.id])).rows[0];
      return { row };
    });
    if (result.status) return res.status(result.status).json({ message: result.message });
    res.json(publicTransaction(result.row));
  } catch (error) { next(error); }
}
async function getEvidence(req,res,next) {
  if (!isPositiveInteger(req.params.id)) return res.status(400).json({ message: 'Mã giao dịch không hợp lệ.' });
  try {
    const scope = await businessScope(req,res); if (!scope) return;
    const params = [...scope.params,req.params.id];
    const row = (await db.query(`SELECT evidence_filename,evidence_mime FROM transactions t WHERE ${scope.clause} AND t.id=$${params.length} AND evidence_expires_at>now()`, params)).rows[0];
    if (!row || !safeFilename(row.evidence_filename)) return res.status(404).json({ message: 'Ảnh không tồn tại, đã hết hạn hoặc bạn không có quyền xem.' });
    res.setHeader('Cache-Control','private, no-store');
    res.setHeader('Content-Security-Policy',"default-src 'none'");
    res.setHeader('X-Content-Type-Options','nosniff');
    res.type(row.evidence_mime);
    res.sendFile(path.join(evidenceDir,row.evidence_filename),error => {
      if (!error) return;
      if (error.code === 'ENOENT' && !res.headersSent) return res.status(404).json({ message: 'Ảnh đã được xoá.' });
      next(error);
    });
  } catch (error) { next(error); }
}
async function getCalendar(req,res,next) {
  const { month,year } = req.query;
  if (!isPositiveInteger(month) || Number(month)>12 || !isPositiveInteger(year) || Number(year)<1900 || Number(year)>9998) return res.status(400).json({ message: 'Tháng/năm không hợp lệ.' });
  try {
    const scope = await businessScope(req,res); if (!scope) return;
    const start = `${year}-${String(month).padStart(2,'0')}-01`;
    const days = (await db.query(`SELECT date,SUM(income) AS income,SUM(expense) AS expense FROM business_daily_totals WHERE business_id=$1 AND date>=$2::date AND date<($2::date+interval '1 month') GROUP BY date ORDER BY date`, [scope.businessId,start])).rows;
    res.json({ days });
  } catch (error) { next(error); }
}
module.exports = { getSettings,saveSettings,listApprovals,reviewTransaction,getEvidence,getCalendar };
