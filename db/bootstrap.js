import pg from 'pg';
import bcrypt from 'bcryptjs';
const {BOOTSTRAP_ADMIN_EMAIL:email,BOOTSTRAP_ADMIN_PASSWORD:password,BOOTSTRAP_ADMIN_TOTP_SECRET:totp}=process.env;
if(!email||!password||password.length<12||!totp||totp.length<16)throw Error('Set bootstrap email, password (12+), TOTP secret (16+)');
const db=new pg.Pool({connectionString:process.env.DATABASE_URL});
try{
 const hash=await bcrypt.hash(password,12);
 const {rowCount}=await db.query("INSERT INTO users(email,password_hash,totp_secret,name,role,status) VALUES($1,$2,$3,'Super Admin','admin','active') ON CONFLICT(email) DO NOTHING",[email,hash,totp]);
 console.log(rowCount?'Admin created. Enroll TOTP secret in authenticator app.':'Admin already exists; bootstrap did not change credentials.');
}finally{await db.end();}
