import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc16, parseVietQr, paymentLink } from '../src/payments/vietQr.ts';

const field = (id:string, value:string) => `${id}${String(value.length).padStart(2, '0')}${value}`;
function fixture({ amount = '40000', currency = '704', service = 'QRIBFTTA' } = {}) {
  const account = field('00', '970422') + field('01', '00123456789');
  const merchant = field('00', 'A000000727') + field('01', account) + field('02', service);
  const payload = field('00', '01') + field('38', merchant) + field('53', currency) + (amount ? field('54', amount) : '') + field('58', 'VN') + field('62', field('08', 'Bun bo')) + '6304';
  return payload + crc16(payload);
}

test('decodes recipient, amount and memo without losing account leading zeros', () => {
  assert.deepEqual(parseVietQr(fixture()), { bankBin: '970422', account: '00123456789', amount: '40000', memo: 'Bun bo', name: '' });
});
test('allows QR without a fixed amount', () => assert.equal(parseVietQr(fixture({ amount: '' })).amount, ''));
test('rejects tampered QR, non-VND, card transfer and malformed payload', () => {
  assert.throws(() => parseVietQr(fixture().replace('40000', '90000')));
  assert.throws(() => parseVietQr(fixture({ currency: '840' })));
  assert.throws(() => parseVietQr(fixture({ service: 'QRIBFTTC' })));
  assert.throws(() => parseVietQr('https://example.com'));
  assert.throws(() => parseVietQr('009901'));
});
test('rejects invalid or unsafe money values', () => {
  for (const amount of ['0', '-1', '1.5', '9007199254740992']) {
    assert.throws(() => parseVietQr(fixture({ amount })));
    assert.throws(() => paymentLink('mb', parseVietQr(fixture()), amount, ''));
  }
});
test('creates only the trusted bank link and encodes transfer memo', () => {
  const recipient = { ...parseVietQr(fixture()), bankCode: 'mb' };
  const link = new URL(paymentLink('vcb', recipient, '40000', 'Lunch & tea'));
  assert.equal(link.origin, 'https://dl.vietqr.io');
  assert.equal(link.searchParams.get('ba'), '00123456789@mb');
  assert.equal(link.searchParams.get('tn'), 'Lunch & tea');
  assert.throws(() => paymentLink('javascript:alert(1)', recipient, '40000', ''));
});
