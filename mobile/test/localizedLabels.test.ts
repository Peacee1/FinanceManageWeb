import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryLabel,monthLabel} from '../src/localizedLabels.ts';
test('month and default categories display in each supported language',()=>{
  for(const language of ['en','zh','ja','ko'] as const){
    assert.ok(!monthLabel(10,2026,language).includes('Tháng'));
    assert.notEqual(categoryLabel('Ăn uống',language),'Ăn uống');
    assert.notEqual(categoryLabel('Đầu tư',language),'Đầu tư');
    assert.equal(categoryLabel('Quán quen của tôi',language),'Quán quen của tôi');
  }
  assert.equal(monthLabel(10,2026,'en'),'October 2026');
  assert.equal(monthLabel(10,2026,'vi'),'Tháng 10, 2026');
  assert.equal(categoryLabel('Ăn uống','vi'),'Ăn uống');
});
