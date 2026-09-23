import {spawn} from 'node:child_process';

const port=3228;
const base=`http://127.0.0.1:${port}`;
const ownerEmail='owner.staff@example.com';
const password='OwnerStaff-9021';
const server=spawn(process.execPath,['--import','./src/gmail-mail-bridge.js','src/server.js'],{
  cwd:new URL('..',import.meta.url),
  env:{...process.env,NODE_ENV:'development',PORT:String(port),REDIS_URL:'',SUPER_ADMIN_EMAIL:ownerEmail,SUPER_ADMIN_NAME:'Staff Owner'},
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
 for(let i=0;i<50;i++){if(server.exitCode!==null)throw new Error('server exited\n'+output);try{const r=await fetch(base+'/health');if(r.ok){ready=true;break}}catch{}await wait(250)}
 if(!ready)throw new Error('server not ready\n'+output);

 const owner=client(),prof=client();
 const ownerReg=await owner.req('/api/auth/register',{method:'POST',body:{name:'Owner',email:ownerEmail,password,school:'Owner School'},expected:201});
 if(!ownerReg.user?.isSuperAdmin)throw new Error('super admin registration failed');

 const preg=await prof.req('/api/auth/register',{method:'POST',body:{name:'Professor Managed',email:'managed.professor@example.com',password:'Professor-9021',school:''},expected:201});
 await prof.req('/api/account/profile-type',{method:'POST',body:{type:'professor'}});
 const professorId=preg.user.id;
 const profile={schoolName:'Lycée Managed',year:'2026-2027',classes:[{id:'c1',name:'2AS-A',levelCode:'2AS',branchCode:'',students:[{id:'s1',name:'Student One',nns:'1001'}],sharedClassId:''}],assignments:[{id:'a1',subject:'الرياضيات',classId:'c1',subjectKey:'math',coefficient:6,coefficientSource:'official'}],marks:{a1:{s1:{test1:'12',exam1:'14',test2:'',exam2:'',test3:'',exam3:''}}}};
 await prof.req('/api/professor/profile',{method:'PUT',body:{profile}});

 const staff=await owner.req('/api/owner/staff');
 if(!staff.professors.some(x=>x.id===professorId&&x.classCount===1&&x.assignmentCount===1))throw new Error('professor missing from educational staff');

 const detail=await owner.req('/api/owner/professors/'+professorId);
 if(detail.professor.assignments[0]?.hasGrades!==true)throw new Error('assignment grade safety flag missing');
 if('marks' in detail.professor)throw new Error('raw marks exposed to super admin');

 await owner.req('/api/owner/professors/'+professorId+'/assignments/a1',{method:'DELETE',body:{confirm:'REMOVE_ASSIGNMENT'},expected:409});

 const classCreate=await owner.req('/api/owner/professors/'+professorId+'/classes',{method:'POST',body:{name:'2AS-B',levelCode:'2AS'},expected:201});
 const newClass=classCreate.professor.classes.find(x=>x.name==='2AS-B');if(!newClass)throw new Error('admin class creation failed');

 const add=await owner.req('/api/owner/professors/'+professorId+'/assignments',{method:'POST',body:{classId:newClass.id,subjectKey:'physical_sciences'},expected:201});
 const phys=add.professor.assignments.find(x=>x.classId===newClass.id&&x.subjectKey==='physical_sciences');
 if(!phys||phys.coefficient!==1||phys.coefficientSource!=='official')throw new Error('official professor coefficient not enforced');

 await owner.req('/api/owner/professors/'+professorId+'/assignments/'+phys.id,{method:'DELETE',body:{confirm:'REMOVE_ASSIGNMENT'}});
 await owner.req('/api/owner/professors/'+professorId+'/classes/'+newClass.id,{method:'DELETE',body:{confirm:'REMOVE_EMPTY_CLASS'}});
 await owner.req('/api/owner/professors/'+professorId+'/classes/c1',{method:'DELETE',body:{confirm:'REMOVE_EMPTY_CLASS'},expected:409});

 await owner.req('/api/owner/accounts/'+professorId+'/action',{method:'POST',body:{action:'suspend'}});
 const suspended=await owner.req('/api/owner/staff');
 if(!suspended.professors.find(x=>x.id===professorId)?.suspended)throw new Error('professor suspend status not reflected');
 await owner.req('/api/owner/accounts/'+professorId+'/action',{method:'POST',body:{action:'activate'}});

 console.log('Owner educational staff acceptance passed');
}finally{
 server.kill('SIGTERM');
}
