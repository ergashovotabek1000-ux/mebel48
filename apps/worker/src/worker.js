import {Worker} from 'bullmq'; import {Bot} from 'grammy';
import {db,connection,notify} from '../../api/src/core.js';
const bot=process.env.TELEGRAM_BOT_TOKEN?new Bot(process.env.TELEGRAM_BOT_TOKEN):null;
const worker=new Worker('mebel48',async job=>{
 if(job.name==='create-order'){
  const d=job.data;const c=await db.connect();let id;try{await c.query('BEGIN');const hours=Number((await c.query("SELECT value FROM settings WHERE key='deadline_hours'")).rows[0].value);
   const {rows}=await c.query('INSERT INTO orders(request_key,client_id,room_type,style,budget,contact,region,notes,due_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now()+make_interval(hours => $9::int)) ON CONFLICT(request_key) DO UPDATE SET request_key=EXCLUDED.request_key RETURNING id',[d.key,d.clientId,d.room_type,d.style,d.budget,d.contact,d.region,d.notes,hours]);id=rows[0].id;
   await c.query("INSERT INTO order_steps(order_id,step_name,actor_id,step_due_at) SELECT $1,'new',$2,due_at FROM orders WHERE id=$1 AND NOT EXISTS (SELECT 1 FROM order_steps WHERE order_id=$1 AND step_name='new')",[id,d.clientId]);await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  const {rows:admins}=await db.query("SELECT id FROM users WHERE status='active' AND (role='admin' OR role='operator' AND region=$1)",[d.region]);for(const u of admins)await notify(u.id,'new_order',{orderId:id,text:'Yangi buyurtma'});return {orderId:id};
 }
 if(job.name==='notify'){
  const {rows}=await db.query('SELECT n.*,u.tg_id FROM notifications n JOIN users u ON u.id=n.user_id WHERE n.id=$1',[job.data.notificationId]);const n=rows[0];if(!n||n.status==='sent')return;
  if(!n.tg_id||!bot){await db.query("UPDATE notifications SET status='pending' WHERE id=$1",[n.id]);return;}
  await bot.api.sendMessage(n.tg_id,n.payload.text||'Mebel48 yangilanishi');await db.query("UPDATE notifications SET status='sent',sent_at=now() WHERE id=$1",[n.id]);
 }
},{connection,concurrency:8});worker.on('failed',(job,error)=>console.error('Job failed',job?.id,error));
console.log('Worker running');
