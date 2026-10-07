import test from 'node:test';
import assert from 'node:assert/strict';
import {readCaptchaMessage} from '../src/captchaMessage.ts';

test('accepts Android origin-only and iOS full-page CAPTCHA results',()=>{
 for(const source of ['https://peacee1.io.vn','https://peacee1.io.vn/','https://peacee1.io.vn/native-captcha.html?action=login']) {
  assert.deepEqual(readCaptchaMessage(source,JSON.stringify({type:'token',token:'verified-token'})),{type:'token',token:'verified-token'});
 }
});
test('rejects other origins, pages and invalid tokens',()=>{
 for(const source of ['https://peacee1.io.vn.evil.test/native-captcha.html','http://peacee1.io.vn','https://challenges.cloudflare.com','https://peacee1.io.vn/login','invalid'])assert.equal(readCaptchaMessage(source,'{"type":"token","token":"test"}'),null);
 for(const token of ['',123,'a'.repeat(2049)])assert.equal(readCaptchaMessage('https://peacee1.io.vn',JSON.stringify({type:'token',token})),null);
 assert.equal(readCaptchaMessage('https://peacee1.io.vn','not json'),null);
 assert.deepEqual(readCaptchaMessage('https://peacee1.io.vn','{"type":"error"}'),{type:'error'});
});
