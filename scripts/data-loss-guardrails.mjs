import {spawn} from 'node:child_process';
import pg from 'pg';

const {Pool}=pg;
const port=3226;
const base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['--import','./src/gmail-mail-bridge.js','src/server.js'],{
  cwd:new URL('..',import.meta.url),
  env:{...process.env,NODE_ENV:'development',PORT:String(port),REDIS_URL:'',SUPER_ADMIN_EMAIL:'owner.guardrail@example.com',SUPER_ADMIN_NAME:'Guardrail Owner'},
  stdio:['ignore','pipe','pipe']
});
let output='';server.stdout.on('data',c=>output+=c);server.stderr.on('data',c=>output+=c);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function client(){
 let cookie='';
 return {async req(path,{method='GET',body,expected=200}={}){
  const headers={Accept:'application/json'};if(body!==undefined)headers['Content-Type']='application/json';if(cookie)headers.Cookie=cookie;
  const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const set=r.headers.get('set-cookie');if(set?.startsWith('nataiji_session='))cookie=set.split(';')[0];
  let data={};try{data=await r.json()}catch{}
  if(r.status!==expected)throw new Error(`${method} ${path} -> ${r.status}; expected ${expected}: ${JSON.stringify(data)}`);
  return data;
 }}
}
try{
 let ready=false;
 for(let i=0;i<40;i++){if(server.exitCode!==null)throw new Error('server exited\n'+output);try{const r=await fetch(base+'/health');if(r.ok){ready=true;break}}catch{}await wait(250)}
 if(!ready)throw new Error('server not ready\n'+output);

 const protectedAccount=client();
 await protectedAccount.req('/api/auth/register',{method:'POST',body:{name:'Protected Admin',email:'protected.admin@example.com',password:'AdminPass-9021',school:'Protected school'},expected:201});
 await protectedAccount.req('/api/structure',{method:'PUT',body:{structure:{classes:[{id:'class-safe',name:'قسم محفوظ',nameFr:'Classe protégée',code:'1AF'}],terms:['الفصل الأول','الفصل الثاني','الفصل الثالث'],activeClassId:'class-safe',term:'الفصل الأول'}}});
 await protectedAccount.req('/api/account/profile-type',{method:'POST',body:{type:'professor'},expected:409});
 const stillThere=await protectedAccount.req('/api/state');
 if(stillThere.state?.classes?.[0]?.id!=='class-safe')throw new Error('profile conversion removed school structure');

 const professor=client();
 const reg=await professor.req('/api/auth/register',{method:'POST',body:{name:'Professor Guard',email:'professor.guard@example.com',password:'ProfessorPass-9021',school:''},expected:201});
 await professor.req('/api/account/profile-type',{method:'POST',body:{type:'professor'}});
 const userId=reg.user.id;
 const profile1={schoolName:'Lycée Test',year:'2026-2027',classes:[{id:'c1',name:'2AS A',students:[{id:'s1',name:'Élève 1',nns:'1001'}]}],assignments:[{id:'a1',subject:'Mathématiques',classId:'c1',coefficient:3}],marks:{a1:{s1:{test1:'10',exam1:'12',test2:'14',exam2:'13',test3:'16',exam3:'15'}}}};
 await professor.req('/api/professor/profile',{method:'PUT',body:{profile:profile1}});
 const profile2=structuredClone(profile1);profile2.marks.a1.s1.exam3='17';
 await professor.req('/api/professor/profile',{method:'PUT',body:{profile:profile2}});
 const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:false});
 const versions=await pool.query('SELECT count(*)::int AS n FROM nataiji_professor_profile_versions WHERE user_id=$1',[userId]);
 await pool.end();
 if(Number(versions.rows[0]?.n||0)<1)throw new Error('professor profile version was not preserved');

 console.log('Data-loss guardrails acceptance passed');
}finally{
 server.kill('SIGTERM');
}
