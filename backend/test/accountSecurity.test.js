const test=require('node:test'),assert=require('node:assert/strict');
process.env.AUTH_OTP_SECRET='test-only-key-at-least-thirty-two-characters';
const {phone,email,digest,matches}=require('../controllers/accountController');
const db=require('../config/db');
test.after(()=>db.close());
test('phone normalization accepts Vietnam national and international E.164, rejects arbitrary input',()=>{
 assert.equal(phone('0901 234 567'),'+84901234567');assert.equal(phone('+1 (202) 555-0123'),'+12025550123');
 for(const p of ['123','abc','+0123456789','0901234567890',null])assert.equal(phone(p),null);
});
test('email validation and OTP are bound to unique challenge, comparison requires exactly six digits',()=>{
 assert.equal(email('Person@Example.com'),'person@example.com');assert.throws(()=>email('invalid'));
 const row={id:'one',code_hash:digest('one','012345')};assert.equal(matches(row,'012345'),true);
 assert.equal(matches(row,'12345'),false);assert.equal(matches(row,'999999'),false);
 assert.equal(matches({...row,id:'two'},'012345'),false);
});
