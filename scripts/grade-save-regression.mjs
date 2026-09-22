import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('let markCellSaveTail='),source.indexOf("$('#student').onchange="));
function fixture(){
 const requests=[],deferred=[];
 const status={textContent:'',classList:{toggle(_,value){this.dirty=value}}};
 const button={textContent:'Save',disabled:false};
 const state={activeClassId:'class-a',term:'term-1',pupils:[['1','Pupil','','','','','','pupil-1']],subjects:[['Subject',1,'Subject',30,'subject-1']],marks:[[5]],marksByTerm:{},classData:{'class-a':{}}};
 const document={documentElement:{lang:'ar'},activeElement:null,querySelector:()=>null,addEventListener(){}};
 const window={addEventListener(){},nataijiValidateGradeValue(raw,max){const n=Number(raw);return raw===''?{ok:true,value:''}:raw==='غائب'?{ok:true,value:raw,absent:true}:{ok:Number.isFinite(n)&&n>=0&&n<=max,value:n}}};
 const ctx=vm.createContext({state,currentUser:{id:'owner',schoolId:'school'},document,window,structuredClone,console,Event,syncBusy:false,setTimeout,localStorage:{setItem(){}},renderReports(){},$:s=>s==='#saveState'?status:button,api:async(url,options)=>{requests.push({url,...JSON.parse(options.body)});return await new Promise((resolve,reject)=>deferred.push({resolve,reject}))}});
 vm.runInContext(code,ctx);
 return {ctx,state,status,button,requests,deferred,edit(value){ctx.input={value,dataset:{i:'0',j:'0'},classList:{contains:()=>false}};return vm.runInContext('persistMarkCell(input)',ctx)}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('capture-phase save uses entered value instead of old state',async()=>{
 const f=fixture();const job=f.edit('12');await tick();assert.equal(f.requests[0].value,12);f.deferred[0].resolve({ok:true});await job;
});
test('queued grades retain original class and term after navigation',async()=>{
 const f=fixture(),first=f.edit('10');await tick();const second=f.edit('11');f.state.activeClassId='class-b';f.state.term='term-2';f.deferred[0].resolve({ok:true});await first;await tick();assert.equal(f.requests[1].classId,'class-a');assert.equal(f.requests[1].term,'term-1');f.deferred[1].resolve({ok:true});await second;
});
test('success is not displayed while another save is pending',async()=>{
 const f=fixture(),first=f.edit('10');await tick();const second=f.edit('11');f.deferred[0].resolve({ok:true});await first;await tick();assert.equal(f.status.classList.dirty,true);f.deferred[1].resolve({ok:true});await second;assert.equal(f.status.classList.dirty,false);
});
test('later success does not hide an earlier failed save',async()=>{
 const f=fixture(),first=f.edit('10');await tick();const second=f.edit('11');f.deferred[0].reject(new Error('offline'));await first;await tick();f.deferred[1].resolve({ok:true});await second;assert.equal(f.status.classList.dirty,true);
});
test('manual save confirmation does not issue a bulk overwrite',async()=>{
 const f=fixture();await f.button.onclick();assert.equal(f.requests.length,0);assert.equal(f.button.disabled,false);assert.equal(f.status.classList.dirty,false);
});
test('manual save confirmation does not overwrite another class',async()=>{
 const f=fixture();f.state.activeClassId='class-b';f.state.marks=[[24]];await f.button.onclick();assert.equal(f.requests.length,0);assert.equal(f.state.marks[0][0],24);
});
test('zero, absence and blank stay distinct; invalid values are not sent',async()=>{
 const f=fixture();for(const [raw,expected] of [['0',0],['غائب','غائب'],['','']]){const job=f.edit(raw);await tick();assert.equal(f.requests.at(-1).value,expected);f.deferred.at(-1).resolve({ok:true});await job}await f.edit('31');assert.equal(f.requests.length,3);
});
test('queued saves are not sent under a different account',async()=>{
 const f=fixture(),first=f.edit('10');await tick();const second=f.edit('11');vm.runInContext("currentUser={id:'other',schoolId:'other-school'}",f.ctx);f.deferred[0].resolve({ok:true});await first;await second;assert.equal(f.requests.length,1);
});
test('manual save waits for queued single-cell writes and preserves failure',async()=>{
 const f=fixture();const cell=f.edit('10');await tick();const confirm=f.button.onclick();assert.equal(f.requests.length,1);f.deferred[0].reject(new Error('offline'));await cell;await confirm;assert.equal(f.requests.length,1);assert.equal(f.status.classList.dirty,true);
});
