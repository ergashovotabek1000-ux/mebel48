import test from 'node:test';import assert from 'node:assert/strict';import {plannedShares} from '../apps/api/src/finance.js';
test('manual accounting shares sum to agreed amount even with rounding',()=>{
 for(const amount of [1,99,101,15000001]){
  const result=plannedShares(amount,{platform:12,designer:8,workshop:80});
  assert.equal(Object.values(result).reduce((a,b)=>a+b,0),amount);
  assert.ok(Object.values(result).every(v=>v>=0));
 }
});
test('invalid commission settings cannot produce a financial record',()=>{
 assert.throws(()=>plannedShares(100,{platform:15,designer:10,workshop:80}));
 assert.throws(()=>plannedShares(-1,{platform:12,designer:8,workshop:80}));
});
