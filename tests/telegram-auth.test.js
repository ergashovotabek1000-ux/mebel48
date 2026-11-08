import test from 'node:test';import assert from 'node:assert/strict';import {createHmac} from 'node:crypto';import {verifyTelegram} from '../apps/api/src/telegramAuth.js';
process.env.TELEGRAM_BOT_TOKEN='123456:example_token';
function signed(stamp=Math.floor(Date.now()/1000)){
 const p=new URLSearchParams({auth_date:String(stamp),query_id:'AA-test',user:JSON.stringify({id:123456,first_name:'Otabek'})});
 const data=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
 const secret=createHmac('sha256','WebAppData').update(process.env.TELEGRAM_BOT_TOKEN).digest();p.set('hash',createHmac('sha256',secret).update(data).digest('hex'));return p;
}
test('valid signed Telegram initData identifies the user',()=>assert.equal(verifyTelegram(signed().toString()).id,123456));
test('tampered Telegram user is rejected',()=>{const p=signed();p.set('user',JSON.stringify({id:999999}));assert.throws(()=>verifyTelegram(p.toString()),/signature/);});
test('expired Telegram initData is rejected',()=>assert.throws(()=>verifyTelegram(signed(Math.floor(Date.now()/1000)-301).toString()),/session/));
