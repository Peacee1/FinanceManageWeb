import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseFocusMessage, parseTaskItemsMessage, parseThemeMessage, viewportScript} from './webview.ts';
import vm from 'node:vm';

test('rotation is requested only by valid focus-state messages', () => {
  assert.equal(parseFocusMessage('{"type":"task-focus","active":true}'), true);
  assert.equal(parseFocusMessage('{"type":"task-focus","active":false}'), false);
  for (const raw of ['{}', 'null', '{"type":"task-focus","active":"yes"}']) assert.equal(parseFocusMessage(raw), null);
});

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

test('widget accepts task snapshots including empty and group lists, but rejects malformed data', () => {
  assert.deepEqual(parseTaskItemsMessage(JSON.stringify({type:'task-note-items',items:[{title:'Group task',status:'TODO'}]})), [{title:'Group task',status:'TODO'}]);
  assert.deepEqual(parseTaskItemsMessage('{"type":"task-note-items","items":[]}'), []);
  for (const data of [null, {}, {type:'task-note-items',items:{}}, {type:'task-note-items',items:[null]}, {type:'task-note-items',items:Array(501).fill({title:'Task'})}]) assert.equal(parseTaskItemsMessage(JSON.stringify(data)), null);
});

