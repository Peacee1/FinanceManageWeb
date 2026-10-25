import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRotationController} from './rotationController.ts';

test('unlocks for Focus and restores portrait on exit', async () => {
  const calls: boolean[] = [];
  const controller = createRotationController(async value => {calls.push(value);});
  await controller.setFocus(false); await controller.setFocus(true); await controller.setFocus(false);
  assert.deepEqual(calls, [false, true, false]);
});
test('serializes native updates so a late unlock cannot override exiting Focus', async () => {
  const calls: boolean[] = [];
  let release!: () => void;
  const controller = createRotationController(async value => {calls.push(value); if (value) await new Promise<void>(resolve => {release = resolve;});});
  const open = controller.setFocus(true);
  await new Promise(resolve => setImmediate(resolve));
  const close = controller.setFocus(false); release();
  await Promise.all([open, close]); assert.deepEqual(calls, [true, false]);
});
test('failed native updates can be retried', async () => {
  let attempts = 0;
  const controller = createRotationController(async () => {if (++attempts === 1) throw Error('native failure');});
  await assert.rejects(controller.setFocus(true)); await controller.setFocus(true); assert.equal(attempts, 2);
});
