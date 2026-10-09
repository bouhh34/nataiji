import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('public/app.js');
const structure=read('public/structure-manager.js');
const server=read('src/server.js');
const students=read('public/student-mobile-cards-v1.js');
const workflow=read('public/workflow-polish.js');
const grades=read('public/grade-mobile-ui-v1.js');

const source=(text,opening,ending)=>{
 const start=text.indexOf(opening),end=text.indexOf(ending,start+opening.length);
 assert.ok(start>=0&&end>start,opening+' must be extractable');
 return text.slice(start,end)
};

function bootstrapHarness(){
 const code=source(app,'async function startApp(){',"\n\n$$('[data-view]')");
 const local=new Map(),events=[],window={},ctx={
  window,currentUser:{id:'user',schoolId:'school',activeSharedGrant:''},
  state:null,storageMode:'postgres',localStorage:{
   getItem:key=>local.get(key)??null,setItem:(key,value)=>local.set(key,value),removeItem:key=>local.delete(key)
  },
  localState:()=>null,localStateDataCount:()=>0,
  recoveryStorageKey:id=>'recovery:'+id,
  normalizeState:s=>structuredClone(s),structuredClone,
  render:()=>{events.push(['render',ctx.state?.activeClassId,ctx.state?.subjects?.length])},
  setView:view=>events.push(['view',view]),
  flushSchoolGradeJournal:()=>Promise.resolve(),console,
  setTimeout:()=>0,modal:()=>{},showAuth:()=>{},
  api:async()=>{throw Error('stub missing')},
  JSON
 };
 vm.runInNewContext(code+'\n;globalThis.bootstrap=startApp',ctx);
 return {ctx,events,window}
}

test('boot displays a single canonical state with matching subjects and pupils',async()=>{
 const {ctx,events}=bootstrapHarness();
 const calls=[];
 ctx.api=async url=>{calls.push(url);return {user:ctx.currentUser,state:{
  activeClassId:'2af',year:'2026-2027',
  pupils:[['001','Pupil']],subjects:[['Arabic',1,'Arabe',20,'subject-id']],
  marks:[['10']],classes:[{id:'2af',name:'2AF'}]
 }}};
 await ctx.bootstrap();
 assert.deepEqual(calls,['/api/state'],'do not mix two school state fetches');
 assert.equal(ctx.state.pupils.length,1);
 assert.equal(ctx.state.subjects[0][4],'subject-id');
 assert.deepEqual(events.map(x=>x[0]),['render','view']);
});

test('late bootstrap data cannot replace more recent class navigation',async()=>{
 const {ctx,events,window}=bootstrapHarness();
 let release;
 ctx.api=()=>new Promise(resolve=>{release=resolve});
 const stale=ctx.bootstrap();
 window.__nataijiStateViewEpoch++;
 ctx.api=async()=>({user:ctx.currentUser,state:{activeClassId:'2af',pupils:[],subjects:[]}});
 await ctx.bootstrap();
 release({user:ctx.currentUser,state:{activeClassId:'old',pupils:[['x']],subjects:[]}});
 await stale;
 assert.equal(ctx.state.activeClassId,'2af');
 assert.equal(events.filter(x=>x[0]==='render').length,1);
});

test('student cards are always cleared when active school state becomes empty',()=>{
 const code=source(students,'function renderCards(){','\n\nlet timer');
 const host={innerHTML:''};let active={pupils:[['001','Student','ذكر','','Student',1]]};
 const ctx={getState:()=>active,ensureHost:()=>host,canEdit:()=>false,isFr:()=>false,esc:x=>String(x??'')};
 vm.runInNewContext(code+'\nrenderCards();',ctx);
 assert.match(host.innerHTML,/Student/);
 active={pupils:[]};
 vm.runInNewContext(code+'\nrenderCards();',ctx);
 assert.match(host.innerHTML,/لا يوجد تلاميذ/);
 assert.doesNotMatch(host.innerHTML,/Student/);
});

test('canonical API subjects preserve stable subject IDs on every class switch',()=>{
 assert.match(server,/SELECT subject_id,data FROM nataiji_subjects WHERE school_id=\$1 AND class_id=\$2 ORDER BY position,updated_at/);
 assert.match(server,/d\.subjects=subjectRows\(sub\.rows\)/);
 assert.match(server,/s\[4\]=row\.subject_id/);
});

test('all class changes invalidate old boot responses and synchronous UI refreshes both lists',()=>{
 assert.match(structure,/window\.__nataijiStateViewEpoch=\(window\.__nataijiStateViewEpoch\|\|0\)\+1/);
 assert.match(structure,/epoch!==window\.__nataijiStateViewEpoch/);
 assert.match(app,/window\.nataijiRenderStudentMobileCards\?\.\(\);window\.nataijiRefreshPupilToolbar\?\.\(\)/);
 assert.match(students,/window\.nataijiRenderStudentMobileCards=renderCards/);
 assert.match(workflow,/window\.nataijiRefreshPupilToolbar=filter/);
 assert.match(grades,/grade-subject-empty/);
 assert.doesNotMatch(source(app,'async function startApp(){',"\\n\\n$('[data-view]')"),/if\(refresh\)render\(\)/);
});
