import assert from 'node:assert/strict';
import {test} from 'node:test';
import {authenticate} from './auth.ts';

test('native login uses the existing mobile policy without a web CAPTCHA', async () => {
  let body: Record<string, unknown> = {};
  const fetcher = (async (_url, init) => {
    body = JSON.parse(init?.body as string);
    assert.equal(new Headers(init?.headers).has('Origin'), false);
    return Response.json({token: 'fixture', user: {id: 1, role: 'owner'}});
  }) as typeof fetch;
  await authenticate(false, {email: ' test@example.invalid ', password: 'test'}, fetcher);
  assert.equal(body.clientType, 'native');
  assert.equal(body.email, 'test@example.invalid');
  assert.equal('captchaToken' in body, false);
});

test('login failures do not establish a session', async () => {
  await assert.rejects(authenticate(false, {email: 'test@example.invalid', password: 'wrong'},
    (async () => Response.json({message: 'Thong tin dang nhap khong dung.'}, {status: 401})) as typeof fetch), /Email hoặc mật khẩu/);
});

test('registration success returns to login instead of creating a fake session', async () => {
  assert.equal(await authenticate(true, {email: 'test@example.invalid', password: 'test', name: 'Test'},
    (async () => Response.json({user: {id: 1}}, {status: 201})) as typeof fetch), null);
});
