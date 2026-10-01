const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, createHmac } = require('crypto');
const { encryptSecret, decryptSecret, validSignature, paymentOrigin } = require('../utils/bankSecurity');

test('bank webhook authenticates exact raw bytes, rejects stale signatures and encrypts secrets', () => {
  process.env.PAYMENT_SECRET_KEY = randomBytes(32).toString('hex');
  const secret = randomBytes(32).toString('hex');
  const encrypted = encryptSecret(secret);
  assert.notEqual(encrypted, secret); assert.equal(decryptSecret(encrypted), secret);
  const corrupt = Buffer.from(encrypted, 'base64'); corrupt[30] ^= 1;
  assert.throws(() => decryptSecret(corrupt.toString('base64')));
  const raw = Buffer.from('{"amount":7500}');
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = `sha256=${createHmac('sha256', secret).update(`${timestamp}.`).update(raw).digest('hex')}`;
  assert.equal(validSignature(raw, signature, timestamp, secret), true);
  assert.equal(validSignature(Buffer.from('{"amount":7501}'), signature, timestamp, secret), false);
  assert.equal(validSignature(raw, signature, String(Number(timestamp) - 301), secret), false);
  assert.equal(validSignature(raw, signature, timestamp, 'wrong'), false);
  assert.equal(validSignature({}, signature, timestamp, secret), false);
  process.env.PAYMENT_PUBLIC_URL = 'http://example.invalid'; assert.equal(paymentOrigin(), null);
  process.env.PAYMENT_PUBLIC_URL = 'https://example.invalid'; assert.equal(paymentOrigin(), 'https://example.invalid');
  process.env.PAYMENT_PUBLIC_URL = 'https://example.invalid/path'; assert.equal(paymentOrigin(), null);
});
