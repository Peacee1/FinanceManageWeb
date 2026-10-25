import assert from 'node:assert/strict';
import {test} from 'node:test';
import {emptyNote, noteSnapshot} from './noteSnapshot.ts';
test('note prioritizes unfinished tasks and retains completed ones with a strikethrough flag', () => {
  const snapshot = noteSnapshot([{title:'Finished',status:'DONE'},{title:'Later',status:'TODO',due_date:'2026-10-30'},{title:'First',status:'DOING',due_date:'2026-10-25'}]);
  assert.deepEqual(snapshot.items, [{title:'First',done:false},{title:'Later',done:false},{title:'Finished',done:true}]); assert.equal(snapshot.total, 3);
});
test('importance takes precedence over deadline, then earlier deadlines win', () => {
  const snapshot = noteSnapshot([
    {title:'Low overdue',status:'TODO',priority:'LOW',due_date:'2026-10-01'},
    {title:'High later',status:'TODO',priority:'HIGH',due_date:'2026-10-30'},
    {title:'High sooner',status:'TODO',priority:'HIGH',due_date:'2026-10-26'},
    {title:'Normal no deadline',status:'TODO',priority:'NORMAL'},
    {title:'Normal soon',status:'TODO',priority:'NORMAL',due_date:'2026-10-25'},
    {title:'Done important',status:'DONE',priority:'HIGH',due_date:'2026-10-01'},
  ]);
  assert.deepEqual(snapshot.items.map(item => item.title), ['High sooner','High later','Normal soon','Normal no deadline','Low overdue','Done important']);
});
test('limits shared text and never includes account credentials', () => {
  const snapshot = noteSnapshot(Array.from({length:10},()=>({title:'A'.repeat(300),status:'TODO',token:'private'})));
  assert.equal(snapshot.items.length,7); assert.equal(snapshot.items[0].title.length,200); assert.equal(JSON.stringify(snapshot).includes('private'),false);
  assert.deepEqual(emptyNote.items,[]);assert.equal(emptyNote.signedIn,false);
});
