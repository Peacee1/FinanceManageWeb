const { createHash } = require('crypto');
const db = require('../config/db');
const { parseChatTransaction } = require('../utils/chatTransaction');
const { suggestChatTransaction,readChatDraft } = require('../utils/chatAI');
async function chatTransaction(req,res,next) {
  if (req.user.role === 'employee') return res.status(403).json({ message: 'Chat này ghi thu chi cá nhân. Nhân viên dùng mục thu chi của doanh nghiệp.' });
  const { message,requestId,paymentMethod,draftToken,useAI } = req.body || {};
  if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) return res.status(400).json({message:'Mã tin nhắn không hợp lệ.'});
  if (paymentMethod !== undefined && !['CASH','TRANSFER'].includes(paymentMethod)) return res.status(400).json({message:'Nguồn tiền không hợp lệ.'});
  if (typeof message !== 'string' || !message.trim() || message.length > 500) return res.status(400).json({message:'Tin nhắn cần từ 1 đến 500 ký tự.'});
  const hash = createHash('sha256').update(JSON.stringify({message,paymentMethod:paymentMethod || null})).digest('hex');
  try {
    let parsed = parseChatTransaction(message);
    if (draftToken !== undefined) {
      if (typeof draftToken !== 'string' || draftToken.length > 5000) return res.status(400).json({message:'Bản nháp không hợp lệ.'});
      try { parsed={transaction:readChatDraft(draftToken,req.user.userId,requestId,message)}; }
      catch { return res.status(400).json({message:'Bản nháp không hợp lệ hoặc đã hết hạn. Gửi lại tin nhắn để nhận diện.'}); }
    } else if (useAI === true && !parsed.transaction) {
      try { return res.json(await suggestChatTransaction(message,req.user.userId,requestId)); }
      catch { return res.status(503).json({message:'AI đang bận. Thử lại hoặc dùng câu đơn giản kèm số tiền.'}); }
    }
    const result = await db.transaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`chat:${req.user.userId}:${requestId}`]);
      const previous = (await client.query('SELECT id,type,amount,category,date,description,payment_method,submission_request_hash FROM transactions WHERE user_id=$1 AND business_id IS NULL AND submission_request_id=$2',[req.user.userId,requestId])).rows[0];
      if (previous) return previous.submission_request_hash === hash ? {transaction:previous,replayed:true} : {conflict:true};
      if (!parsed.transaction) return parsed;
      const tx = parsed.transaction;
      if (paymentMethod && tx.paymentMethod && paymentMethod !== tx.paymentMethod) return {message:'Nguồn tiền bạn chọn khác với tin nhắn. Hãy sửa tin nhắn hoặc chọn lại.'};
      tx.paymentMethod ||= paymentMethod || null;
      const settings = (await client.query('SELECT separate_personal_wallets FROM users WHERE id=$1',[req.user.userId])).rows[0];
      if (settings?.separate_personal_wallets && !tx.paymentMethod) return {needsPayment:true,message:'Khoản đã được nhận diện. Chọn tiền mặt hoặc tài khoản để ghi.',draft:tx};
      const row = (await client.query(`INSERT INTO transactions(user_id,business_id,type,amount,category,date,description,payment_method,submission_request_id,submission_request_hash)
        VALUES($1,NULL,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,type,amount,category,date,description,payment_method`,[req.user.userId,tx.type,tx.amount,tx.category,tx.date,tx.description,tx.paymentMethod,requestId,hash])).rows[0];
      return {transaction:row,replayed:false};
    });
    if (result.conflict) return res.status(409).json({message:'Mã tin nhắn đã được dùng cho nội dung khác.'});
    if (result.transaction) delete result.transaction.submission_request_hash;
    return res.status(result.transaction && !result.replayed ? 201 : 200).json(result);
  } catch(error) { next(error); }
}
module.exports={chatTransaction};
