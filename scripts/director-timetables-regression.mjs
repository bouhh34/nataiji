import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateTimetableEntries,mountDirectorTimetableRoutes} from '../src/director-timetables.js';
const val=(day,start,end,subject='رياضيات',teacher='محمد')=>({day,start,end,subject,teacher,room:''});
const director={id:'director-a',role:'admin',profileType:'director',schoolId:'school-a'};
const institution={id:'school-a',director_user_id:'director-a',level:'middle',academic_year:'2026-2027'};
const manual='manual:11111111-1111-4111-8111-111111111111';
function harness({user=director,body={},query={},rows=[],pgRows=[],level='middle',classes=[{id:'1',name:'1AS-A'}]}={}){
 const routes=new Map(),queries=[],saved=[];
 const app={get:(p,...handlers)=>routes.set('GET '+p,handlers),put:(p,...handlers)=>routes.set('PUT '+p,handlers)};
 const pool={async query(sql,params){queries.push([sql,params]);if(sql.includes('FROM nataiji_director_institutions'))return{rowCount:1,rows:[{...institution,level}]};if(sql.includes('FROM nataiji_structure'))return{rowCount:1,rows:[{data:{classes}}]};if(sql.includes('FROM nataiji_director_timetables'))return{rowCount:rows.length,rows};throw new Error('unmocked '+sql)},async connect(){return{async query(sql,params){queries.push([sql,params]);if(sql.startsWith('SELECT class_key,class_name,entries,version FROM nataiji_director_timetables'))return{rows:pgRows,rowCount:pgRows.length};if(sql.startsWith('INSERT INTO nataiji_director_timetables')){saved.push(params);return{rowCount:1,rows:[{institution_id:params[0],academic_year:params[1],class_key:params[2],class_name:params[3],entries:JSON.parse(params[4]),version:1,updated_at:'2026-10-18T00:00:00Z'}]}}return{rows:[],rowCount:0}},release(){}}}};
 const professorReads=[];
 mountDirectorTimetableRoutes(app,{auth:(_req,_res,next)=>next(),getPool:()=>pool,getProfessorClasses:async id=>{professorReads.push(id);return[{id:'p-1',name:'3AS A'}]}});
 async function req(method,path,params={}){
  return new Promise((resolve,reject)=>{
   const handlers=routes.get(method+' '+path);if(!handlers)throw new Error('unknown route '+path);
   const request={user,body,query,params},response={statusCode:200,status(code){this.statusCode=code;return this},json(json){resolve({status:this.statusCode,json});return this}};
   let i=0;const next=e=>{if(e)return reject(e);const fn=handlers[i++];if(!fn)return reject(Error('missing response'));try{Promise.resolve(fn(request,response,next)).catch(reject)}catch(error){reject(error)}};next()
  })
 }
 return{req,queries,saved,professorReads};
}
test('class entries reject double-booked periods and malformed times',()=>{
 assert.equal(validateTimetableEntries([val('mon','08:00','10:00'),val('mon','09:00','10:00')]).error,'class_schedule_overlap');
 assert.equal(validateTimetableEntries([val('sun','08:00','09:00')]).error,'invalid_timetable_entry');
 assert.equal(validateTimetableEntries([val('mon','10:00','08:00')]).error,'invalid_timetable_entry');
 assert.equal(validateTimetableEntries([val('mon','08:00','12:30')]).error,'invalid_timetable_entry');
 assert.equal(validateTimetableEntries([val('mon','08:00','10:00'),val('tue','08:00','10:00')]).entries.length,2);
});
test('teachers and professors do not access director timetables',async()=>{
 for(const user of [{id:'x',role:'teacher',profileType:'teacher'}, {id:'y',role:'professor',profileType:'professor'}]){
  const h=harness({user});const r=await h.req('GET','/api/director/timetables');assert.equal(r.status,403);assert.equal(h.queries.length,0)
 }
});
test('read includes only own school and own professor classes and keeps each year isolated',async()=>{
 const h=harness({rows:[{class_key:'school:1',class_name:'1AS-A',academic_year:'2026-2027',entries:[],version:1}]});
 const r=await h.req('GET','/api/director/timetables');
 assert.equal(r.status,200);
 assert.deepEqual(r.json.classes.map(x=>x.classKey).sort(),['professor:p-1','school:1']);
 assert.equal(r.json.timetables.length,1);
 assert.deepEqual(h.professorReads,['director-a']);
 assert.ok(h.queries.filter(([s])=>s.includes('nataiji_director_timetables')).every(([,p])=>p[0]==='school-a'&&p[1]==='2026-2027'));
});
test('forged class keys are rejected before writing',async()=>{
 const h=harness({body:{className:'Other school',expectedVersion:0,entries:[]}});
 const r=await h.req('PUT','/api/director/timetables/:classKey',{classKey:'school:not-owned'});
 assert.equal(r.status,400);assert.equal(r.json.error,'class_not_in_institution');
 assert.equal(h.saved.length,0)
});
test('a timetable must not book the same teacher in two simultaneous classes',async()=>{
 const h=harness({body:{className:'1AS-A',expectedVersion:0,entries:[val('mon','09:00','10:00','فيزياء',' Mohamed ')]},pgRows:[{class_key:manual,class_name:'1AS-B',entries:[val('mon','08:00','10:00','رياضيات','mohamed')],version:1}]});
 const r=await h.req('PUT','/api/director/timetables/:classKey',{classKey:'school:1'});
 assert.equal(r.status,409);assert.equal(r.json.error,'teacher_schedule_conflict');assert.equal(h.saved.length,0);
});
test('a stale version cannot silently overwrite another device timetable',async()=>{
 const h=harness({body:{className:'1AS-A',expectedVersion:0,entries:[]},pgRows:[{class_key:'school:1',class_name:'1AS-A',entries:[],version:3}]});
 const r=await h.req('PUT','/api/director/timetables/:classKey',{classKey:'school:1'});
 assert.equal(r.status,409);assert.equal(r.json.currentVersion,3);assert.equal(h.saved.length,0)
});
test('saving a fresh manual class is scoped to the active school and year',async()=>{
 const h=harness({body:{className:'قسم جديد',expectedVersion:0,entries:[val('sat','08:00','10:00')]}});
 const r=await h.req('PUT','/api/director/timetables/:classKey',{classKey:manual});
 assert.equal(r.status,200);assert.equal(r.json.timetable.classKey,manual);
 assert.equal(h.saved[0][0],'school-a');assert.equal(h.saved[0][1],'2026-2027');
});
test('web and Android cache the same timetable files and the original director design',()=>{
 const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const sw=fs.readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
 const front=fs.readFileSync(new URL('../public/director-v1.js',import.meta.url),'utf8');
 for(const a of ['director-timetables-v1.js?v=2','director-timetables-v1.css?v=1','director-v1.js?v=10']){assert.ok(html.includes(a));assert.ok(sw.includes(a))}
 assert.match(front,/id="directorTimetables"/);
 assert.match(front,/window\.NataijiDirectorTimetables\.open/);
 assert.doesNotMatch(html,/director-premium-v1\.css/);
});
