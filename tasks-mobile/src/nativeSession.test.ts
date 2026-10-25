import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createNativeSessionClient, NATIVE_SESSION_KEY} from './nativeSession.ts';
import type {Session} from './types.ts';

const original: Session = {token: 'expired', refreshToken: 'old-refresh', user: {id: 7, name: 'Test', email: 'test@example.invalid', role: 'owner'}};
const renewed: Session = {...original, token: 'new-access', refreshToken: 'new-refresh'};
function store() {
  let raw: string | null = JSON.stringify(original);
  return {getItemAsync: async () => raw, setItemAsync: async (_key: string, value: string) => {raw = value;}, deleteItemAsync: async () => {raw = null;}};
}
test('Task credentials use an isolated key and persist refresh rotation', async () => {
  assert.equal(NATIVE_SESSION_KEY, 'peacee1.task.session.v1');
  const storage = store();
  const client = createNativeSessionClient('https://example.invalid/api', storage, (async () => Response.json(renewed)) as typeof fetch);
  await client.refresh();
  assert.deepEqual(await createNativeSessionClient('https://example.invalid/api', storage).load(), renewed);
});
test('a failed network refresh preserves the saved session for retry', async () => {
  const client = createNativeSessionClient('https://example.invalid/api', store(), (async () => {throw Error('offline');}) as typeof fetch);
  await assert.rejects(client.refresh());
  assert.deepEqual(await client.load(), original);
});
test('logout during refresh cannot restore the old account', async () => {
  let complete!: (response: Response) => void;
  const client = createNativeSessionClient('https://example.invalid/api', store(), (async () => new Promise<Response>(resolve => {complete = resolve;})) as typeof fetch);
  const pending = client.refresh();
  await new Promise(resolve => setImmediate(resolve));
  await client.clear(); complete(Response.json(renewed));
  assert.equal(await pending, null);
  assert.equal(await client.load(), null);
});
