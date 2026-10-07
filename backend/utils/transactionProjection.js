const publicTransactionColumns = `t.id,t.user_id,t.actor_name,t.business_id,t.location,t.type,(t.amount::numeric / CASE WHEN t.currency IN ('USD','CNY','RUB') THEN 100 ELSE 1 END) AS amount,t.currency,t.category,t.date,t.description,t.created_at,t.payment_method,t.bank_payment_status,t.bank_verified_at,NULL::integer AS bank_intent_id,t.approval_status,t.reviewed_at,t.reviewed_by,t.evidence_expires_at,
  (t.evidence_filename IS NOT NULL AND t.evidence_expires_at>now()) AS has_evidence`;
function publicTransaction(row) {
  const { evidence_filename,evidence_mime,submission_request_hash,submission_request_id,sale_request_hash,...visible } = row;
  return { ...visible, amount: Number(row.amount)/require('./currency').scale(row.currency||'VND'), has_evidence: Boolean(evidence_filename && new Date(row.evidence_expires_at)>new Date()) };
}
module.exports = { publicTransactionColumns, publicTransaction };
