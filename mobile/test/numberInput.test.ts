import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatNumberInput,parseNumberInput,groupedNumber} from '../src/numberInput.ts';
test('formats integer inputs without changing API values, including pasted grouped amounts',()=>{
 for(const raw of ['','0','10','1000','1000000','10000000','1000000000000'])assert.equal(parseNumberInput(formatNumberInput(raw)),raw);
 assert.equal(formatNumberInput('1000000'),'1.000.000');assert.equal(parseNumberInput('1.000.000'),'1000000');assert.equal(groupedNumber(10000000),'10.000.000');
});
test('keeps decimal currency precision and trailing decimal input',()=>{
 for(const raw of ['12.','1234.50','0.05','1000000.99'])assert.equal(parseNumberInput(formatNumberInput(raw),true),raw);
 assert.equal(formatNumberInput('1234.50'),'1.234,50');assert.equal(parseNumberInput('1.234,50',true),'1234.50');
});
