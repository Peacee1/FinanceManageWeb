import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createNativeSessionClient} from '../src/nativeSession.ts';
import {createApi,ApiError} from '../src/api.ts';
import type {Session} from '../src/types.ts';

const original:Session={token:'expired',refreshToken:'old-refresh',user:{id:7,name:'Test',email:'test@example.invalid',role:'owner'}};
const renewed:Session={...original,token:'new-access',refreshToken:'new-refresh'};
function store(){let raw:string|null=JSON.stringify(original);return {getItemAsync:async()=>raw,setItemAsync:async(_key:string,value:string)=>{raw=value;},deleteItemAsync:async()=>{raw=null;}};}

test('restores across restarts and saves rotated credentials before returning',async()=>{
 const storage=store();const client=createNativeSessionClient('https://example.invalid/api',storage,(async()=>new Response(JSON.stringify(renewed))) as typeof fetch);
 assert.deepEqual(await client.load(),original);await client.refresh();
 assert.deepEqual(await createNativeSessionClient('https://example.invalid/api',storage).load(),renewed);
});
test('simultaneous requests use one refresh and logout cannot resurrect a session',async()=>{
 let complete!:(response:Response)=>void,calls=0;
 const storage=store();const client=createNativeSessionClient('https://example.invalid',storage,(async()=>{calls++;return new Promise<Response>(resolve=>{complete=resolve;});}) as typeof fetch);
 const first=client.refresh(),second=client.refresh();await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);
 await client.clear();complete(new Response(JSON.stringify(renewed)));
 assert.equal(await first,null);assert.equal(await second,null);assert.equal(await client.load(),null);
});
test('network failure preserves encrypted session for a later retry',async()=>{
 const storage=store();const client=createNativeSessionClient('https://example.invalid',storage,(async()=>{throw Error('offline');}) as typeof fetch);
 await assert.rejects(client.refresh());assert.deepEqual(await client.load(),original);
});
test('401 renews and retries original request without logging out',async()=>{
 let expired=0,calls=0,refreshes=0;
 const fetcher=(async(_input:RequestInfo|URL,options?:RequestInit)=>{calls++;const token=(options?.headers as Record<string,string>).Authorization;return token==='Bearer new-access'?new Response('{"ok":true}'):new Response('{}',{status:401});}) as typeof fetch;
 const api=createApi('https://example.invalid','expired',()=>{expired++;},fetcher,async()=>{refreshes++;return 'new-access';});
 assert.deepEqual((await api('/transactions')).data,{ok:true});assert.equal(calls,2);assert.equal(expired,0);assert.equal(refreshes,1);
 await api('/users/me');assert.equal(refreshes,1);
});
test('revoked session signs out; transient refresh failure does not',async()=>{
 let expired=0;const fetcher=(async()=>new Response('{}',{status:401})) as typeof fetch;
 await assert.rejects(createApi('https://example.invalid','expired',()=>{expired++;},fetcher,async()=>null)('/users/me'));assert.equal(expired,1);
 await assert.rejects(createApi('https://example.invalid','expired',()=>{expired++;},fetcher,async()=>{throw Error('offline');})('/users/me'),error=>error instanceof ApiError&&error.status===0);assert.equal(expired,1);
});
