import {Bot,InlineKeyboard,webhookCallback} from 'grammy';
import Fastify from 'fastify';
import {db,queue,connection} from '../../api/src/core.js';
if(!process.env.TELEGRAM_BOT_TOKEN)throw Error('TELEGRAM_BOT_TOKEN required');
const bot=new Bot(process.env.TELEGRAM_BOT_TOKEN);
const app=Fastify({logger:true});
const draftKey=id=>`mebel48:draft:${id}`;
const getDraft=async id=>{const value=await connection.get(draftKey(id));return value?JSON.parse(value):null;};
const saveDraft=(id,value)=>connection.set(draftKey(id),JSON.stringify(value),'EX',1800);
const clearDraft=id=>connection.del(draftKey(id));
const menu=()=>new InlineKeyboard().text('🛋 Buyurtma berish','new').row().webApp('Buyurtmalarimni ko‘rish',process.env.MINIAPP_URL);
const choose=(items,prefix)=>{const k=new InlineKeyboard();for(const [i,label] of items.entries())k.text(label,`${prefix}:${i}`).row();return k;};
async function user(ctx){const tg=ctx.from;const {rows}=await db.query("INSERT INTO users(tg_id,name,role,status) VALUES($1,$2,'client','active') ON CONFLICT(tg_id) DO UPDATE SET name=EXCLUDED.name RETURNING id,status",[tg.id,[tg.first_name,tg.last_name].filter(Boolean).join(' ')]);return rows[0];}
bot.command('start',async ctx=>{const u=await user(ctx);if(u.status!=='active')return ctx.reply('Profil faol emas. Operator bilan bog‘laning.');await ctx.reply('Mebel48 — buyurtma berish va jarayonni kuzatish.',{reply_markup:menu()});});
bot.callbackQuery('new',async ctx=>{await ctx.answerCallbackQuery();await saveDraft(ctx.from.id,{step:'room'});await ctx.reply('Qaysi xona uchun mebel?',{reply_markup:choose(['Oshxona','Yotoqxona','Mehmonxona','Boshqa'],'room')});});
bot.callbackQuery(/^room:(\d)$/,async ctx=>{await ctx.answerCallbackQuery();const d=await getDraft(ctx.from.id);if(!d||d.step!=='room')return ctx.reply('Sessiya muddati o‘tdi. /start bosib qayta boshlang.');d.room_type=['Oshxona','Yotoqxona','Mehmonxona','Boshqa'][Number(ctx.match[1])];if(!d.room_type)return;d.step='style';await saveDraft(ctx.from.id,d);await ctx.reply('Uslubni tanlang:',{reply_markup:choose(['Modern','Klassik','Minimal','Boshqa'],'style')});});
bot.callbackQuery(/^style:(\d)$/,async ctx=>{await ctx.answerCallbackQuery();const d=await getDraft(ctx.from.id);if(!d||d.step!=='style')return ctx.reply('Sessiya muddati o‘tdi. /start bosib qayta boshlang.');d.style=['Modern','Klassik','Minimal','Boshqa'][Number(ctx.match[1])];if(!d.style)return;d.step='budget';await saveDraft(ctx.from.id,d);await ctx.reply('Taxminiy byudjetni so‘mda yozing. Masalan: 15000000');});
bot.on('message:text',async ctx=>{
 const d=await getDraft(ctx.from.id);
 if(!d)return ctx.reply('Sessiya muddati o‘tdi yoki boshlanmagan. /start bosib qayta boshlang.');
 if(d.step==='budget'){
  const n=Number(ctx.message.text.replaceAll(' ',''));if(!Number.isSafeInteger(n)||n<0)return ctx.reply('Byudjetni raqam bilan yozing.');
  d.budget=n;d.step='contact';await saveDraft(ctx.from.id,d);return ctx.reply('Telefon raqamingiz va viloyatingizni yozing: +998901234567, Navoiy');
 }
 if(d.step==='contact'){
  const parts=ctx.message.text.split(',').map(x=>x.trim());if(parts.length!==2||!/^\+?[0-9 ()-]{7,25}$/.test(parts[0])||!parts[1]||parts[1].length>80)return ctx.reply('Shunday yozing: +998901234567, Navoiy');
  const u=await user(ctx);if(u.status!=='active')return ctx.reply('Profil faol emas');
  const key=`${u.id}:tg-${ctx.update.update_id}`;
  try{await queue.add('create-order',{key,clientId:u.id,room_type:d.room_type,style:d.style,budget:d.budget,contact:parts[0],region:parts[1],notes:''},{jobId:key.replace(/[^a-zA-Z0-9_-]/g,'_'),attempts:5,backoff:{type:'exponential',delay:1000}});await clearDraft(ctx.from.id);return ctx.reply('✅ Qabul qilindi. Dizayner tez orada buyurtmani ko‘rib chiqadi.',{reply_markup:menu()});}
  catch(e){console.error(e);return ctx.reply('Server bilan aloqa uzildi. Iltimos, qayta yuboring.');}
 }
});
bot.catch(e=>console.error('Bot error',e));
app.post('/telegram/webhook',async(req,reply)=>{if(req.headers['x-telegram-bot-api-secret-token']!==process.env.TELEGRAM_WEBHOOK_SECRET)return reply.code(403).send();await webhookCallback(bot,'fastify')(req,reply);});
await app.listen({port:Number(process.env.BOT_PORT||3001),host:'0.0.0.0'});
