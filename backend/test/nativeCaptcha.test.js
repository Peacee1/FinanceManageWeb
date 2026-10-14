const test=require('node:test');
const assert=require('node:assert/strict');
const {requireCaptcha}=require('../middleware/captcha');
test('native auth skips CAPTCHA while browser auth and recovery require it',async()=>{
 const previous=process.env.TURNSTILE_ENABLED;process.env.TURNSTILE_ENABLED='true';
 try{
  for(const [action,body,headers,expected] of [
   ['login',{clientType:'native'},{},true],
   ['register',{clientType:'native'},{},true],
   ['login',{clientType:'native'},{origin:'https://peacee1.io.vn'},false],
   ['login',{}, {},false],
   ['recovery',{clientType:'native'},{},false]
  ]){
   let allowed=false;const res={status(){return this;},json(){return this;}};
   await requireCaptcha(action)({body,headers},res,()=>{allowed=true;});
   assert.equal(allowed,expected);
  }
 }finally{if(previous===undefined)delete process.env.TURNSTILE_ENABLED;else process.env.TURNSTILE_ENABLED=previous;}
});
