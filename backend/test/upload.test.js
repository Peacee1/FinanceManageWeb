const { test } = require('node:test');
const assert = require('node:assert/strict');
const { imageType } = require('../middleware/validateUpload');
test('rejects executable and SVG content disguised as an image', () => {
  for (const content of ['<svg onload="alert(1)">', '<!doctype html>', 'MZexecutable', '']) assert.equal(imageType(Buffer.from(content)), null);
  assert.equal(imageType(Buffer.from([255, 216, 255, 0])), 'image/jpeg');
  assert.equal(imageType(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'image/png');
  assert.equal(imageType(Buffer.from('RIFF0000WEBP')), 'image/webp');
});
