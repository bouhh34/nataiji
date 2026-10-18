import test from 'node:test';
import assert from 'node:assert/strict';
import {DIRECTOR_REGISTER_TYPES,initializeDirectorSchema,registerDirectorRoutes} from '../src/director-workspace.js';

function setup(pool) {
 const endpoints = new Map();
 const app = {};
 for (const verb of ['get','post','put','patch','delete']) {
  app[verb]=(path,...handlers)=>{endpoints.set(verb.toUpperCase()+' '+path,handlers);};
 }
 registerDirectorRoutes(app,{auth:(_req,_res,next)=>next(),getPool:()=>pool});
 return endpoints;
}
async function invoke(handlers,req) {
 let status=200,body=null;
 const res={status(n){status=n;return this;},json(value){body=value;return this;}};
 for (const fn of handlers) {
  let nextCalled=false;
  const done=()=>{nextCalled=true;};
  await fn(req,res,done);
  if(!nextCalled)break;
 }
 return {status,body};
}
test('director has exactly fourteen register types and no duplicates',()=>{
 assert.equal(DIRECTOR_REGISTER_TYPES.length,14);
 assert.equal(new Set(DIRECTOR_REGISTER_TYPES).size,14);
 assert.ok(DIRECTOR_REGISTER_TYPES.includes('student_health'));
 assert.ok(DIRECTOR_REGISTER_TYPES.includes('correspondence'));
});
test('director migration establishes isolated institutions and scoped registers',async()=>{
 const statements=[];
 await initializeDirectorSchema({query:async sql=>{statements.push(sql);return {rows:[]};}});
 assert.ok(statements.some(s=>s.includes('nataiji_director_institutions')));
 assert.ok(statements.some(s=>s.includes('nataiji_director_members')));
 assert.ok(statements.some(s=>s.includes('nataiji_director_registers')));
 assert.ok(statements.some(s=>s.includes('UNIQUE(school_id,request_id)')));
 assert.ok(statements.some(s=>s.includes('UNIQUE(school_id,school_year,register_no)')));
});
test('school information is blocked for teachers and professors',async()=>{
 let queries=0;
 const routes=setup({query:async()=>{queries++;return {rows:[]};}});
 for(const profileType of ['teacher','professor','']){
  const r=await invoke(routes.get('GET /api/director/overview'),{user:{id:'u1',schoolId:'school-1',profileType}});
  assert.equal(r.status,403);assert.equal(r.body.error,'director_only');
 }
 assert.equal(queries,0);
});
test('director reads own institution only by verified session identity',async()=>{
 const queries=[];
 const pool={query:async(sql,args)=>{queries.push({sql,args});return {rows:[]};}};
 const routes=setup(pool);
 const r=await invoke(routes.get('GET /api/director/overview'),{user:{id:'director-1',schoolId:'school-1',profileType:'director'}});
 assert.equal(r.status,200);assert.equal(r.body.institution,null);
 assert.deepEqual(queries[0].args,['school-1','director-1']);
});
test('invitation cannot be accepted by director account',async()=>{
 const routes=setup({query:async()=>{throw Error('unexpected SQL');}});
 const r=await invoke(routes.get('POST /api/director/invites/accept'),{user:{id:'u1',profileType:'director'},body:{code:'A'.repeat(18)}});
 assert.equal(r.status,403);
});
test('unknown register types are rejected before any mutation',async()=>{
 const pool={query:async()=>({rows:[{school_id:'school-1',academic_year:'2026-2027'}]})};
 const routes=setup(pool);
 const r=await invoke(routes.get('POST /api/director/registers'),{user:{id:'director-1',schoolId:'school-1',profileType:'director'},body:{type:'unknown',subject:'Test',date:'2026-10-18',requestId:'56bafead-45e0-4c58-a22e-a87b7c5c778',details:{}}});
 assert.equal(r.status,400);
 assert.equal(r.body.error,'invalid_register');
});
