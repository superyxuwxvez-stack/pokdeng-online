import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {POST} from '../app/api/room/route.ts';
const users={host:{id:'user-host',email:'host@players.example.com'},friend:{id:'user-friend',email:'friend@players.example.com'},third:{id:'user-third',email:'third@players.example.com'},outsider:{id:'outsider',email:'outsider@example.net'}};
const rows=new Map();
const server=createServer(async(req,res)=>{
 res.setHeader('content-type','application/json');
 const send=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data));};
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/auth/v1/user'){const u=users[req.headers.authorization?.replace('Bearer ','')];return u?send(200,u):send(401,{message:'Invalid token'});}
 let body='';for await(const c of req)body+=c;
 if(url.pathname==='/rest/v1/rooms'){
  if(req.method==='POST'){const row=JSON.parse(body);if(rows.has(row.code))return send(409,{code:'23505'});rows.set(row.code,structuredClone(row));return send(201,null);}
  const code=url.searchParams.get('code')?.replace('eq.',''),row=rows.get(code);
  if(req.method==='GET')return send(200,row?[structuredClone(row)]:[]);
  if(req.method==='PATCH'){
   if(!row||row.version!==Number(url.searchParams.get('version')?.replace('eq.','')))return send(200,[]);
   Object.assign(row,JSON.parse(body));return send(200,[{code}]);
  }
 }
 send(404,{message:'Not found'});
});
test('authenticated API: rejects outsiders, concurrent actions, hidden hands, settlement',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();
 process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:'+address.port;
 process.env.SUPABASE_SERVICE_ROLE_KEY='test-server-only-key';
 delete process.env.ALLOWED_PLAYER_USERNAMES;
 async function call(token,type,code,extra={}){
  const res=await POST(new Request('http://localhost/api/room',{method:'POST',headers:{'Content-Type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify({type,code,...extra})}));
  return {status:res.status,body:await res.json()};
 }
 try{
  assert.equal((await call(null,'create')).status,401);
  assert.equal((await call('bad-token','create')).status,401);
  assert.equal((await call('outsider','create')).status,403);
  let response=await call('host','create',null,{name:'Host'});assert.equal(response.status,200);
  const code=response.body.code;
  const joined=await Promise.all(['friend','third'].map(t=>call(t,'join',code,{name:t})));
  assert.ok(joined.every(r=>r.status===200));
  const ready=await Promise.all(['host','friend','third'].map(t=>call(t,'ready',code,{bet:100})));
  assert.ok(ready.every(r=>r.status===200));
  assert.equal((await call('friend','deal',code)).status,400);
  response=await call('host','deal',code);assert.equal(response.status,200);
  assert.equal(response.body.deck,undefined);
  if(response.body.phase==='playing'){
   assert.ok(response.body.players.filter(p=>p.id!=='user-host').every(p=>p.cards.every(c=>c===-1)));
   for(const token of ['friend','third']){
    const own=await call(token,'state',code);const p=own.body.players.find(p=>p.id===users[token].id);
    if(own.body.phase==='playing'&&!p.done)assert.equal((await call(token,'stand',code)).status,200);
   }
  }
  response=await call('host','state',code);assert.equal(response.body.phase,'result');
  assert.equal(response.body.players.reduce((sum,p)=>sum+p.chips,0),30000);
  response=await call('host','next',code);assert.equal(response.body.banker,'user-friend');
  process.env.ALLOWED_PLAYER_USERNAMES='host';
  assert.equal((await call('friend','state',code)).status,403);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
