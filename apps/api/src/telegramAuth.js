import {createHmac,timingSafeEqual} from 'node:crypto';
export function verifyTelegram(initData){
 if(!process.env.TELEGRAM_BOT_TOKEN) throw Error('Bot token missing');
 const p=new URLSearchParams(initData); const hash=p.get('hash'), stamp=Number(p.get('auth_date'));
 if(!hash||!/^[a-f0-9]{64}$/i.test(hash)||!stamp||Math.abs(Date.now()/1000-stamp)>300) throw Error('Invalid Telegram session');
 p.delete('hash'); const data=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
 const secret=createHmac('sha256','WebAppData').update(process.env.TELEGRAM_BOT_TOKEN).digest();
 const expected=createHmac('sha256',secret).update(data).digest();
 if(!timingSafeEqual(expected,Buffer.from(hash,'hex'))) throw Error('Invalid Telegram signature');
 const user=JSON.parse(p.get('user')||'{}');if(!Number.isSafeInteger(user.id))throw Error('Invalid Telegram user');return user;
}
