import {test} from 'node:test';
import assert from 'node:assert/strict';
import {academicYearNext,normalizeAcademicYear,planNextYearRoster} from '../src/year-promotion-tools.js';
const row=(key,name,nns='',call=1)=>({nns:key,data:[nns,name,'ذكر','',name,call,'',key],class_id:'class-1',position:call});
test('academic years advance exactly once',()=>{
 assert.equal(academicYearNext('2026-2027'),'2027-2028');
 assert.equal(academicYearNext('2026/2027'),'2027-2028');
 assert.equal(academicYearNext(' 2026 - 2027 '),'2027-2028');
 assert.equal(normalizeAcademicYear('2026 / 2027'),'2026-2027');
 assert.equal(normalizeAcademicYear('2026-2027'),'2026-2027');
 for(const s of ['2026-2029','2026-2026','2026-27','2001-1902','abcd-efgh'])assert.throws(()=>academicYearNext(s),/invalid_academic_year/);
});
test('new year pupils get new isolated row IDs, fresh call numbers and no grades',()=>{
 const before=[row('k1','أحمد','NN1',3),row('k2','فاطمة','NN2',6)];
 const older=structuredClone(before),existing=[row('old','طالب قديم','N0',1)];
 let serial=0;const plan=planNextYearRoster(before,existing,['k1','k2'],()=>String(++serial));
 assert.equal(plan.selected,2);assert.equal(plan.copies.length,2);assert.equal(plan.skipped,0);
 assert.deepEqual(plan.copies.map(x=>x.data[5]),[2,3]);
 assert.deepEqual(plan.copies.map(x=>x.nns),['auto-1','auto-2']);
 assert.notEqual(plan.copies[0].data[7],before[0].data[7]);
 assert.deepEqual(before,older);assert.equal(plan.copies[0].marks,undefined);
});
test('destination duplicates and forged source keys are rejected',()=>{
 const source=[row('p1','A','a',1),row('p2','B','b',2)];
 const dest=[row('old','B','b',5)];
 const output=planNextYearRoster(source,dest,['p1','p2'],()=> 'new-id');
 assert.equal(output.copies.length,1);assert.equal(output.skipped,1);
 assert.throws(()=>planNextYearRoster(source,[],['p3'],()=> 'new-id'),/pupil_not_found/);
 assert.throws(()=>planNextYearRoster(source,[],['p1','p1'],()=> 'new-id'),/invalid_selection/);
 assert.throws(()=>planNextYearRoster([{nns:'bad',data:{name:'not-array'}}],[],['bad'],()=> 'x'),/invalid_archived_pupil/);
});
