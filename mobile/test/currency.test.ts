import {test} from 'node:test';
import assert from 'node:assert/strict';
import {currencyAmountError,languageCurrency,currencies} from '../src/currency.ts';
import {currencyTotals,money} from '../src/format.ts';
test('currency choice follows language including Russian and decimal validation',()=>{assert.equal(languageCurrency.ru,'RUB');assert.equal(languageCurrency.en,'USD');assert.equal(currencies.length,6);assert.equal(currencyAmountError('1.25','USD'),null);assert.ok(currencyAmountError('1.25','JPY'));assert.ok(currencyAmountError('1.251','USD'));});
test('mixed totals remain separate and never relabel old VND',()=>{const sum={today_income:'0',today_expense:'0',month_income:'100000',month_expense:'0',by_currency:[{currency:'VND',today_income:'0',today_expense:'0',month_income:'100000',month_expense:'0'},{currency:'USD',today_income:'0',today_expense:'0',month_income:'12.50',month_expense:'2.25'}]};assert.equal(currencyTotals(sum,'balance','month','USD'),money(100000,'VND')+'\n'+money(10.25,'USD'));});
