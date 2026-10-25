import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isInternalUrl} from './navigation.ts';

test('keeps Tasks and shared account authentication inside the app', () => {
  for (const url of ['https://tasks.peacee1.io.vn/', 'https://peacee1.io.vn/login?returnTo=https%3A%2F%2Ftasks.peacee1.io.vn', 'https://peacee1.io.vn/account.html']) {
    assert.equal(isInternalUrl(url), true);
  }
});

test('rejects untrusted origins, insecure URLs and embedded credentials', () => {
  for (const url of ['http://tasks.peacee1.io.vn/', 'https://peacee1.io.vn.evil.example/', 'https://evil.example/peacee1.io.vn', 'javascript:alert(1)', 'https://user:pass@peacee1.io.vn/', 'https://peacee1.io.vn:8443/']) {
    assert.equal(isInternalUrl(url), false);
  }
});
