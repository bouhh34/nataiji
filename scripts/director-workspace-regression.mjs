import test from 'node:test';
import assert from 'node:assert/strict';
import {DIRECTOR_REGISTER_CATEGORIES,mountDirectorRoutes} from '../src/director-workspace.js';

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
 const h=harness({id:'director-a',role:'director',profileType:'director',schoolId:'school-a'});
 const r=await h.request('GET','/api/director/institution');
 assert.equal(r.status,200);assert.equal(r.body.institution.id,'school-a');
 const cat=await h.request('GET','/api/director/catalog');
 assert.equal(cat.body.registers.find(x=>x.id==='student-health').enabled,false);
});
test('health records reject generic unencrypted write path',async()=>{
 const h=harness({id:'director-a',role:'director',profileType:'director',schoolId:'school-a'},{
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
