import {spawn} from 'node:child_process';

const port=3224;
const base=`http://127.0.0.1:${port}`;
const email='recovery.owner@example.com';
const password='RecoveryPass-9021';
const server=spawn(process.execPath,['--import','./src/gmail-mail-bridge.js','src/server.js'],{
  cwd:new URL('..',import.meta.url),
  env:{...process.env,NODE_ENV:'development',PORT:String(port),SUPER_ADMIN_EMAIL:email,SUPER_ADMIN_NAME:'Recovery Owner',REDIS_URL:''},
  stdio:['ignore','pipe','pipe']
});
let output='';server.stdout.on('data',c=>output+=c);server.stderr.on('data',c=>output+=c);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let cookie='';
async function req(path,{method='GET',body,expected=200}={}){
 const headers={Accept:'application/json'};if(body!==undefined)headers['Content-Type']='application/json';if(cookie)headers.Cookie=cookie;
 const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 const set=r.headers.get('set-cookie');if(set?.startsWith('nataiji_session='))cookie=set.split(';')[0];
 let data={};try{data=await r.json()}catch{}
 if(r.status!==expected)throw new Error(`${method} ${path} -> ${r.status}; expected ${expected}: ${JSON.stringify(data)}`);
 return data;
}
const snapshot={
 teacher:'Recovery Owner',school:'مدرسة الاسترجاع',year:'2026-2027',
 classes:[{id:'class-a',name:'1AF - أ',nameFr:'1AF - A',code:'1AF'}],
 terms:['الفصل الأول','الفصل الثاني','الفصل الثالث'],activeClassId:'class-a',term:'الفصل الأول',
 classData:{'class-a':{
  pupils:[['1001','أحمد','','',null,null,null,'1001'],['1002','مريم','','',null,null,null,'1002']],
  subjects:[['الرياضيات',1,'Mathématiques',20,'math-id'],['اللغة العربية',1,'Langue arabe',20,'arabic-id']],
  marksByTerm:{
   'الفصل الأول':[['14','15'],['16','17']],
   'الفصل الثاني':[['13','14'],['15','16']],
   'الفصل الثالث':[['18','19'],['17','18']]
  }
 }}
};

try{
 let ready=false;
 for(let i=0;i<40;i++){if(server.exitCode!==null)throw new Error('server exited\n'+output);try{const r=await fetch(base+'/health');if(r.ok){ready=true;break}}catch{}await wait(250)}
 if(!ready)throw new Error('server not ready\n'+output);
 const reg=await req('/api/auth/register',{method:'POST',body:{name:'Recovery Owner',email,password,school:''},expected:201});
 if(!reg.user?.isSuperAdmin)throw new Error('owner registration failed');
 const restored=await req('/api/recovery/local-state',{method:'POST',body:{state:snapshot}});
 if(restored?.counts?.classes!==1||restored?.counts?.pupils!==2||restored?.counts?.subjects!==2||restored?.counts?.marks!==12)throw new Error('unexpected recovery counts '+JSON.stringify(restored));
 const state=(await req('/api/state')).state;
 if(state.classes?.length!==1||state.pupils?.length!==2||state.subjects?.length!==2)throw new Error('recovered state shape mismatch');
 if(state.marksByTerm?.['الفصل الثالث']?.[1]?.[1]!=='18')throw new Error('recovered marks mismatch '+JSON.stringify(state.marksByTerm));
 await req('/api/recovery/local-state',{method:'POST',body:{state:snapshot},expected:409});
 console.log('Local recovery acceptance passed');
}finally{
 server.kill('SIGTERM');
}
