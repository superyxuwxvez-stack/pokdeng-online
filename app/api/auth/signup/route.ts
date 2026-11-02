import {createClient} from '@supabase/supabase-js';
import {createHmac} from 'node:crypto';
export const runtime='nodejs';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:Request){
 try{
  const origin=req.headers.get('origin');
  if(origin&&origin!==new URL(req.url).origin)return reply({error:'คำขอไม่ถูกต้อง'},403);
  const text=await req.text();if(text.length>2048)return reply({error:'ข้อมูลยาวเกินไป'},413);
  const body=JSON.parse(text);
  const username=typeof body.username==='string'?body.username.trim().toLowerCase():'';
  const password=typeof body.password==='string'?body.password:'';
  if(!/^[a-z0-9_]{3,24}$/.test(username))return reply({error:'ชื่อผู้ใช้ต้องเป็น a-z, 0-9 หรือ _ จำนวน 3–24 ตัว'},400);
  if(password.length<8||password.length>72)return reply({error:'รหัสผ่านต้องมี 8–72 ตัวอักษร'},400);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return reply({error:'ระบบสมัครสมาชิกยังไม่พร้อม'},503);
  const allowed=(process.env.ALLOWED_PLAYER_USERNAMES||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  if(allowed.length&&!allowed.includes(username))return reply({error:'ชื่อนี้ยังไม่ได้รับสิทธิ์ กรุณาติดต่อเจ้าของโต๊ะ'},403);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown';
  const bucket=createHmac('sha256',key).update(ip).digest('hex');
  const {data:ok,error:rateError}=await db.rpc('consume_signup_attempt',{bucket});
  if(rateError)return reply({error:'ระบบสมัครสมาชิกยังไม่พร้อม กรุณาลองใหม่ภายหลัง'},503);
  if(ok!==true)return reply({error:'สมัครบ่อยเกินไป กรุณารอ 1 ชั่วโมงแล้วลองใหม่'},429);
  const {error}=await db.auth.admin.createUser({email:username+'@players.example.com',password,email_confirm:true,user_metadata:{username}});
  if(error)return reply({error:error.code==='email_exists'||error.code==='user_already_exists'?'ชื่อผู้ใช้นี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น':'สมัครไม่สำเร็จ กรุณาตรวจสอบชื่อผู้ใช้และรหัสผ่าน'},400);
  return reply({ok:true,username},201);
 }catch{return reply({error:'ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่'},400)}
}
