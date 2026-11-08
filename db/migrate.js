import pg from 'pg'; import {readFileSync} from 'node:fs';
const db=new pg.Pool({connectionString:process.env.DATABASE_URL});
try {await db.query(readFileSync(new URL('./schema.sql',import.meta.url),'utf8')); console.log('Schema ready');} finally {await db.end();}
