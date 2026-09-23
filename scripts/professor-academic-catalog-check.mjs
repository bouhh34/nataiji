import assert from 'node:assert/strict';
import {professorCatalog,inferProfessorLevelCode,normalizeProfessorSubjectKey,officialProfessorCoefficient,professorSubjectFor,expectedProfessorCoefficientTotal} from '../src/professor-academic-catalog.js';

const catalog=professorCatalog();
assert.deepEqual(catalog.levels.map(x=>x.code),['1AS','2AS','3AS']);
assert.equal(catalog.levels.some(x=>['4AS','5AS'].includes(x.code)),false);
assert.deepEqual(catalog.levels.map(x=>x.expectedCoefficientTotal),[27,28,28]);
assert.equal(expectedProfessorCoefficientTotal('1AS'),27);
assert.equal(expectedProfessorCoefficientTotal('2AS'),28);
assert.equal(expectedProfessorCoefficientTotal('3AS'),28);
assert.equal(inferProfessorLevelCode('2AS-A'),'2AS');
assert.equal(inferProfessorLevelCode('3AS'),'3AS');
assert.equal(inferProfessorLevelCode('4AS'),'');
assert.equal(normalizeProfessorSubjectKey('الرياضيات'),'math');
assert.equal(normalizeProfessorSubjectKey('Mathématiques'),'math');
assert.equal(officialProfessorCoefficient('1AS','math'),6);
assert.equal(officialProfessorCoefficient('2AS','الرياضيات'),6);
assert.equal(officialProfessorCoefficient('3AS','math'),6);
assert.equal(officialProfessorCoefficient('1AS','english'),2);
assert.equal(officialProfessorCoefficient('2AS','Anglais'),2);
assert.equal(officialProfessorCoefficient('3AS','اللغة الإنجليزية'),2);
assert.equal(officialProfessorCoefficient('1AS','arabic'),5);
assert.equal(officialProfessorCoefficient('1AS','french'),4);
assert.equal(officialProfessorCoefficient('1AS','history_geo'),2);
assert.equal(officialProfessorCoefficient('1AS','eps'),1);
assert.equal(officialProfessorCoefficient('2AS','physical_sciences'),1);
assert.equal(officialProfessorCoefficient('3AS','physical_sciences'),1);
assert.equal(professorSubjectFor('2AS','physical_sciences')?.official,true);
assert.equal(professorSubjectFor('1AS','physical_sciences'),null);
for(const level of catalog.levels){
  assert.equal(level.subjects.every(s=>s.official===true),true,`${level.code} must have only official standard coefficients`);
  assert.equal(level.subjects.reduce((sum,s)=>sum+Number(s.coefficient||0),0),level.expectedCoefficientTotal,`${level.code} coefficients must match official total`);
}
assert.deepEqual(
  catalog.levels.find(x=>x.code==='1AS').subjects.map(s=>[s.key,s.coefficient]),
  [['math',6],['arabic',5],['french',4],['english',2],['islamic',2],['history_geo',2],['natural_sciences',2],['civic',1],['technology',1],['informatics',1],['eps',1]]
);
assert.deepEqual(
  catalog.levels.find(x=>x.code==='2AS').subjects.map(s=>[s.key,s.coefficient]),
  [['math',6],['arabic',5],['french',4],['english',2],['islamic',2],['history_geo',2],['natural_sciences',2],['physical_sciences',1],['civic',1],['technology',1],['informatics',1],['eps',1]]
);

console.log('Professor academic catalog checks passed');
