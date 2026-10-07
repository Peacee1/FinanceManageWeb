import test from 'node:test';
import assert from 'node:assert/strict';
import {transactionSwipeTarget,setExpandedTransaction,beginTransactionInteraction,keepTransactionInteraction,dismissExpandedTransaction,beginTransactionGesture,clearTransactionGesture,isTransactionGesture} from '../src/transactionGesture.ts';
test('short reverse swipes close either side without opening the opposite side',()=>{
 assert.equal(transactionSwipeTarget(-160,30),0);
 assert.equal(transactionSwipeTarget(160,-30),0);
 assert.equal(transactionSwipeTarget(-160,250),0);
 assert.equal(transactionSwipeTarget(0,-60),-160);
 assert.equal(transactionSwipeTarget(0,60),160);
 assert.equal(transactionSwipeTarget(0,20),0);
});
test('outside interaction dismisses; action interaction preserves; opening another closes the previous row',async()=>{
 let closed=0;
 setExpandedTransaction(1,()=>closed++);
 beginTransactionInteraction();keepTransactionInteraction();
 await new Promise(resolve=>setTimeout(resolve,5));assert.equal(closed,0);
 beginTransactionInteraction();
 await new Promise(resolve=>setTimeout(resolve,5));assert.equal(closed,1);
 setExpandedTransaction(1,()=>closed++);setExpandedTransaction(2,()=>closed++);
 assert.equal(closed,2);dismissExpandedTransaction();assert.equal(closed,3);
});
test('row ownership prevents page swipe and another row cleanup cannot clear it',()=>{
 beginTransactionGesture(7);assert.equal(isTransactionGesture(),true);
 clearTransactionGesture(8);assert.equal(isTransactionGesture(),true);
 clearTransactionGesture(7);assert.equal(isTransactionGesture(),false);
});
