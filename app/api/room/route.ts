import {createClient} from '@supabase/supabase-js';
import {createRoom,action,view} from '../../../lib/game.js';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:Request){
 try{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return reply({error:'ยังไม่ได้ตั้งค่า Supabase บนเซิร์ฟเวอร์'},503);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if(!token)return reply({error:'กรุณาล็อกอินก่อนเล่น'},401);
  const {data:{user},error:authError}=await db.auth.getUser(token);
  if(authError||!user)return reply({error:'กรุณาล็อกอินใหม่'},401);
  const allowed=(process.env.ALLOWED_PLAYER_USERNAMES||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  const username=user.email?.split('@')[0]||'';
  if(!user.email?.endsWith('@players.example.com')||(allowed.length&&!allowed.includes(username)))return reply({error:'บัญชีนี้ยังไม่ได้รับสิทธิ์เข้าเล่น'},403);
  const id=user.id;
  const text=await req.text();if(text.length>4096)return reply({error:'ข้อมูลยาวเกินไป'},413);
  const a=JSON.parse(text),code=String(a.code||'').trim().toUpperCase();
  if(a.type==='create'){
   const name=String(a.name||'').trim().slice(0,20);if(!name)throw new Error('กรุณาใส่ชื่อเล่น');
   for(let i=0;i<5;i++){
    const c=Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('');
    const r=createRoom(c,id,name);
    const {error}=await db.from('rooms').insert({code:c,state:r,version:0,updated:Date.now()});
    if(!error)return reply(view(r,id));
    if(error.code!=='23505')throw new Error('ฐานข้อมูลยังไม่พร้อม กรุณาตรวจสอบการติดตั้ง');
   }throw new Error('ลองสร้างห้องอีกครั้ง');
  }
  if(!/^[A-Z2-9]{6}$/.test(code))throw new Error('รหัสห้องต้องมี 6 ตัว');
  for(let i=0;i<6;i++){
   const {data:row,error}=await db.from('rooms').select('state,version,updated').eq('code',code).maybeSingle();
   if(error)throw new Error('อ่านข้อมูลห้องไม่ได้');
   if(!row||Date.now()-Number(row.updated)>86400000)throw new Error('ไม่พบห้อง หรือห้องหมดอายุแล้ว');
   const next=action(row.state,id,a.type==='state'?{type:'tick'}:a);
   const {data:changed,error:writeError}=await db.from('rooms').update({state:next,version:row.version+1,updated:Date.now()}).eq('code',code).eq('version',row.version).select('code');
   if(writeError)throw new Error('บันทึกห้องไม่ได้');
   if(changed?.length)return reply(view(next,id));
  }
  return reply({error:'มีคำสั่งพร้อมกัน กรุณาลองอีกครั้ง'},409);
 }catch(e:unknown){return reply({error:e instanceof Error?e.message:'เชื่อมต่อห้องไม่ได้'},400)}
}
