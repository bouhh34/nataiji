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
