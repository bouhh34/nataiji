import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx=vm.createContext({structuredClone,crypto:globalThis.crypto,Date,Math});
vm.runInContext(fs.readFileSync(new URL('../public/school-grade-journal.js',import.meta.url),'utf8'),ctx);
const Journal=ctx.NataijiSchoolGradeJournal;
function storage(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),map}}
const context={account:'["user-a","school-a",""]',classId:'class-a',term:'term-1'};

test('grade drafts survive reload and remain account scoped',()=>{
 const s=storage(),a=new Journal(s,'user-a');a.stage(context,'p-1','math','', '0');
 assert.equal(new Journal(s,'user-a').snapshot()[0].value,'0');assert.equal(new Journal(s,'user-b').snapshot().length,0);
});
test('rapid edits keep the original server baseline and acknowledge safely',()=>{
 const j=new Journal(storage(),'user-a'),first=j.stage(context,'p-1','math','5','12');
 j.stage(context,'p-1','math','12','14');assert.equal(j.snapshot()[0].expected,'5');
 j.ack([first]);assert.equal(j.snapshot()[0].expected,'12');assert.equal(j.snapshot()[0].value,'14');
 j.ack(j.snapshot());assert.equal(j.snapshot().length,0);
});
test('a conflict is held until the user rebases or discards it',()=>{
 const j=new Journal(storage(),'user-a'),r=j.stage(context,'p-1','math','5','12');
 j.setConflict(r,'15');assert.equal(j.snapshot()[0].conflictValue,'15');
 j.rebase(r,'15');assert.equal(j.snapshot()[0].expected,'15');assert.equal(j.snapshot()[0].value,'12');
 j.discard(j.snapshot()[0]);assert.equal(j.snapshot().length,0);
});
test('storage failure remains visible and drafts are not reported as durable',()=>{
 const s=storage();s.setItem=()=>{throw Error('quota')};const j=new Journal(s,'user-a');
 j.stage(context,'p-1','math','5','12');assert.equal(j.available,false);assert.equal(j.snapshot().length,1);
});
