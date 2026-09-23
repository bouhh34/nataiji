import assert from 'node:assert/strict';
import {professorCatalog,inferProfessorLevelCode,normalizeProfessorSubjectKey,officialProfessorCoefficient,professorSubjectFor} from '../src/professor-academic-catalog.js';

const catalog=professorCatalog();
assert.deepEqual(catalog.levels.map(x=>x.code),['1AS','2AS','3AS']);
assert.equal(catalog.levels.some(x=>['4AS','5AS'].includes(x.code)),false);
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
assert.equal(officialProfessorCoefficient('2AS','physical_sciences'),null);
assert.equal(professorSubjectFor('2AS','physical_sciences')?.official,false);

console.log('Professor academic catalog checks passed');
