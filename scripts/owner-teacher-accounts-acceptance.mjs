import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {Pool} from 'pg';
if(!process.env.DATABASE_URL)throw Error('Use an isolated DATABASE_URL for this acceptance test');
const port=3248,base=`http://127.0.0.1:${port}`,password='TeacherQA-9021',db=new Pool({connectionString:process.env.DATABASE_URL});
const server=spawn(process.execPath,['src/server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,NODE_ENV:'development',PORT:String(port),REDIS_URL:'',SUPER_ADMIN_EMAIL:'teacher.qa.owner@example.com'},stdio:['ignore','pipe','pipe']});
let output='';server.stdout.on('data',c=>output+=c);server.stderr.on('data',c=>output+=c);
function client(){let cookie='';return{async req(path,{method='GET',body,expected=200}={}){const headers={Accept:'application/json'};if(cookie)headers.Cookie=cookie;if(body)headers['Content-Type']='application/json';const r=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined});const d=await r.json();if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(d)}`);return d}}}
const rawUser=async id=>JSON.parse((await db.query('SELECT value FROM kv_store WHERE key=$1',['nataiji:user:'+id])).rows[0].value);
const setUser=async u=>db.query('UPDATE kv_store SET value=$2 WHERE key=$1',['nataiji:user:'+u.id,JSON.stringify(u)]);
const register=async(c,name)=> (await c.req('/api/auth/register',{method:'POST',expected:201,body:{name,email:`teacher.qa.${name}@example.com`,password,school:'École '+name}})).user;
const login=async(c,u,p=password,expected=200)=>c.req('/api/auth/login',{method:'POST',body:{email:u.email,password:p},expected});
try{
 for(let i=0;i<80;i++){if(server.exitCode!==null)throw Error(output);try{if((await fetch(base+'/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,150))}
 assert.equal((await(await fetch(base+'/health')).json()).storage,'postgres',output);
 const owner=client(),a=client(),b=client(),legacy=client(),prof=client();
 const ou=await register(owner,'owner'),au=await register(a,'alice'),bu=await register(b,'bob'),lu=await register(legacy,'legacy'),pu=await register(prof,'professor');
 await a.req('/api/account/profile-type',{method:'POST',body:{type:'teacher'}});
 await b.req('/api/account/profile-type',{method:'POST',body:{type:'teacher'}});
 await prof.req('/api/account/profile-type',{method:'POST',body:{type:'professor'}});
 await a.req('/api/structure',{method:'PUT',body:{structure:{classes:[{id:'a1',name:'1AF'},{id:'a2',name:'2AF'}],terms:['T1'],activeClassId:'a1',term:'T1'}}});
 await a.req('/api/pupils',{method:'POST',expected:201,body:{classId:'a1',pupil:['','Preserved Student','','','','Student','','']}});
 const second=await a.req('/api/schools',{method:'POST',expected:201,body:{name:'École Alice 2'}});
 await a.req('/api/schools/switch',{method:'POST',body:{schoolId:au.schoolId}});
 for(const cls of ['a1','a2']){const inv=await a.req('/api/invites',{method:'POST',expected:201,body:{teacherName:'Bob Assigned',permissions:['pupils'],classAccess:{[cls]:{fullClass:true}}}});await b.req('/api/access/attach',{method:'POST',body:{code:inv.code}})}
 // Legacy invited teachers still appear, even with no owned school or active grant.
 const old=await rawUser(lu.id);old.role=old.baseRole='teacher';old.schoolId=au.schoolId;old.ownedSchoolIds=[];old.classIds=['a1'];old.needsProfileChoice=false;await setUser(old);await login(legacy,lu);
 const before=await rawUser(au.id),otherBefore=await rawUser(bu.id);
 // Multiple index aliases must not double count an account or its schools.
 const idx=JSON.parse((await db.query("SELECT value FROM kv_store WHERE key='nataiji:users:index'")).rows[0].value);idx['teacher.qa.alias@example.com']=au.id;await db.query("UPDATE kv_store SET value=$1 WHERE key='nataiji:users:index'",[JSON.stringify(idx)]);
 const staff=await owner.req('/api/owner/staff'),overview=await owner.req('/api/owner/overview');
 assert.equal(staff.teachers.length,3);assert.equal(overview.stats.teachers,3);assert.equal(overview.stats.users,5);assert.equal(overview.stats.schools,4);
 assert.equal(staff.professors.length,1);assert.ok(!staff.teachers.some(t=>t.id===ou.id||t.id===pu.id));
 assert.equal(staff.teachers.filter(t=>t.id===bu.id).length,1);assert.equal(staff.teachers.find(t=>t.id===au.id).schoolCount,2);assert.equal(staff.teachers.find(t=>t.id===au.id).classCount,2);
 assert.ok(staff.teachers.find(t=>t.id===au.id).schoolName.includes('École Alice 2'));
 assert.deepEqual(await rawUser(au.id),before);assert.deepEqual(await rawUser(bu.id),otherBefore);
 await a.req('/api/owner/staff',{expected:403});await a.req('/api/owner/accounts/'+bu.id+'/action',{method:'POST',expected:403,body:{action:'suspend'}});await a.req('/api/owner/accounts/'+bu.id+'/deletion-preview',{expected:403});await a.req('/api/owner/accounts/'+bu.id,{method:'DELETE',expected:403,body:{confirm:'DELETE'}});
 const action=async(id,action)=>owner.req('/api/owner/accounts/'+id+'/action',{method:'POST',body:{action}});
 const dataBefore=await a.req('/api/structure');
 await action(au.id,'suspend');assert.ok((await owner.req('/api/owner/staff')).teachers.find(t=>t.id===au.id).suspended);
 await a.req('/api/structure',{expected:403});await login(client(),au,password,403);
 assert.deepEqual({...await rawUser(au.id),suspended:undefined,sessionVersion:undefined},{...before,suspended:undefined,sessionVersion:undefined});
 const code=await action(au.id,'reset_code');assert.equal(code.expiresInMinutes,30);
 const recovered='TeacherRecovered-9021';await client().req('/api/auth/reset-with-code',{method:'POST',body:{code:code.code,password:recovered}});
 await client().req('/api/auth/reset-with-code',{method:'POST',expected:400,body:{code:code.code,password:recovered}});
 await login(client(),au,recovered,403);await action(au.id,'activate');await login(a,au,recovered);assert.deepEqual(await a.req('/api/structure'),dataBefore);
 // Guard is enforced by DELETE itself, including an outdated successful preview.
 const preview=await owner.req('/api/owner/accounts/'+au.id+'/deletion-preview');assert.equal(preview.canDelete,false);
 await owner.req('/api/owner/accounts/'+au.id,{method:'DELETE',expected:409,body:{confirm:'DELETE'}});
 assert.deepEqual(await a.req('/api/structure'),dataBefore);
 const bobPreview=await owner.req('/api/owner/accounts/'+bu.id+'/deletion-preview');assert.ok(bobPreview.canDelete);assert.deepEqual(bobPreview.schools.map(s=>s.schoolId),[bu.schoolId]);
 const legacyOriginal=await rawUser(lu.id);await setUser({...legacyOriginal,schoolId:bu.schoolId});
 await owner.req('/api/owner/accounts/'+bu.id,{method:'DELETE',expected:409,body:{confirm:'DELETE'}});
 await setUser(legacyOriginal);
 await owner.req('/api/owner/accounts/'+bu.id,{method:'DELETE',expected:400,body:{}});assert.ok(await rawUser(bu.id));
 const professorBefore=await rawUser(pu.id),aliceBeforeDelete=await rawUser(au.id);
 await owner.req('/api/owner/accounts/'+bu.id,{method:'DELETE',body:{confirm:'DELETE'}});await b.req('/api/structure',{expected:401});
 assert.deepEqual(await rawUser(au.id),aliceBeforeDelete);assert.deepEqual(await rawUser(pu.id),professorBefore);assert.deepEqual(await a.req('/api/structure'),dataBefore);
 assert.equal((await db.query('SELECT 1 FROM nataiji_school_settings WHERE school_id=$1',[bu.schoolId])).rowCount,0);
 const legacyPreview=await owner.req('/api/owner/accounts/'+lu.id+'/deletion-preview');assert.ok(legacyPreview.canDelete);assert.equal(legacyPreview.schools.length,0);
 await owner.req('/api/owner/accounts/'+lu.id,{method:'DELETE',body:{confirm:'DELETE'}});assert.deepEqual(await a.req('/api/structure'),dataBefore);
 assert.ok((await owner.req('/api/owner/accounts/'+au.id+'/deletion-preview')).canDelete,'Deleted recipients must not block school owner forever');
 assert.equal((await owner.req('/api/owner/overview')).stats.teachers,1);
 // Phone-only registrations must be discoverable and manageable by the owner.
 const phoneTeacher=client(),phoneProfessor=client();
 const phoneTeacherUser=(await phoneTeacher.req('/api/auth/register',{method:'POST',expected:201,body:{name:'Phone teacher',identifier:'44112233',password}})).user;
 const phoneProfessorUser=(await phoneProfessor.req('/api/auth/register',{method:'POST',expected:201,body:{name:'Phone professor',identifier:'44112234',password}})).user;
 await phoneTeacher.req('/api/account/profile-type',{method:'POST',body:{type:'teacher'}});
 await phoneProfessor.req('/api/account/profile-type',{method:'POST',body:{type:'professor'}});
 await login(client(),{email:'44112233'},password);
 const phoneStaff=await owner.req('/api/owner/staff'),phoneOverview=await owner.req('/api/owner/overview');
 assert.equal(phoneStaff.teachers.find(u=>u.id===phoneTeacherUser.id)?.phone,'44112233');
 assert.equal(phoneStaff.professors.find(u=>u.id===phoneProfessorUser.id)?.phone,'44112234');
 assert.equal(phoneOverview.accounts.find(u=>u.id===phoneTeacherUser.id)?.phone,'44112233');
 assert.equal(phoneOverview.accounts.find(u=>u.id===phoneProfessorUser.id)?.phone,'44112234');
 assert.equal(phoneOverview.accounts.find(u=>u.id===phoneTeacherUser.id)?.email,'');
 assert.equal(phoneOverview.stats.users,5,'Two phone accounts should be counted along with owner, teacher and professor');
 const phoneDetail=await owner.req('/api/owner/professors/'+phoneProfessorUser.id);
 assert.equal(phoneDetail.professor.account.phone,'44112234');
 assert.equal((await owner.req('/api/owner/accounts/'+phoneTeacherUser.id+'/deletion-preview')).account.phone,'44112233');
 // A legacy account whose sign-in index is missing must still be visible for owner review.
 const updatedIndex=JSON.parse((await db.query("SELECT value FROM kv_store WHERE key='nataiji:users:index'")).rows[0].value);
 delete updatedIndex['phone:44112233'];
 await db.query("UPDATE kv_store SET value=$1 WHERE key='nataiji:users:index'",[JSON.stringify(updatedIndex)]);
 const orphanStaff=await owner.req('/api/owner/staff'),orphanOverview=await owner.req('/api/owner/overview');
 assert.ok(orphanStaff.teachers.some(u=>u.id===phoneTeacherUser.id),'Owner must find canonical phone accounts even if an alias is missing');
 assert.ok(orphanOverview.accounts.some(u=>u.id===phoneTeacherUser.id),'Owner overview must not depend solely on email/phone index');
 await owner.req('/api/owner/accounts/'+ou.id+'/action',{method:'POST',expected:403,body:{action:'suspend'}});
 console.log('Teacher account management acceptance passed: unique accounts, legacy and independent teachers, scopes, recovery, suspension, reactivation, deletion confirmation and school isolation');
}finally{server.kill('SIGTERM');await db.end()}
