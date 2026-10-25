import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseThemeMessage, viewportScript} from './webview.ts';
import vm from 'node:vm';

test('accepts validated theme colors and rejects malformed bridge messages', () => {
  assert.deepEqual(parseThemeMessage('{"type":"task-theme","background":"#171716","dark":true}'), {background:'#171716',dark:true});
  for (const raw of ['{}', 'null', 'not json', '{"type":"task-theme","background":"red","dark":true}']) assert.equal(parseThemeMessage(raw), null);
});
test('locks viewport scale and suppresses pinch gestures without blocking scrolling', () => {
  const meta = {content:''};
  const listeners = new Map<string, (event: {preventDefault: () => void}) => void>();
  vm.runInNewContext(viewportScript, {document: {head:{}, querySelector:()=>meta, addEventListener:(name:string, callback: (event: {preventDefault: () => void}) => void)=>listeners.set(name,callback)}});
  assert.match(meta.content, /maximum-scale=1,user-scalable=no,viewport-fit=cover/);
  let prevented = 0;
  for (const name of ['gesturestart','gesturechange','gestureend']) listeners.get(name)!({preventDefault:()=>prevented++});
  assert.equal(prevented, 3);
  assert.equal(listeners.has('touchmove'), false);
});
