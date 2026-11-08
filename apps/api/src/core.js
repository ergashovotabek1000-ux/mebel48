import pg from 'pg'; import IORedis from 'ioredis'; import {Queue} from 'bullmq'; import jwt from 'jsonwebtoken';
import {randomUUID} from 'node:crypto';
export const db=new pg.Pool({connectionString:process.env.DATABASE_URL});
export const connection=new IORedis(process.env.REDIS_URL||'redis://localhost:6379',{maxRetriesPerRequest:null});
export const queue=new Queue('mebel48',{connection});
export const uid=()=>randomUUID();
export function audit(c,actor,action,type,id,oldValue,newValue){return c.query('INSERT INTO audit_log(actor_id,action,entity_type,entity_id,old_value,new_value) VALUES($1,$2,$3,$4,$5,$6)',[actor,action,type,String(id),oldValue??null,newValue??null]);}
export async function setting(key){const {rows}=await db.query('SELECT value FROM settings WHERE key=$1',[key]);return rows[0]?.value;}
export function token(user){if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32) throw Error('JWT_SECRET must be at least 32 characters'); return jwt.sign({sub:user.id,role:user.role},process.env.JWT_SECRET,{expiresIn:'12h',issuer:'mebel48'});}
export {verifyTelegram} from './telegramAuth.js';
export async function requireUser(req,reply,roles){
 try {const value=(req.headers.authorization||'').replace(/^Bearer /,'');const payload=jwt.verify(value,process.env.JWT_SECRET,{issuer:'mebel48'});
 const {rows}=await db.query('SELECT id,tg_id,email,name,role,region,status FROM users WHERE id=$1',[payload.sub]);
 const user=rows[0];if(!user||user.status!=='active'||(roles&&!roles.includes(user.role)))return reply.code(403).send({error:'Ruxsat yo‘q'});
 req.user=user;
 }catch{return reply.code(401).send({error:'Avtorizatsiya kerak'});}
}
export const guard=(roles)=>async(req,reply)=>requireUser(req,reply,roles);
export async function notify(userId,type,payload){const {rows}=await db.query('INSERT INTO notifications(user_id,type,payload) VALUES($1,$2,$3) RETURNING id',[userId,type,payload]);await queue.add('notify',{notificationId:rows[0].id},{jobId:`notify-${rows[0].id}`,attempts:5,backoff:{type:'exponential',delay:1000}});}
export async function transition(c,order,from,to,actor,details={},media=[],dueAt=null){
 if(order.status!==from)throw Object.assign(Error(`Expected ${from}`),{statusCode:409});
 const hours=Number((await c.query("SELECT value FROM settings WHERE key='deadline_hours'")).rows[0].value);
 const deadline=to==='completed'?order.due_at:(dueAt||new Date(Date.now()+hours*3600_000));
 await c.query('UPDATE orders SET status=$2,due_at=$3,updated_at=now() WHERE id=$1',[order.id,to,deadline]);
 await c.query('INSERT INTO order_steps(order_id,step_name,actor_id,details,media_urls,step_due_at) VALUES($1,$2,$3,$4,$5,$6)',[order.id,to,actor,details,media,to==='completed'?null:deadline]);
 await audit(c,actor,'transition','order',order.id,{status:from,due_at:order.due_at},{status:to,due_at:deadline,...details});
}
