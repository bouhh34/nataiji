import assert from 'node:assert/strict';
import {professorCatalog,inferProfessorLevelCode,normalizeProfessorSubjectKey,officialProfessorCoefficient,professorSubjectFor,expectedProfessorCoefficientTotal} from '../src/professor-academic-catalog.js';

const catalog=professorCatalog();
assert.deepEqual(catalog.levels.map(x=>x.code),['1AS','2AS','3AS','5AS','6AS']);
assert.equal(catalog.levels.some(x=>x.code==='4AS'),false);
assert.deepEqual(catalog.levels.slice(0,3).map(x=>x.expectedCoefficientTotal),[27,28,28]);
assert.equal(expectedProfessorCoefficientTotal('1AS'),27);
assert.equal(expectedProfessorCoefficientTotal('2AS'),28);
assert.equal(expectedProfessorCoefficientTotal('3AS'),28);
assert.equal(expectedProfessorCoefficientTotal('5AS','M'),30);
assert.equal(expectedProfessorCoefficientTotal('5AS','SN'),30);
assert.equal(expectedProfessorCoefficientTotal('5AS','LM'),30);
assert.equal(expectedProfessorCoefficientTotal('5AS','LO'),30);
assert.equal(expectedProfessorCoefficientTotal('6AS','M'),32);
assert.equal(expectedProfessorCoefficientTotal('6AS','SN'),30);
assert.equal(expectedProfessorCoefficientTotal('6AS','LM'),30);
assert.equal(expectedProfessorCoefficientTotal('6AS','LO'),30);
assert.equal(inferProfessorLevelCode('2AS-A'),'2AS');
assert.equal(inferProfessorLevelCode('3AS'),'3AS');
assert.equal(inferProfessorLevelCode('5AS-M-A'),'5AS');
assert.equal(inferProfessorLevelCode('6AS SN'),'6AS');
assert.equal(inferProfessorLevelCode('4AS'),'');
assert.equal(normalizeProfessorSubjectKey('الرياضيات'),'math');
assert.equal(normalizeProfessorSubjectKey('Mathématiques'),'math');
assert.equal(normalizeProfessorSubjectKey('الفلسفة'),'philosophy');
assert.equal(normalizeProfessorSubjectKey('الفكر الإسلامي'),'islamic_thought');
assert.equal(normalizeProfessorSubjectKey('التشريع والتفسير'),'legislation_exegesis');
assert.equal(officialProfessorCoefficient('1AS','math'),6);
assert.equal(officialProfessorCoefficient('2AS','الرياضيات'),6);
assert.equal(officialProfessorCoefficient('3AS','math'),6);
assert.equal(officialProfessorCoefficient('5AS','math','M'),7);
assert.equal(officialProfessorCoefficient('5AS','math','SN'),4);
assert.equal(officialProfessorCoefficient('5AS','math','LM'),2);
assert.equal(officialProfessorCoefficient('5AS','math','LO'),2);
assert.equal(officialProfessorCoefficient('6AS','math','M'),8);
assert.equal(officialProfessorCoefficient('6AS','math','SN'),4);
assert.equal(officialProfessorCoefficient('6AS','math','LM'),2);
assert.equal(officialProfessorCoefficient('6AS','math','LO'),2);
assert.equal(professorSubjectFor('5AS','math','M')?.official,true);
assert.equal(professorSubjectFor('6AS','legislation_exegesis','LO')?.official,true);
assert.equal(professorSubjectFor('5AS','math'),null);

for(const level of catalog.levels){
  if(level.branches?.length){
    for(const branch of level.branches){
      assert.equal(branch.subjects.every(s=>s.official===true),true,`${level.code}/${branch.code} must have only official branch coefficients`);
      assert.equal(branch.subjects.reduce((sum,s)=>sum+Number(s.coefficient||0),0),branch.expectedCoefficientTotal,`${level.code}/${branch.code} coefficients must match branch total`);
    }
  }else{
    assert.equal(level.subjects.every(s=>s.official===true),true,`${level.code} must have only official standard coefficients`);
    assert.equal(level.subjects.reduce((sum,s)=>sum+Number(s.coefficient||0),0),level.expectedCoefficientTotal,`${level.code} coefficients must match official total`);
  }
}

assert.deepEqual(
  catalog.levels.find(x=>x.code==='1AS').subjects.map(s=>[s.key,s.coefficient]),
  [['math',6],['arabic',5],['french',4],['english',2],['islamic',2],['history_geo',2],['natural_sciences',2],['civic',1],['technology',1],['informatics',1],['eps',1]]
);
assert.equal(catalog.levels.find(x=>x.code==='5AS').branches.length,4);
assert.equal(catalog.levels.find(x=>x.code==='6AS').branches.length,4);

console.log('Professor academic catalog checks passed');
