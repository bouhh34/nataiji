import {test} from 'node:test';
import assert from 'node:assert/strict';
import {repairCalls,planPupilCopy} from '../src/pupil-roster-tools.js';

const row=(id,name,call,nns='')=>({nns:id,data:[nns,name,'أنثى','',name+' FR',call,'',id]});
test('repair changes only repeated or invalid call numbers and preserves original rows',()=>{
 const rows=[row('a','A',3),row('b','B',3),row('c','C',7),row('d','D',0)];
 const before=structuredClone(rows),changes=repairCalls(rows);
 assert.deepEqual(changes.map(c=>c.key),['b','d']);
 assert.equal(new Set([...rows.slice(0,1).map(r=>r.data[5]),...changes.map(c=>c.call),7]).size,4);
 assert.deepEqual(rows,before);
 assert.deepEqual(repairCalls([row('a','A',1),row('b','B',2)]),[]);
});

test('copy selected pupils into destination without changing source or grades',()=>{
 const source=[row('auto-a','أحمد',3),row('school-12','فاطمة',4,'school-12')];
 const target=[row('other','آخر',1)];
 const before=structuredClone(source),destBefore=structuredClone(target),marks={student:'auto-a',value:'17'};
 const plan=planPupilCopy(source,target,['auto-a','school-12'],()=> 'uuid-1');
 assert.equal(plan.copies.length,2);
 assert.equal(plan.skipped,0);
 assert.equal(plan.copies[0].nns,'auto-uuid-1');
 assert.equal(plan.copies[0].data[0],'');
 assert.equal(plan.copies[0].data[1],'أحمد');
 assert.equal(plan.copies[1].nns,'school-12');
 assert.deepEqual(plan.copies.map(x=>x.data[5]),[2,3]);
 assert.deepEqual(source,before);assert.deepEqual(target,destBefore);
 assert.deepEqual(marks,{student:'auto-a',value:'17'});
 assert.notEqual(plan.copies[0].data[7],source[0].data[7]);
});
test('copy skips known names or school numbers and does not change source',()=>{
 const s=[row('a','Ali',1,'same-nns'),row('b','Fatima',2)];
 const t=[row('z','Fatima',10),row('same-nns','Another',3,'same-nns')];
 const result=planPupilCopy(s,t,['a','b'],()=> 'uuid');
 assert.equal(result.copies.length,0);assert.equal(result.skipped,2);
});
test('copy refuses stale or repeated keys and source/destination overflows',()=>{
 assert.throws(()=>planPupilCopy([row('a','A',1)],[],['missing'],()=> 'x'),/pupil_not_found/);
 assert.throws(()=>planPupilCopy([row('a','A',1)],[],['a','a'],()=> 'x'),/invalid_selection/);
 const full=Array.from({length:800},(_,i)=>row('dest-'+i,'Name '+i,i+1));
 assert.throws(()=>planPupilCopy([row('src','New',1)],full,['src'],()=> 'x'),/class_capacity/);
});
