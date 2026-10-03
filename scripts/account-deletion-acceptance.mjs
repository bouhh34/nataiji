import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {Pool} from 'pg';

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
const port=3230,base=`http://127.0.0.1:${port}`,password='DeletionQA-9021';
const db=new Pool({connectionString:process.env.DATABASE_URL});
const server=spawn(process.execPath,['--import','./src/gmail-mail-bridge.js','src/server.js'],{
 cwd:new URL('..',import.meta.url),
 env:{...process.env,NODE_ENV:'development',PORT:String(port),REDIS_URL:'',SUPER_ADMIN_EMAIL:'deletion.admin@example.com'},
 stdio:['ignore','pipe','pipe']
});
let output='';server.stdout.on('data',c=>output+=c);server.stderr.on('data',c=>output+=c);
function client(){
 let cookie='';
 return {async req(path,{method='GET',body,expected=200}={}){
  const headers={Accept:'application/json'};
  if(cookie)headers.Cookie=cookie;
  if(body!==undefined)headers['Content-Type']='application/json';
  const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  // Keep the original session after deletion to verify it can no longer access data.
  if(method!=='DELETE'&&r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
  const data=await r.json();
  assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(data)}`);
  return data;
 }};
}
async function register(c,name){
 const r=await c.req('/api/auth/register',{method:'POST',expected:201,body:{name,email:`deletion.${name}@example.com`,password}});
 await c.req('/api/account/profile-type',{method:'POST',body:{type:'professor'}});
 return r.user.id;
}
async function retainedCounts(id){
 const counts=[];
 for(const table of ['nataiji_professor_profiles','nataiji_professor_profile_versions','nataiji_professor_grade_history','nataiji_professor_class_members']){
  counts.push(Number((await db.query(`SELECT count(*)::int AS n FROM ${table} WHERE user_id=$1`,[id])).rows[0].n));
 }
 return counts;
}
try{
 let ready=false;
 for(let i=0;i<50;i++){
  if(server.exitCode!==null)throw new Error(output);
  try{const r=await fetch(base+'/health');if(r.ok&&(await r.json()).storage==='postgres'){ready=true;break}}catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 assert.ok(ready,'PostgreSQL server did not start: '+output);
 const owner=client(),member=client();
 const ownerId=await register(owner,'owner'),memberId=await register(member,'member');
 const profile={classes:[{id:'delete-class',name:'2AS-A',levelCode:'2AS',students:[{id:'p1',name:'Deletion Student'}]}],assignments:[{id:'math',classId:'delete-class',subject:'الرياضيات',subjectKey:'math'}],marks:{}};
 await owner.req('/api/professor/profile',{method:'PUT',body:{profile}});
 await owner.req('/api/professor/assignments/math/grades',{method:'PUT',body:{term:1,rows:[{studentId:'p1',test:'12',exam:'14'}]}});
 const shared=await owner.req('/api/professor/classes/delete-class/share',{method:'POST',expected:201,body:{}});
 const joined=await member.req('/api/professor/classes/join',{method:'POST',body:{code:shared.code}});
 const memberProfile=joined.profile;
 memberProfile.assignments.push({id:'french',classId:joined.localClassId,subject:'اللغة الفرنسية',subjectKey:'french'});
 await member.req('/api/professor/profile',{method:'PUT',body:{profile:memberProfile}});
 await member.req('/api/professor/assignments/french/grades',{method:'PUT',body:{term:1,rows:[{studentId:'p1',test:'16',exam:'18'}]}});
 const before=await retainedCounts(ownerId),memberBefore=await retainedCounts(memberId);
 assert.ok(before.every(n=>n>0),'Fixture must include saved profile, versions, grade history and membership');
 await owner.req('/api/account',{method:'DELETE',expected:401,body:{password:'wrong-password',confirm:'DELETE'}});
 assert.deepEqual(await retainedCounts(ownerId),before,'Bad password must preserve all records');
 await owner.req('/api/account',{method:'DELETE',body:{password,confirm:'DELETE'}});
 assert.deepEqual(await retainedCounts(ownerId),[0,0,0,0],'Deletion must remove account-owned professor data and recovery history');
 assert.deepEqual(await retainedCounts(memberId),memberBefore,'Deletion must preserve the other professor records');
 assert.equal((await db.query('SELECT value FROM kv_store WHERE key=$1',['nataiji:user:'+ownerId])).rowCount,0);
 const room=await db.query('SELECT owner_user_id,data FROM nataiji_professor_classrooms WHERE class_id=$1',[shared.sharedClassId]);
 assert.equal(room.rows[0].owner_user_id,memberId,'Shared class must transfer to its remaining member');
 assert.equal(room.rows[0].data.students[0].id,'p1','Shared roster must remain intact');
 const remaining=(await member.req('/api/professor/profile')).profile;
 assert.equal(remaining.marks.french.p1.terms['1'].exam,'18','Other professor grades must remain accessible');
 await owner.req('/api/professor/profile',{expected:401});
 await member.req('/api/account',{method:'DELETE',body:{password,confirm:'DELETE'}});
 assert.equal((await db.query('SELECT 1 FROM nataiji_professor_classrooms WHERE class_id=$1',[shared.sharedClassId])).rowCount,0,'Last member deletion must remove its orphaned shared class');
 console.log('Account deletion privacy and shared-class isolation acceptance passed');
}finally{
 server.kill('SIGTERM');
 await db.end();
}
