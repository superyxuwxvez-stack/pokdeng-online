# POKDENG — Emerald Club (Vercel)
Next.js + Supabase • ชื่อผู้ใช้/รหัสผ่าน • เล่นด้วยชิปสมมติ

## 1. ตั้งค่า Supabase
1. สร้างโปรเจกต์ Supabase ของคุณ
2. เปิด SQL Editor และรันไฟล์ supabase/schema.sql
3. คัดลอก Project URL, anon/public key และ service_role key
4. Authentication > Providers: เปิด Email/password
5. Authentication > Sign In / User Signups: ปิด Allow new users to sign up
   คุณเป็นผู้สร้างบัญชีให้เพื่อนเท่านั้น ไม่ต้องเปิดสมัครสมาชิกสาธารณะ
6. สร้างไฟล์ .env.local โดยคัดลอกจาก .env.example แล้วใส่ค่าจริง

ตัวแปร:
- NEXT_PUBLIC_SUPABASE_URL: Project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY: anon/public key
- SUPABASE_SERVICE_ROLE_KEY: service_role key (เก็บฝั่งเซิร์ฟเวอร์เท่านั้น)
- ALLOWED_PLAYER_USERNAMES: ทางเลือก เช่น host,friend01,friend02 ถ้าว่างยอมรับบัญชีที่คุณสร้างทั้งหมด

ห้ามนำ .env.local หรือ service_role key ขึ้น GitHub
อย่าเติม NEXT_PUBLIC_ หน้าตัวแปร service_role

## 2. สร้างบัญชี
ติดตั้ง Node.js 22.13 ขึ้นไป แล้วรัน:
npm ci
node --env-file=.env.local scripts/create-player.mjs player01

โปรแกรมถามรหัสผ่านโดยซ่อนตัวอักษร พิมพ์อย่างน้อย 8 ตัวแล้วกด Enter
ส่งชื่อผู้ใช้ player01 กับรหัสผ่านให้เพื่อนผ่านช่องทางส่วนตัว
หน้าล็อกอินใช้เพียง username/password ไม่ต้องมีอีเมล ไม่ต้องใช้ ChatGPT
ภายในระบบจะผูก username กับตัวระบุ player01@players.example.com
ตัวระบุดังกล่าวไม่ใช่อีเมลจริงและไม่มีการส่งเมล

หากต้องเปลี่ยนรหัสผ่าน ให้เจ้าของเกมจัดการผ่าน Supabase Authentication
รุ่นนี้ยังไม่มีเมนูลืมรหัสผ่านหรือสมัครบัญชีในหน้าเว็บ

## 3. ทดสอบบนเครื่อง
npm run dev
เปิด http://localhost:3000
npm test
npm run test:api
npm run typecheck
npm run build

## 4. ขึ้น GitHub
ใช้โฟลเดอร์นี้เป็น root repository (มี package.json อยู่ชั้นบนสุด)
สร้าง repository ของคุณ แล้วรันจากโฟลเดอร์นี้:
git init
git add .
git commit -m "Initial Pokdeng game"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main

ไฟล์ .gitignore ยกเว้น node_modules, .next, .env.local และ .vercel แล้ว

## 5. Deploy บน Vercel
1. Add New > Project > Import Git Repository แล้วเลือก repo
2. Framework Preset: Next.js
3. Root Directory: โฟลเดอร์ที่มี package.json (ถ้าอัปโหลดทั้งโฟลเดอร์ย่อย ให้เลือกโฟลเดอร์ย่อยนั้น)
4. Build Command: npm run build
5. ใส่ Environment Variables ตามข้อ 1 ให้ตรงกับ Supabase ของคุณ
6. Deploy แล้วเปิด URL ของ Vercel
7. ถ้าเปลี่ยน Environment Variables ให้ Redeploy
8. ทดสอบล็อกอิน สร้างห้อง และให้เพื่อนเข้าห้องบนอีกอุปกรณ์

Vercel ประกอบค่าที่ขึ้นต้น NEXT_PUBLIC_ ลงในหน้าเว็บตอน build
อย่าใช้ .env.example ที่เป็น placeholder เป็นค่าจริง
ไม่ต้องตั้ง callback URL เพราะใช้ username/password

## ระบบห้อง
ไพ่และสำรับอยู่ในฐานข้อมูลฝั่งเซิร์ฟเวอร์ API ตรวจ session กับ Supabase ก่อนทุกคำสั่ง
เบราว์เซอร์ไม่มีสิทธิ์อ่านตาราง rooms โดยตรง (RLS เปิดและไม่มีนโยบายอนุญาต)
ใช้ version เปรียบเทียบก่อนเขียนเพื่อป้องกันคำสั่งพร้อมกันเขียนทับ
อัปเดตโต๊ะทุก 2 วินาที ข้อมูลห้องไม่เก็บไว้ในหน่วยความจำของ Vercel
ผู้เล่นล็อกอินบัญชีเดิมสามารถกลับเข้าห้องเดิมได้ แม้ session refresh
รหัสห้องคือรหัสเข้าร่วมโต๊ะ คนที่ได้รับรหัสและมีบัญชีสามารถเข้าห้องได้

## กติกาเริ่มต้น
2–6 คน เริ่มคนละ 10,000 ชิป เลือก 100–1,000 ชิปต่อรอบ
A=1, 2–9 ตามหน้าไพ่, 10/J/Q/K=0 นับหลักหน่วย
สองใบ 8/9 เป็นป๊อก ชนะมือธรรมดา แต้มเท่ากันเสมอ
จั่วได้หนึ่งใบ เจ้ามือจั่วเมื่อต่ำกว่า 4 แต้ม จ่ายเท่าทุน ไม่มีเด้ง/ไพ่พิเศษ
เวลาเลือก 45 วินาที หมดเวลาให้อยู่ สลับเจ้ามือทุกครั้งที่ขึ้นรอบใหม่
โหมดบอตทำงานบนเบราว์เซอร์ แต่ต้องล็อกอินก่อน
ไม่มีเงินจริง เติมเงิน ถอนเงิน หรือซื้อชิป

## ข้อจำกัดและการตรวจสอบ
- ต้องตั้งค่า Supabase จริงก่อนใช้บัญชีและเล่นออนไลน์
- ชุดนี้ตรวจ build, typecheck, กติกา 500 รอบ และ API กับ Supabase จำลอง
- ยังไม่ได้ทดสอบล็อกอินหรือฐานข้อมูลกับ Supabase ของคุณ และยังไม่ได้ deploy เข้า Vercel ของคุณ
- ไม่มีแชต ระบบเติมชิป หรือโอนเจ้าของห้องอัตโนมัติเมื่อเจ้าของหายไป
- ห้องไม่มีการใช้งานเกิน 24 ชั่วโมงจะเข้าร่วมไม่ได้ แต่ข้อมูลยังอยู่จนเจ้าของลบ
- จำกัดการสร้างบัญชีและการเดารหัสผ่านด้วยการตั้งค่า Auth rate limits ของ Supabase
- การ polling มีค่าใช้ทรัพยากรตามจำนวนคน/ระยะเวลาเล่น ตรวจการใช้งานของโฮสต์ตามจริง

คู่มืออ้างอิง:
https://vercel.com/docs/frameworks/full-stack/nextjs
https://supabase.com/docs/reference/javascript/auth-signinwithpassword
https://supabase.com/docs/reference/javascript/auth-admin-createuser
