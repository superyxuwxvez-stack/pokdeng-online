export const points=cards=>cards.reduce((s,c)=>s+Math.min(c%13+1,10),0)%10;
export const natural=cards=>cards.length===2&&points(cards)>=8;
const fail=m=>{throw new Error(m)};
export function createRoom(code,id,name){return {code,host:id,banker:id,round:0,phase:'waiting',players:[player(id,name)],deck:[],deadline:0};}
function player(id,name){return {id,name:String(name||'เพื่อน').trim().slice(0,20),chips:10000,cards:[],bet:0,ready:false,done:false,result:null};}
export function settle(r){
 const bank=r.players.find(p=>p.id===r.banker);
 if(!natural(bank.cards))while(points(bank.cards)<4&&bank.cards.length<3)bank.cards.push(r.deck.pop());
 const strength=p=>(natural(p.cards)?100:0)+points(p.cards);
 for(const p of r.players.filter(p=>p.id!==bank.id)){const d=Math.sign(strength(p)-strength(bank))*p.bet;p.chips+=d;bank.chips-=d;p.result=d;p.done=true;}
 bank.result=r.players.filter(p=>p.id!==bank.id).reduce((s,p)=>s-p.result,0);r.phase='result';return r;
}
export function action(r,id,a){
 const p=r.players.find(p=>p.id===id);
 if(a.type==='join'){if(p)return r;if(r.phase!=='waiting')fail('รอให้จบรอบก่อนเข้าห้อง');if(r.players.length>=6)fail('ห้องเต็มแล้ว');r.players.push(player(id,a.name));return r;}
 if(!p)fail('ไม่พบผู้เล่นในห้อง');
 if(a.type==='tick'){if(r.phase==='playing'&&Date.now()>r.deadline){for(const q of r.players)q.done=true;settle(r);}return r;}
 if(a.type==='ready'){
  if(r.phase!=='waiting')fail('รอรอบถัดไป');const bet=Number(a.bet);
  if(!Number.isInteger(bet)||bet<100||bet>1000||bet%100||bet>p.chips)fail('เลือกชิป 100–1,000 ที่คุณมีเพียงพอ');
  p.bet=id===r.banker?0:bet;p.ready=true;return r;
 }
 if(a.type==='deal'){
  if(id!==r.host)fail('เฉพาะเจ้าของห้องเริ่มได้');if(r.phase!=='waiting')fail('รอบเริ่มแล้ว');
  if(r.players.length<2||!r.players.every(q=>q.ready))fail('ต้องมีอย่างน้อย 2 คน และทุกคนพร้อม');
  const bank=r.players.find(q=>q.id===r.banker);if(bank.chips<r.players.reduce((s,q)=>s+q.bet,0))fail('ชิปเจ้ามือไม่พอรองรับรอบนี้');
  r.deck=Array.from({length:52},(_,i)=>i);
  for(let i=51;i>0;i--){let x;const limit=Math.floor(4294967296/(i+1))*(i+1);do{x=crypto.getRandomValues(new Uint32Array(1))[0]}while(x>=limit);const j=x%(i+1);[r.deck[i],r.deck[j]]=[r.deck[j],r.deck[i]];}
  for(const q of r.players){q.cards=[r.deck.pop(),r.deck.pop()];q.done=q.id===r.banker||natural(q.cards);q.result=null;}
  r.round++;r.phase='playing';r.deadline=Date.now()+45000;
  if(natural(bank.cards)||r.players.every(q=>q.done))settle(r);return r;
 }
 if(a.type==='draw'||a.type==='stand'){
  if(r.phase==='playing'&&Date.now()>r.deadline)return settle(r);
  if(r.phase!=='playing'||p.done||id===r.banker)fail('คุณหยุดแล้ว หรือรอบจบแล้ว');
  if(a.type==='draw')p.cards.push(r.deck.pop());p.done=true;
  if(r.players.every(q=>q.done))settle(r);return r;
 }
 if(a.type==='next'){
  if(id!==r.host||r.phase!=='result')fail('เจ้าของห้องเป็นผู้เปิดรอบถัดไป');
  r.banker=r.players[(r.players.findIndex(q=>q.id===r.banker)+1)%r.players.length].id;
  for(const q of r.players){q.cards=[];q.ready=false;q.done=false;q.bet=0;q.result=null;}r.phase='waiting';return r;
 }
 if(a.type==='leave'){
  if(r.phase==='playing')fail('รอให้จบรอบก่อนออก');r.players=r.players.filter(q=>q.id!==id);
  if(r.host===id)r.host=r.players[0]?.id;if(r.banker===id)r.banker=r.players[0]?.id;
  if(r.phase==='result'){r.phase='waiting';for(const q of r.players){q.ready=false;q.cards=[];q.bet=0;}}return r;
 }
 fail('คำสั่งไม่ถูกต้อง');
}
export function view(r,id){return {...r,deck:undefined,players:r.players.map(p=>({...p,cards:r.phase==='result'||p.id===id?p.cards:p.cards.map(()=>-1)}))};}

