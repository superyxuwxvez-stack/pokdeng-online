import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {POST} from '../app/api/auth/signup/route.ts';
test('signup validates input, origin, rate limits, username and account creation',async()=>{
 let rate=true,duplicate=false,created=null,calls=0;
 const server=createServer(async(req,res)=>{
  let body='';for await(const c of req)body+=c;
  res.setHeader('content-type','application/json');
  if(req.url==='/rest/v1/rpc/consume_signup_attempt'){calls++;res.end(JSON.stringify(rate));return}
  if(req.url==='/auth/v1/admin/users'){
   if(duplicate){res.statusCode=422;res.end(JSON.stringify({code:'email_exists',msg:'duplicate'}));return}
   created=JSON.parse(body);res.end(JSON.stringify({id:'new-player',email:created.email}));return;
  }
  res.statusCode=404;res.end('{}');
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:'+server.address().port;
 process.env.SUPABASE_SERVICE_ROLE_KEY='test-server-key';
 delete process.env.ALLOWED_PLAYER_USERNAMES;
 async function call(body,origin='http://localhost'){const r=await POST(new Request('http://localhost/api/auth/signup',{method:'POST',headers:{origin,'Content-Type':'application/json','x-forwarded-for':'192.0.2.1'},body:JSON.stringify(body)}));return {status:r.status,data:await r.json()}}
 try{
  assert.equal((await call({username:'ab',password:'abcdefgh'})).status,400);
  assert.equal((await call({username:'valid',password:'short'})).status,400);
  assert.equal((await call({username:'valid',password:'abcdefgh'},'https://evil.example')).status,403);
  assert.equal(calls,0);
  let r=await call({username:' Player_01 ',password:'abcdefgh'});assert.equal(r.status,201);
  assert.equal(created.email,'player_01@players.example.com');assert.equal(created.email_confirm,true);
  assert.equal(created.password,'abcdefgh');assert.equal('password' in r.data,false);
  duplicate=true;assert.equal((await call({username:'player_01',password:'abcdefgh'})).status,400);
  rate=false;assert.equal((await call({username:'another',password:'abcdefgh'})).status,429);
  process.env.ALLOWED_PLAYER_USERNAMES='host';assert.equal((await call({username:'another',password:'abcdefgh'})).status,403);
 }finally{await new Promise(r=>server.close(r))}
});
