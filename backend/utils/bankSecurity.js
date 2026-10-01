const { randomBytes,createCipheriv,createDecipheriv,createHmac,timingSafeEqual } = require('crypto');
function encryptionKey() {
  if (!/^[0-9a-f]{64}$/i.test(process.env.PAYMENT_SECRET_KEY || '')) throw Object.assign(new Error('Payment encryption unavailable'),{ status:503 });
  return Buffer.from(process.env.PAYMENT_SECRET_KEY,'hex');
}
function encryptSecret(value) {
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv);
  const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64');
}
function decryptSecret(value) {
  const encoded=Buffer.from(value,'base64'),cipher=createDecipheriv('aes-256-gcm',encryptionKey(),encoded.subarray(0,12));
  cipher.setAuthTag(encoded.subarray(12,28));
  return Buffer.concat([cipher.update(encoded.subarray(28)),cipher.final()]).toString('utf8');
}
function validSignature(raw,signature,timestamp,secret) {
  if (!Buffer.isBuffer(raw) || !/^sha256=[0-9a-f]{64}$/i.test(signature || '') || !/^\d{10}$/.test(timestamp || '') || Math.abs(Date.now()/1000-Number(timestamp))>300) return false;
  const expected=createHmac('sha256',secret).update(`${timestamp}.`).update(raw).digest();
  return timingSafeEqual(expected,Buffer.from(signature.slice(7),'hex'));
}
function paymentOrigin() {
  try {
    const url=new URL(process.env.PAYMENT_PUBLIC_URL);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    encryptionKey(); return url.origin;
  } catch { return null; }
}
module.exports = { encryptSecret,decryptSecret,validSignature,paymentOrigin };
