'use client';
import {useEffect,useRef,useState} from 'react';
import {getBrowserClient} from '../lib/supabase';
import type {Session} from '@supabase/supabase-js';
import {action,createRoom,points,view,natural} from '../lib/game.js';
type Player={id:string;name:string;chips:number;cards:number[];bet:number;ready:boolean;done:boolean;result:number|null};
type Room={code:string;host:string;banker:string;round:number;phase:string;players:Player[];deadline:number};
const money=(n:number)=>n.toLocaleString('en-US');
function Card({n,index=0}:{n:number;index?:number}){const rank=['A','2','3','4','5','6','7','8','9','10','J','Q','K'][n%13],suit=['♠','♥','♣','♦'][Math.floor(n/13)];return <div className={'card '+(n<0?'back':Math.floor(n/13)%2?'red':'')} style={{transform:'rotate('+((index-0.5)*8)+'deg)'}}>{n<0?<span>♠</span>:<><b>{rank}<small>{suit}</small></b><em>{suit}</em><b className="corner">{rank}<small>{suit}</small></b></>}</div>}
export default function Home(){
 const [room,setRoom]=useState<Room|null>(null),[name,setName]=useState(''),[code,setCode]=useState(''),[bet,setBet]=useState(100),[busy,setBusy]=useState(false),[error,setError]=useState(''),[modal,setModal]=useState(''),[demo,setDemo]=useState(false),[now,setNow]=useState(Date.now()),[copied,setCopied]=useState(false);
 const [session,setSession]=useState<Session|null>(null),[authReady,setAuthReady]=useState(false),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[loginBusy,setLoginBusy]=useState(false),[loginError,setLoginError]=useState('');
 const [authMode,setAuthMode]=useState<'signin'|'signup'>('signin'),[confirmPassword,setConfirmPassword]=useState(''),[showPassword,setShowPassword]=useState(false),[authNotice,setAuthNotice]=useState('');
 const identity=useRef(''); const demoRoom=useRef<any>(null);
 const storageKey=()=> 'pok-room-'+identity.current;
 useEffect(()=>{
  const client=getBrowserClient();
  setName(localStorage.getItem('pok-name')||'');
  setCode(new URLSearchParams(location.search).get('room')||'');
  if(!client){setAuthReady(true);return;}
  let active=true;
  client.auth.getSession().then(({data,error})=>{if(!active)return;if(error)setLoginError('โหลดบัญชีไม่ได้ กรุณาล็อกอินอีกครั้ง');identity.current=data.session?.user.id||'';setSession(data.session);setAuthReady(true);});
  const {data:{subscription}}=client.auth.onAuthStateChange((_event,s)=>{if(!active)return;identity.current=s?.user.id||'';if(!s){setRoom(null);setDemo(false);demoRoom.current=null;}setSession(s);setAuthReady(true);});
  const t=setInterval(()=>setNow(Date.now()),1000);
  return()=>{active=false;subscription.unsubscribe();clearInterval(t)};
 },[]);
 useEffect(()=>{
  if(!session)return;
  let active=true;
  const saved=localStorage.getItem('pok-room-'+session.user.id);
  if(saved)request('state',{code:saved}).then(r=>{if(active)setRoom(r)}).catch(()=>localStorage.removeItem('pok-room-'+session.user.id));
  return()=>{active=false};
 },[session?.user.id]);
 async function login(e:React.FormEvent){
  e.preventDefault();setLoginBusy(true);setLoginError('');setAuthNotice('');
  try{
   const user=username.trim().toLowerCase();
   if(!/^[a-z0-9_]{3,24}$/.test(user))throw new Error('ชื่อผู้ใช้ต้องเป็น a-z, 0-9 หรือ _ จำนวน 3–24 ตัว');
   const client=getBrowserClient();if(!client)throw new Error('ยังไม่ได้ตั้งค่าระบบล็อกอิน');
   if(authMode==='signup'){
    if(password.length<8||password.length>72)throw new Error('รหัสผ่านต้องมี 8–72 ตัวอักษร');
    if(password!==confirmPassword)throw new Error('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
    const res=await fetch('/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:user,password})});
    const result=await res.json();if(!res.ok)throw new Error(result.error||'สมัครสมาชิกไม่ได้');
    setAuthMode('signin');setPassword('');setConfirmPassword('');setAuthNotice('สมัครสำเร็จ! เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านของคุณได้เลย');return;
   }
   const {error}=await client.auth.signInWithPassword({email:user+'@players.example.com',password});
   if(error)throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
   setPassword('');
  }catch(e:unknown){setLoginError(e instanceof Error?e.message:'ล็อกอินไม่ได้')}finally{setLoginBusy(false)}
 }
 async function logout(){
  if(room){setError('กรุณาออกจากโต๊ะก่อนออกจากระบบ');return;}
  const {error}=await getBrowserClient()!.auth.signOut();
  if(error){setError('ออกจากระบบไม่ได้ กรุณาลองอีกครั้ง');return;}
  setRoom(null);setDemo(false);demoRoom.current=null;setPassword('');setSession(null);identity.current='';
 }
 async function request(type:string,extra:any={}){
  const client=getBrowserClient();if(!client)throw new Error('ยังไม่ได้ตั้งค่าระบบล็อกอิน');
  const {data:{session:s}}=await client.auth.getSession();
  if(!s)throw new Error('กรุณาล็อกอินก่อนเล่น');
  const res=await fetch('/api/room',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.access_token},body:JSON.stringify({type,code:room?.code,...extra})});
  const data=await res.json();if(!res.ok)throw new Error(data.error||'เชื่อมต่อไม่ได้');return data;
 }
 useEffect(()=>{if(!room)return;if(demo){const t=setInterval(()=>{if(demoRoom.current){action(demoRoom.current,identity.current,{type:'tick'});setRoom(view(demoRoom.current,identity.current));}},1000);return()=>clearInterval(t)}let stopped=false;const poll=async()=>{try{const r=await request('state');if(!stopped){setRoom(r);setError('')}}catch(e:any){if(!stopped)setError('การเชื่อมต่อขัดข้อง • '+e.message)}};const t=setInterval(poll,2000);return()=>{stopped=true;clearInterval(t)}},[room?.code,demo]);
 async function run(type:string){
  if(busy)return;setBusy(true);setError('');
  try{
   if((type==='create'||type==='join')&&!name.trim())throw new Error('ใส่ชื่อเล่นก่อนนะ');
   let r;
   if(demo){
    r=action(demoRoom.current,identity.current,{type,bet});
    if(type==='next'){for(const p of r.players)if(p.id!==identity.current)action(r,p.id,{type:'ready',bet:100});}
    if(type==='deal'&&r.phase==='playing'){for(const p of r.players)if(p.id!==identity.current&&!p.done)action(r,p.id,{type:'stand'});}
    demoRoom.current=r;r=view(r,identity.current);
   }else{r=await request(type,{name,bet,code:room?.code||code.trim().toUpperCase()});}
   if(type==='leave'){setRoom(null);setDemo(false);demoRoom.current=null;localStorage.removeItem(storageKey());}
   else{setRoom(r);if(!demo){localStorage.setItem(storageKey(),r.code);localStorage.setItem('pok-name',name)}}setModal('');
  }catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 function startDemo(){const r=createRoom('DEMO01',identity.current,name||'คุณ');action(r,'bot-1',{type:'join',name:'คุณมิน'});action(r,'bot-2',{type:'join',name:'คุณเจ'});r.banker='bot-1';action(r,'bot-1',{type:'ready',bet:100});action(r,'bot-2',{type:'ready',bet:100});demoRoom.current=r;setRoom(view(r,identity.current));setDemo(true);setError('');}
 const me=room?.players.find(p=>p.id===identity.current),host=room?.host===identity.current,banker=room?.banker===identity.current;
 const ordered=room?[...room.players.filter(p=>p.id!==identity.current),...(me?[me]:[])]:[];
 if(!authReady)return <div className="login-page"><div className="login-box"><div className="brand"><span>POKDENG.</span><small>EMERALD CLUB</small></div><p className="muted">กำลังโหลด…</p></div></div>;
 if(!session)return <div className="login-page"><section className="login-box"><div className="login-suit">♠</div><div className="brand"><span>POKDENG.</span><small>EMERALD CLUB</small></div><div className="auth-tabs" role="tablist" aria-label="บัญชีผู้เล่น"><button id="signin-tab" role="tab" aria-selected={authMode==='signin'} aria-controls="auth-panel" disabled={loginBusy} onClick={()=>{setAuthMode('signin');setLoginError('');setAuthNotice('');setConfirmPassword('');}}>เข้าสู่ระบบ</button><button id="signup-tab" role="tab" aria-selected={authMode==='signup'} aria-controls="auth-panel" disabled={loginBusy} onClick={()=>{setAuthMode('signup');setLoginError('');setAuthNotice('');}}>สมัครสมาชิก</button></div><div id="auth-panel" role="tabpanel" aria-labelledby={authMode==='signin'?'signin-tab':'signup-tab'}><h1>{authMode==='signin'?'ยินดีต้อนรับกลับ':'เข้าร่วมวงกับเพื่อน'}</h1><p className="muted">{authMode==='signin'?'ล็อกอิน แล้วเข้าวงกับเพื่อนของคุณ':'สร้างบัญชีด้วยชื่อผู้ใช้และรหัสผ่าน'}</p><form onSubmit={login}><label htmlFor="username">ชื่อผู้ใช้</label><input id="username" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="เช่น player01" minLength={3} maxLength={24} required disabled={loginBusy}/>{authMode==='signup'&&<p className="auth-help">ใช้ a-z, 0-9 หรือ _ จำนวน 3–24 ตัว</p>}<label htmlFor="password" className="password-label">รหัสผ่าน</label><div className="password-input"><input id="password" type={showPassword?'text':'password'} autoComplete={authMode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={authMode==='signup'?'ตั้งรหัสผ่านอย่างน้อย 8 ตัว':'รหัสผ่านของคุณ'} minLength={authMode==='signup'?8:undefined} maxLength={authMode==='signup'?72:undefined} required disabled={loginBusy}/><button type="button" aria-label={showPassword?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน'} onClick={()=>setShowPassword(!showPassword)}>{showPassword?'ซ่อน':'แสดง'}</button></div>{authMode==='signup'&&<><label htmlFor="confirm-password" className="password-label">ยืนยันรหัสผ่าน</label><input id="confirm-password" type={showPassword?'text':'password'} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="พิมพ์รหัสผ่านอีกครั้ง" minLength={8} maxLength={72} required disabled={loginBusy}/></>}<button className="gold" disabled={loginBusy||!getBrowserClient()} type="submit">{loginBusy?'กำลังดำเนินการ…':authMode==='signin'?'เข้าสู่ระบบ':'สมัครสมาชิก'} <span>→</span></button></form>{!getBrowserClient()&&<p className="error">เจ้าของเว็บต้องตั้งค่า Supabase ก่อนเริ่มใช้งาน</p>}{loginError&&<p role="alert" className="error">{loginError}</p>}{authNotice&&<p role="status" className="auth-success">{authNotice}</p>}<p className="hint">ชิปสมมติเท่านั้น • ไม่มีเงินจริง</p></div></section></div>;
 return <div className="app">
 <aside className="rail"><a className="monogram" href="/" aria-label="หน้าแรก">♠</a><div className="rail-line"/><button className="rail-active" title="โต๊ะไพ่" onClick={()=>setModal('rooms')}>♧</button><button title="กติกา" onClick={()=>setModal('rules')}>♙</button><span className="rail-bottom">EC<br/>EST. 2026</span></aside>
 <div className="shell"><header><div className="brand"><span>POKDENG<span className="brand-dot">.</span></span><small>EMERALD CLUB</small></div><nav><span className="live-dot"/> PRIVATE TABLES <span className="nav-divider">/</span> <button onClick={()=>setModal('rules')}>วิธีเล่น ↗</button></nav><button className="text-button logout-button" onClick={logout}>ออกจากระบบ</button><div className="wallet"><span className="chip-icon">฿</span><div><small>ชิปสำหรับเล่น</small><strong>{money(me?.chips??10000)}</strong></div></div></header>
 <main><div className="eyebrow">THE EVENING IS YOURS <span>◆</span> เล่นสนุกในวงเพื่อน</div>
 <div className="heading"><div><h1>{room?'โต๊ะของพวกเรา':'ค่ำคืนนี้… เปิดโต๊ะกัน'}</h1><p>{room?(demo?'โหมดทดลอง • เล่นกับบอตบนเครื่องนี้': 'ห้องส่วนตัว • รหัส '+room.code+' • '+room.players.length+'/6 คน'):'ชวนเพื่อนคนโปรด มาลุ้นไพ่ใบถัดไปด้วยกัน'}</p></div><button className="outline small" onClick={()=>setModal('rules')}>♧ กติกาโต๊ะ</button></div>
 <div className="game-layout"><section className="table-panel">
 <div className="table-toolbar"><span><i className="live-dot"/>{room?(demo?'โต๊ะทดลอง':'ห้อง '+room.code):'EMERALD PRIVATE TABLE'}</span><span>{room?'รอบที่ '+room.round:'2–6 PLAYERS'} <b>•</b> {room?.phase==='playing'?Math.max(0,Math.ceil((room.deadline-now)/1000))+' วินาที':'ป๊อกเด้ง'}</span></div>
 <div className="table-scene">
 <div className="table-rim"><div className="felt"><div className="felt-ring"/><div className="table-mark"><span>♠</span><h2>EMERALD</h2><p>P O K D E N G &nbsp; C L U B</p><div>PRIVATE TABLE · GOOD COMPANY</div></div></div></div>
 {!room&&<><div className="seat preview-seat top"><span className="avatar">♛</span><small>ที่นั่งเจ้ามือ</small></div><div className="preview-cards"><Card n={8}/><Card n={22} index={1}/><div className="nine">ป๊อก 9 <span>✦</span></div></div><div className="seat empty-seat left">+<small>รอเพื่อนเข้าร่วม</small></div><div className="seat empty-seat right">+<small>รอเพื่อนเข้าร่วม</small></div><div className="decor-chips"><i/><i/><i/></div></>}
 {ordered.map((p,i)=>{const self=p.id===identity.current;const others=ordered.length-1;const x=self?50:others===1?50:others===2?30+i*40:15+i*70/Math.max(1,others-1);return <div key={p.id} className={'player-seat '+(self?'self':'opponent')} style={{left:x+'%',top:self?'77%':i%2===1&&others>3?'40%':'12%'}}><div className={'avatar '+(p.id===room?.banker?'bank-avatar':'')}>{p.id===room?.banker?'♛':p.name.slice(0,1)}</div><div className="player-label">{p.name}{self?' (คุณ)':''}<small>{p.id===room?.banker?'เจ้ามือ • ':''}{money(p.chips)}</small></div><div className="hand">{p.cards.map((n,j)=><Card key={j} n={n} index={j}/>)}</div>{p.cards.length>0&&p.cards[0]>=0&&<span className="score">{natural(p.cards)?'ป๊อก ':''}{points(p.cards)} แต้ม</span>}{room?.phase==='waiting'&&<span className={'status '+(p.ready?'ready':'')}>{p.ready?'✓ พร้อมแล้ว':'กำลังเตรียมตัว'}</span>}{room?.phase==='playing'&&p.done&&p.id!==room.banker&&<span className="status ready">หยุดแล้ว</span>}{room?.phase==='result'&&<span className={'result '+((p.result||0)>0?'win':'')}>{p.result===0?'เสมอ':(p.result!>0?'+':'')+money(p.result||0)}</span>}</div>})}
 {room&&<div className="center-status">{room.phase==='waiting'?'รอทุกคนพร้อม':room.phase==='playing'?'ลุ้นไพ่ใบถัดไป':'เปิดไพ่ • สรุปผลรอบนี้'}</div>}
 </div>
 <div className="table-bottom"><span>♢ ชิปสมมติเท่านั้น</span><span>ไม่มีเงินจริง · ไม่มีการเติมหรือถอน</span></div>
 </section>
 <aside className="control-panel">
 <div className="panel-overline">YOUR PRIVATE CLUB <span>✦</span></div><h2>{room?'พร้อมลุ้นหรือยัง?':'ความสนุกเริ่มที่นี่'}</h2><p className="muted">{room?'ทุกคนเห็นโต๊ะเดียวกัน ไพ่ในมือเป็นความลับจนจบรอบ':'เปิดโต๊ะส่วนตัว แล้วส่งรหัสให้เพื่อนเข้ามาร่วมวง'}</p>
 {!room?<><label htmlFor="name">ชื่อเล่นของคุณ</label><input id="name" maxLength={20} placeholder="เพื่อนเรียกคุณว่าอะไร?" value={name} onChange={e=>setName(e.target.value)}/><button className="gold" disabled={busy} onClick={()=>run('create')}>{busy?'กำลังเชื่อมต่อ…':'♠  สร้างห้องส่วนตัว'}<span>↗</span></button><div className="or"><span/>หรือเข้าร่วมกับเพื่อน<span/></div><label htmlFor="code">รหัสห้อง</label><div className="join-row"><input id="code" placeholder="รหัส 6 ตัว" maxLength={6} value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/><button className="outline" disabled={busy} onClick={()=>run('join')}>เข้าร่วม →</button></div><button className="text-button" onClick={startDemo}>ลองเล่นกับบอตก่อน ↗</button></>:<>
 <div className="room-code"><small>{demo?'โหมดทดลอง':'รหัสชวนเพื่อน'}</small><strong>{room.code}</strong><button className="text-button" onClick={async()=>{try{await navigator.clipboard.writeText(location.origin+'/?room='+room.code);setCopied(true);setTimeout(()=>setCopied(false),2000)}catch{setError('คัดลอกไม่สำเร็จ ใช้รหัสห้อง '+room.code)}}}>{copied?'✓ คัดลอกแล้ว':'คัดลอกลิงก์ ↗'}</button></div>
 {room.phase==='waiting'&&<><label>{banker?'คุณเป็นเจ้ามือรอบนี้':'เลือกชิปสำหรับรอบนี้'}</label>{!banker&&<div className="bet-options">{[100,200,500,1000].map(n=><button key={n} className={bet===n?'selected':''} disabled={me?.ready} onClick={()=>setBet(n)}>{money(n)}</button>)}</div>}<button className="gold" disabled={busy||me?.ready} onClick={()=>run('ready')}>{me?.ready?'✓ คุณพร้อมแล้ว':'พร้อมเล่น'} <span>♧</span></button>{host&&<button className="outline full" disabled={busy||room.players.length<2||!room.players.every(p=>p.ready)} onClick={()=>run('deal')}>แจกไพ่ • เริ่มรอบ</button>}<p className="hint">{room.players.length<2?'ส่งรหัสให้เพื่อนอย่างน้อย 1 คน':host?'แจกไพ่ได้เมื่อทุกคนกดพร้อม':'รอเจ้าของห้องแจกไพ่'}</p></>}
 {room.phase==='playing'&&<><div className="turn-status">{banker?'รอผู้เล่นตัดสินใจ':me?.done?'คุณหยุดแล้ว รอเปิดไพ่':'จั่วอีกใบ หรือพอแค่นี้?'}</div><button className="gold" disabled={busy||banker||me?.done} onClick={()=>run('draw')}>จั่วไพ่ <span>＋</span></button><button className="outline full" disabled={busy||banker||me?.done} onClick={()=>run('stand')}>อยู่ • ไม่จั่วเพิ่ม</button><p className="hint">เหลือ {Math.max(0,Math.ceil((room.deadline-now)/1000))} วินาที • หมดเวลา = อยู่</p></>}
 {room.phase==='result'&&<><div className="round-result">{(me?.result||0)>0?'ไพ่เข้าทางคุณ ✦':me?.result===0?'รอบนี้เสมอ':'ลุ้นกันใหม่รอบหน้า'}<strong>{(me?.result||0)>0?'+':''}{money(me?.result||0)}<small> ชิป</small></strong></div>{host?<button className="gold" disabled={busy} onClick={()=>run('next')}>รอบถัดไป <span>→</span></button>:<p className="hint">รอเจ้าของห้องเปิดรอบถัดไป</p>}</>}
 <button className="text-button" disabled={busy||room.phase==='playing'} onClick={()=>run('leave')}>ออกจากโต๊ะ</button>
 </>}
 {error&&<div role="alert" className="error">{error}</div>}
 <div className="club-note"><span>♧</span><div><strong>เพื่อนครบ ความสนุกก็พร้อม</strong><small>เล่นผ่านมือถือและคอมพิวเตอร์<br/>ไม่ต้องติดตั้งแอป</small></div></div>
 </aside></div>
 <div className="features"><div><span>01</span><section><b>โต๊ะของคุณ ก๊วนของคุณ</b><p>ห้องส่วนตัวสำหรับเพื่อน 2–6 คน</p></section></div><div><span>02</span><section><b>แจกไพ่ แล้วปล่อยใจลุ้น</b><p>นับแต้มและสรุปผลให้อัตโนมัติ</p></section></div><div><span>03</span><section><b>เล่นเพื่อรอยยิ้ม</b><p>เริ่มต้น 10,000 ชิปสมมติต่อคน</p></section></div></div>
 </main><footer><span>♠ EMERALD CLUB</span><span>GOOD CARDS. GREAT COMPANY.</span><small>เล่นสนุกกับเพื่อน • ไม่มีเงินจริง</small></footer></div>
 {modal&&<div className="modal-backdrop" onClick={()=>setModal('')}><section role="dialog" aria-modal="true" aria-label="กติกาโต๊ะ" className="modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setModal('')} aria-label="ปิด">×</button><div className="eyebrow">HOUSE RULES</div><h2>{modal==='rooms'?'โต๊ะส่วนตัวของคุณ':'กติกา Emerald Club'}</h2><p>ผู้เล่น 2–6 คน ใช้ไพ่สำรับมาตรฐาน 52 ใบ แจกคนละ 2 ใบ A = 1, 2–9 ตามหน้าไพ่ และ 10/J/Q/K = 0 นับเฉพาะหลักหน่วย</p><p>สองใบได้ 8 หรือ 9 เป็น “ป๊อก” ชนะมือธรรมดา ผู้เล่นที่ไม่ป๊อกเลือกจั่วเพิ่มได้ 1 ใบ หรืออยู่ เจ้ามือจั่วอัตโนมัติเมื่อต่ำกว่า 4 แต้ม และไม่เกิน 3 ใบ</p><p>เปรียบเทียบกับเจ้ามือรายคน ป๊อกสูงกว่ามือธรรมดา แต้มเท่ากันเสมอ ชนะหรือแพ้จ่าย 1 เท่าของชิปที่เลือก ไม่มีเด้ง ไพ่พิเศษ หรือค่าต๋ง</p><p>ทุกคนต้องกดพร้อมก่อนเจ้าของห้องแจกไพ่ มีเวลาตัดสินใจ 45 วินาที หมดเวลาให้อยู่ ผลัดเจ้ามือทุกครั้งที่ขึ้นรอบใหม่ ห้องว่างเกิน 24 ชั่วโมงจะหมดอายุ</p><p className="hint">ใช้ชิปสมมติเท่านั้น ไม่มีการซื้อชิป เติมเงิน หรือถอนเงิน</p><button className="gold" onClick={()=>setModal('')}>เข้าใจแล้ว ♠</button></section></div>}
 </div>
}





