import test from 'node:test';
import assert from 'node:assert/strict';
import {bankTransferMemo,directBankLink} from '../src/payments/bankLink.ts';
test('MB note preserves sender words while removing rejected punctuation',()=>{
 assert.equal(bankTransferMemo('mb','Peacee1 - Đỗ Văn A chuyen khoan'),'Peacee1 Do Van A chuyen khoan');
 assert.equal(bankTransferMemo('vcb','Peacee1 - Do Van A chuyen khoan'),'Peacee1 - Do Van A chuyen khoan');
 assert.ok(bankTransferMemo('mb','A'.repeat(80)).length<=50);
});
test('signed QRPay links remain intact and vendor rejection is not reported as missing bank support',()=>{
 const link='mbbank://applink?targetPage=QRPay&qrContent=000201&signature=abc%2Bdef%3D';
 assert.equal(directBankLink(`const DEEPLINK = '${link}';`),link);
 assert.equal(directBankLink(`let DEEPLINK="${link}";`),link);
 assert.throws(()=>directBankLink('{"message":"invalid transaction note! mb"}'),/Nội dung chuyển khoản/);
 assert.throws(()=>directBankLink('const DEEPLINK="javascript://bad";'));
});
