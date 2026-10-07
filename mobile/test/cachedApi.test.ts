import test from 'node:test';
import assert from 'node:assert/strict';
import {createCachedApi} from '../src/cachedApi.ts';
import type {Api} from '../src/api.ts';
test('preloaded reads are shared across screens and writes invalidate them',async()=>{
 let requests=0;
 const source:Api=async<T>()=>({data:++requests as T,nextCursor:null});
 const cached=createCachedApi(source);
 const first=await Promise.all([cached.api('/users/me'),cached.api('/users/me')]);
 assert.equal(requests,1);assert.deepEqual(first[0],first[1]);
 await cached.api('/users/me');assert.equal(requests,1);
 await cached.api('/transactions','POST',{});
 await cached.api('/users/me');assert.equal(requests,3);
 cached.clear();await cached.api('/users/me');assert.equal(requests,4);
});

test('bootstrap primes tab data without extra requests and cannot repopulate a cleared session',async()=>{
 let requests=0;
 let resolve!:(value:{data:unknown;nextCursor:null})=>void;
 const source:Api=async<T>()=>{requests++;return await new Promise<{data:unknown;nextCursor:null}>(done=>{resolve=done;}) as {data:T;nextCursor:null};};
 const cached=createCachedApi(source);
 const first=cached.api('/users/bootstrap?month=2026-10');
 resolve({data:{entries:[['/users/me',{data:{id:1},nextCursor:null}]]},nextCursor:null});await first;
 assert.deepEqual((await cached.api('/users/me')).data,{id:1});assert.equal(requests,1);
 cached.clear();const stale=cached.api('/users/bootstrap?month=2026-10');cached.clear();
 resolve({data:{entries:[['/users/me',{data:{id:1},nextCursor:null}]]},nextCursor:null});await stale;
 const fresh=cached.api('/users/me');assert.equal(requests,3);
 resolve({data:{id:2},nextCursor:null});assert.deepEqual((await fresh).data,{id:2});
});
