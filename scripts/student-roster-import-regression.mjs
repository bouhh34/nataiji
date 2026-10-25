import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importedPupilRows} from '../src/student-roster-import.js';
test('import adds both languages and reserves unused call numbers without changing prior pupils',()=>{
 const old=[['1','مريم','','','Mariem',1],['2','منى','','','Mouna',3]],snapshot=structuredClone(old);
 const rows=importedPupilRows([{name:'محمد',nameFr:'Mohamed'},{name:'فاطمة',nameFr:'Fatimetou'}],old);
 assert.deepEqual(rows.map(r=>r[5]),[2,4]);assert.equal(rows[0][1],'محمد');assert.equal(rows[0][4],'Mohamed');assert.deepEqual(old,snapshot);
});
test('same-name pupils remain distinct and incomplete or oversized imports are rejected',()=>{
 assert.equal(importedPupilRows([{name:'محمد',nameFr:'Mohamed'},{name:'محمد',nameFr:'Mohamed'}],[]).length,2);
 assert.throws(()=>importedPupilRows([{name:'محمد'}],[]),/invalid_import/);
 assert.throws(()=>importedPupilRows([{name:'محمد',nameFr:'Mohamed'}],Array(800).fill([])),/class_capacity/);
});

test('photo roster preserves optional NNS, sex and birth date without reassigning pupils',()=>{
 const rows=importedPupilRows([
  {name:'محمد',nameFr:'Mohamed',nns:'N-25',sex:'male',birthDate:'2016-10-25'},
  {name:'مريم',nameFr:'Mariem',sex:'female'}
 ],[]);
 assert.deepEqual(rows[0].slice(0,6),['N-25','محمد','ذكر','2016-10-25','Mohamed',1]);
 assert.equal(rows[1][2],'أنثى');
 assert.throws(()=>importedPupilRows([{name:'محمد',nameFr:'Mohamed',nns:'OLD'}],[['OLD','سابق']]),/invalid_import/);
 assert.throws(()=>importedPupilRows([{name:'محمد',nameFr:'Mohamed',birthDate:'2026-02-30'}],[]),/invalid_import/);
});
