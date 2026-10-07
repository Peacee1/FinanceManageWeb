import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApi,ApiError} from '../src/api.ts';
import {amountError,validDate} from '../src/format.ts';
test('API authenticates requests, serializes body and preserves pagination',async()=>{
 let url='',options:RequestInit|undefined;
 const fetcher=(async(input:RequestInfo|URL,init?:RequestInit)=>{url=String(input);options=init;return new Response(JSON.stringify([{id:1}]),{headers:{'X-Next-Cursor':'2026-10-02:1'}});}) as typeof fetch;
 const api=createApi('https://example.invalid/api/','token',()=>{},fetcher);
 const result=await api('/transactions','POST',{amount:100});
 assert.equal(url,'https://example.invalid/api/transactions');assert.equal((options?.headers as Record<string,string>).Authorization,'Bearer token');assert.equal(options?.body,'{"amount":100}');assert.equal(result.nextCursor,'2026-10-02:1');
});
test('expired protected sessions clear authentication while login errors do not',async()=>{
 let expired=0;const fetcher=(async()=>new Response('{"message":"Phiên hết hạn"}',{status:401})) as typeof fetch;
 await assert.rejects(createApi('https://example.invalid','token',()=>{expired++;},fetcher)('/users/me'),error=>error instanceof ApiError&&error.status===401);assert.equal(expired,1);
 await assert.rejects(createApi('https://example.invalid',null,()=>{expired++;},fetcher)('/auth/login','POST',{}));assert.equal(expired,1);
});
test('ambiguous write failures tell users to refresh instead of blindly retrying',async()=>{
 const fetcher=(async()=>{throw new Error('offline');}) as typeof fetch;const api=createApi('https://example.invalid',null,()=>{},fetcher);
 await assert.rejects(api('/transactions','POST',{}),/Tải lại dữ liệu/);await assert.rejects(api('/transactions'),/Kiểm tra mạng/);
});
test('currency and calendar validation reject malformed or impossible inputs',()=>{
 assert.equal(amountError('1000'),null);assert.equal(amountError('0',true),null);for(const value of ['0','-1','1.5','1e3','1000000000001'])assert.ok(amountError(value));assert.equal(validDate('2024-02-29'),true);assert.equal(validDate('2026-02-29'),false);assert.equal(validDate('2026-10-02'),true);
});
test('avatar uploads preserve multipart body and browser boundary',async()=>{
 const form=new FormData();form.append('avatar',new Blob(['test'],{type:'image/png'}),'avatar.png');let options:RequestInit|undefined;
 const api=createApi('https://example.invalid/api','token',()=>{},(async(_input:RequestInfo|URL,init?:RequestInit)=>{options=init;return new Response('{}');}) as typeof fetch);
 await api('/users/update-avatar','POST',form);assert.equal(options?.body,form);assert.equal((options?.headers as Record<string,string>)['Content-Type'],undefined);assert.equal((options?.headers as Record<string,string>).Authorization,'Bearer token');
});
