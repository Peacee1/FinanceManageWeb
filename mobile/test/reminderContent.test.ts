import test from 'node:test';
import assert from 'node:assert/strict';
import {reminderContent} from '../src/reminderContent.ts';
test('phone reminders use 07:00 and 21:00 with distinct localized messages',()=>{
 const morning=new Set(),evening=new Set();
 for(const language of ['vi','en','zh','ja','ko'] as const){
  const rows=reminderContent(language);
  assert.deepEqual(rows.map(row=>row.hour),[7,21]);
  assert.deepEqual(rows.map(row=>row.target),['checkin','expense']);
  assert.notEqual(rows[0].id,rows[1].id);
  morning.add(rows[0].body);evening.add(rows[1].body);
 }
 assert.equal(morning.size,5);assert.equal(evening.size,5);
});
