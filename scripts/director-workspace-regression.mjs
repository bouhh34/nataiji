import test from 'node:test';
import assert from 'node:assert/strict';
import {DIRECTOR_REGISTER_CATEGORIES,mountDirectorRoutes,validRegisterDetails} from '../src/director-workspace.js';

function harness(user,body={},query={},poolOverride){
 const routes=new Map();
 const app={get:(path,...h)=>routes.set('GET '+path,h),post:(path,...h)=>routes.set('POST '+path,h),patch:(path,...h)=>routes.set('PATCH '+path,h),delete:(path,...h)=>routes.set('DELETE '+path,h)};
 const institution={id:'school-a',director_user_id:'director-a',name:'Test School',level:'primary',academic_year:'2026-2027'};
 const calls=[];
 const pool=poolOverride||{async query(sql,params){calls.push({sql,params});if(sql.includes('FROM nataiji_director_institutions WHERE director_user_id'))return {rows:[institution],rowCount:1};return {rows:[],rowCount:0}}};
 mountDirectorRoutes(app,{auth:(_req,_res,next)=>next(),getPool:()=>pool});
 async function request(method,path){
  const handlers=routes.get(method+' '+path);assert.ok(handlers,'missing route '+method+' '+path);
  return new Promise((resolve,reject)=>{
   let i=0,done=false;
   const res={statusCode:200,status(code){this.statusCode=code;return this},json(data){done=true;resolve({status:this.statusCode,body:data,calls});return this}};
   const req={user,body,query,params:{}};
   const next=(error)=>{if(error){if(!done){done=true;reject(error)}return}const fn=handlers[i++];if(!fn){if(!done){done=true;reject(Error('No response'))}return}try{Promise.resolve(fn(req,res,next)).catch(next)}catch(err){next(err)}};
   next();
  });
 }
 return {request,calls};
}
test('director catalog has exactly the fourteen requested categories',()=>{
 assert.equal(DIRECTOR_REGISTER_CATEGORIES.length,14);
 assert.equal(new Set(DIRECTOR_REGISTER_CATEGORIES).size,14);
 assert.ok(DIRECTOR_REGISTER_CATEGORIES.includes('teacher-health'));
 assert.ok(DIRECTOR_REGISTER_CATEGORIES.includes('student-health'));
});
test('a teacher cannot query director catalog',async()=>{
 const h=harness({id:'teacher-a',role:'teacher',profileType:'teacher',schoolId:'school-a'});
 const r=await h.request('GET','/api/director/catalog');
 assert.equal(r.status,403);
});
test('director can view their institution and records catalog',async()=>{
 const h=harness({id:'director-a',role:'admin',profileType:'director',schoolId:'school-a'});
 const r=await h.request('GET','/api/director/institution');
 assert.equal(r.status,200);assert.equal(r.body.institution.id,'school-a');
 const cat=await h.request('GET','/api/director/catalog');
 assert.equal(cat.body.registers.find(x=>x.id==='student-health').enabled,false);
});
test('health records reject generic unencrypted write path',async()=>{
 const h=harness({id:'director-a',role:'admin',profileType:'director',schoolId:'school-a'},{
  category:'student-health',subject:'Private',recordDate:'2026-10-18',details:{notes:'sensitive'}
 });
 const r=await h.request('POST','/api/director/registers');
 assert.equal(r.status,403);assert.equal(r.body.error,'sensitive_register_not_enabled');
 assert.equal(h.calls.filter(c=>c.sql.includes('INSERT INTO nataiji_director_registers')).length,0);
});
test('other accounts cannot request director records',async()=>{
 const h=harness({id:'professor-x',role:'professor',profileType:'professor',schoolId:'another-school'});
 const r=await h.request('GET','/api/director/registers');
 assert.equal(r.status,403);assert.equal(h.calls.length,0);
});

test('health registers also reject direct list requests',async()=>{
 const h=harness({id:'director-a',role:'admin',profileType:'director',schoolId:'school-a'}, {},{category:'student-health'});
 const r=await h.request('GET','/api/director/registers');
 assert.equal(r.status,403);
 assert.equal(r.body.error,'sensitive_register_not_enabled');
});
test('roster reads only the requesting director institution and omits grades',async()=>{
 const queries=[];
 const pool={async query(sql,params){
  queries.push([sql,params]);
  if(sql.includes('FROM nataiji_director_institutions WHERE director_user_id'))return {rowCount:1,rows:[{id:'school-a',director_user_id:'director-a'}]};
  if(sql.includes('FROM nataiji_structure'))return {rowCount:1,rows:[{data:{classes:[{id:'A',name:'1AF'}]}}]};
  if(sql.includes('FROM nataiji_pupils'))return {rowCount:1,rows:[{class_id:'A',nns:'pupil-key',data:['nns','Test Student', 'other personal data']}]};
  return {rowCount:0,rows:[]}
 }};
 const h=harness({id:'director-a',role:'admin',profileType:'director',schoolId:'school-a'}, {},{},pool);
 const r=await h.request('GET','/api/director/roster');
 assert.equal(r.status,200);
 assert.deepEqual(r.body.students,[{studentKey:'pupil-key',name:'Test Student',classId:'A',className:'1AF'}]);
 assert.equal(r.body.students[0].marks,undefined);
 assert.ok(queries.filter(([sql])=>sql.includes('FROM nataiji_pupils')).every(([,params])=>params[0]==='school-a'));
});
test('reject forged pupil references before any register write',async()=>{
 const h=harness({id:'director-a',role:'admin',profileType:'director',schoolId:'school-a'},{
  category:'student-absence',subject:'Absence',recordDate:'2026-10-18',details:{studentRef:{studentKey:'foreign',classId:'X'}}
 });
 const r=await h.request('POST','/api/director/registers');
 assert.equal(r.status,400);
 assert.equal(r.body.error,'student_link_not_found');
 assert.ok(!h.calls.some(c=>c.sql.includes('INSERT INTO nataiji_director_registers')));
});

const collectiveDetails={kind:'staff-attendance-v1',staff:[{key:'manual:a',name:'محمد',status:'present',time:'08:00',notes:''},{key:'manual:b',name:'فاطمة',status:'absent',time:'',notes:'إجازة'}]};
test('collective attendance validates every teacher and rejects incomplete or duplicate rows',()=>{
 assert.equal(validRegisterDetails(collectiveDetails),true);
 for(const change of [{status:''},{time:'29:99'},{name:' '},{notes:'x'.repeat(301)}])assert.equal(validRegisterDetails({...collectiveDetails,staff:[{...collectiveDetails.staff[0],...change}]}),false);
 assert.equal(validRegisterDetails({...collectiveDetails,staff:[collectiveDetails.staff[0],collectiveDetails.staff[0]]}),false);
 assert.equal(validRegisterDetails({...collectiveDetails,staff:[]}),false);
 assert.equal(validRegisterDetails({notes:'x'.repeat(8001)}),false);
 const large=Array.from({length:200},(_,i)=>({...collectiveDetails.staff[0],key:'manual:'+i,notes:'ن'.repeat(300)}));
 assert.equal(validRegisterDetails({...collectiveDetails,staff:large}),true);
 assert.equal(validRegisterDetails({...collectiveDetails,staff:[...large,{...large[0],key:'extra'}]}),false);
});
test('daily attendance lookup stays scoped to institution and selected date',async()=>{
 const h=harness({id:'director-a',role:'admin',profileType:'director'}, {},{category:'daily-attendance',recordDate:'2026-10-20'});
 const r=await h.request('GET','/api/director/registers');assert.equal(r.status,200);
 const call=h.calls.find(c=>c.sql.includes('FROM nataiji_director_registers'));
 assert.deepEqual(call.params,['school-a','daily-attendance',30,'2026-10-20']);
});
test('same-day collective saves are idempotent and conflicting second saves do not overwrite',async()=>{
 let saved=null;const institution={id:'school-a',director_user_id:'director-a',academic_year:'2026-2027'};
 const pool={async query(sql,p){
  if(sql.includes('FROM nataiji_director_institutions'))return {rows:[institution],rowCount:1};
  if(sql.startsWith('INSERT INTO nataiji_director_registers')){if(saved)return {rows:[],rowCount:0};assert.equal(p[8],'staff-attendance:2026-10-20');saved={id:p[0],category:p[3],record_date:p[4],reference:p[5],subject:p[6],details:JSON.parse(p[7])};return {rows:[saved],rowCount:1}}
  if(sql.startsWith('SELECT * FROM nataiji_director_registers'))return {rows:[saved],rowCount:1};
  return {rows:[],rowCount:0}
 },async connect(){return {...this,release(){}}}};
 const user={id:'director-a',role:'admin',profileType:'director'};
 const payload={category:'daily-attendance',subject:'Attendance',recordDate:'2026-10-20',details:collectiveDetails,clientMutationId:'arbitrary'};
 assert.equal((await harness(user,payload,{},pool).request('POST','/api/director/registers')).status,201);
 assert.equal((await harness(user,{...payload,clientMutationId:'other'}, {},pool).request('POST','/api/director/registers')).status,200);
 assert.equal((await harness(user,{...payload,details:{...collectiveDetails,staff:[{...collectiveDetails.staff[0],status:'late'}]}},{},pool).request('POST','/api/director/registers')).status,409);
 assert.equal(saved.details.staff.length,2);
});

test('register deletion is institution scoped, version checked, audited and soft',async()=>{
 for(const mode of ['ok','missing','stale','health']){
  const calls=[],record={id:'record-a',category:mode==='health'?'teacher-health':'daily-attendance',version:2};
  const pool={async query(sql,p){calls.push({sql,p});
   if(sql.includes('FROM nataiji_director_institutions'))return {rowCount:1,rows:[{id:'school-a',director_user_id:'director-a'}]};
   if(sql.includes('FOR UPDATE')){assert.equal(p[1],'school-a');return {rowCount:mode==='missing'?0:1,rows:mode==='missing'?[]:[record]}}
   return {rowCount:1,rows:[]};
  },async connect(){return {...this,release(){}}}};
  const h=harness({id:'director-a',role:'admin',profileType:'director'},{version:mode==='stale'?1:2},{},pool);
  const r=await h.request('DELETE','/api/director/registers/:id');
  assert.equal(r.status,{ok:200,missing:404,stale:409,health:403}[mode]);
  const updates=calls.filter(c=>c.sql.startsWith('UPDATE nataiji_director_registers'));
  assert.equal(updates.length,mode==='ok'?1:0);
  if(mode==='ok'){
   assert.match(updates[0].sql,/deleted_at=now\(\)/);
   assert.match(updates[0].sql,/client_mutation_id=NULL/);
   assert.ok(calls.some(c=>c.sql.includes('nataiji_director_audit')&&c.p[3]==='delete'));
  }
 }
});
test('teachers cannot delete director registers and deletion requires a version',async()=>{
 assert.equal((await harness({id:'teacher',role:'teacher',profileType:'teacher'},{version:1}).request('DELETE','/api/director/registers/:id')).status,403);
 assert.equal((await harness({id:'director-a',role:'admin',profileType:'director'},{}).request('DELETE','/api/director/registers/:id')).status,400);
});
