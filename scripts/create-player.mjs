import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {createClient} from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key){console.error('ตั้งค่า .env.local จาก .env.example ก่อน');process.exit(1)}
let muted=false;
const output=new Writable({write(chunk,_encoding,done){if(!muted)process.stdout.write(chunk);done()}});
const rl=createInterface({input:process.stdin,output,terminal:true});
try{
 const username=(process.argv[2]||await rl.question('Username: ')).trim().toLowerCase();
 if(!/^[a-z0-9_]{3,24}$/.test(username))throw new Error('Username: a-z, 0-9, _ (3-24 characters)');
 const answer=rl.question('Password (hidden, at least 8 characters): ');
 muted=true;
 const password=await answer;muted=false;process.stdout.write('\n');
 if(password.length<8)throw new Error('Password must be at least 8 characters');
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {error}=await client.auth.admin.createUser({email:username+'@players.example.com',password,email_confirm:true,user_metadata:{username}});
 if(error)throw new Error('Create account failed: '+error.message);
 console.log('Created player: '+username);
}catch(e){console.error(e.message);process.exitCode=1}finally{muted=false;rl.close()}
