import assert from 'node:assert/strict';
import {
  professorCatalog,
  inferProfessorLevelCode,
  normalizeProfessorBranchCode,
  normalizeProfessorSubjectKey,
  officialProfessorCoefficient,
  professorSubjectFor,
  professorSubjectAbbreviation,
  expectedProfessorCoefficientTotal
} from '../src/professor-academic-catalog.js';

const catalog=professorCatalog();
assert.deepEqual(catalog.levels.map(x=>x.code),['1AS','2AS','3AS','5AS','6AS','7AS']);
assert.equal(catalog.levels.some(x=>x.code==='4AS'),false);
assert.deepEqual(catalog.levels.slice(0,3).map(x=>x.expectedCoefficientTotal),[27,28,28]);

const middle={
  '1AS':[['islamic',3],['arabic',5],['french',4],['english',2],['history_geo',1],['civic',1],['math',6],['natural_sciences',2],['technology_informatics',2],['eps',1]],
  '2AS':[['islamic',3],['arabic',5],['french',4],['english',2],['history_geo',1],['civic',1],['math',6],['natural_sciences',2],['physical_sciences',1],['technology_informatics',2],['eps',1]],
  '3AS':[['islamic',3],['arabic',5],['french',4],['english',2],['history_geo',1],['civic',1],['math',6],['natural_sciences',2],['physical_sciences',1],['technology_informatics',2],['eps',1]]
};
for(const [code,pairs] of Object.entries(middle)){
  const level=catalog.levels.find(x=>x.code===code);
  assert.deepEqual(level.subjects.map(s=>[s.key,s.coefficient]),pairs,code+' official collège curriculum');
  assert.equal(level.subjects.reduce((sum,s)=>sum+Number(s.coefficient),0),level.expectedCoefficientTotal);
}
assert.equal(professorSubjectFor('1AS','physical_sciences'),null);
assert.equal(officialProfessorCoefficient('2AS','physical_sciences'),1);
assert.equal(officialProfessorCoefficient('3AS','technology_informatics'),2);

const totals={
  '5AS':{A:29,C:30,D:30,O:30},
  '6AS':{A:30,C:30,D:30,O:30},
  '7AS':{A:30,C:30,D:30,O:30}
};
for(const [levelCode,branches] of Object.entries(totals)){
  const level=catalog.levels.find(x=>x.code===levelCode);
  assert.deepEqual(level.branches.map(x=>x.code),['A','C','D','O']);
  for(const [branchCode,total] of Object.entries(branches)){
    const branch=level.branches.find(x=>x.code===branchCode);
    assert.equal(branch.expectedCoefficientTotal,total,levelCode+'/'+branchCode+' official total');
    assert.equal(branch.subjects.reduce((sum,s)=>sum+Number(s.coefficient),0),total,levelCode+'/'+branchCode+' coefficient sum');
    assert.equal(branch.subjects.every(s=>s.official===true),true);
  }
}

assert.equal(officialProfessorCoefficient('5AS','math','A'),2);
assert.equal(officialProfessorCoefficient('5AS','math','C'),6);
assert.equal(officialProfessorCoefficient('5AS','math','D'),4);
assert.equal(officialProfessorCoefficient('5AS','legislation_exegesis','O'),4);
assert.equal(officialProfessorCoefficient('6AS','math','C'),7);
assert.equal(officialProfessorCoefficient('6AS','physical_sciences','D'),6);
assert.equal(officialProfessorCoefficient('6AS','legislation_exegesis','O'),6);
assert.equal(officialProfessorCoefficient('7AS','math','C'),8);
assert.equal(officialProfessorCoefficient('7AS','natural_sciences','D'),8);
assert.equal(officialProfessorCoefficient('7AS','philosophy','A'),5);
assert.equal(officialProfessorCoefficient('7AS','legislation_exegesis','O'),6);

assert.equal(normalizeProfessorBranchCode('M'),'C');
assert.equal(normalizeProfessorBranchCode('SN'),'D');
assert.equal(normalizeProfessorBranchCode('LM'),'A');
assert.equal(normalizeProfessorBranchCode('LO'),'O');
assert.equal(expectedProfessorCoefficientTotal('5AS','M'),30);
assert.equal(expectedProfessorCoefficientTotal('6AS','SN'),30);
assert.equal(expectedProfessorCoefficientTotal('5AS','LM'),29);
assert.equal(expectedProfessorCoefficientTotal('7AS','LO'),30);

assert.equal(inferProfessorLevelCode('2AS-A'),'2AS');
assert.equal(inferProfessorLevelCode('5AS-C-A'),'5AS');
assert.equal(inferProfessorLevelCode('6AS D'),'6AS');
assert.equal(inferProfessorLevelCode('7AS-O'),'7AS');
assert.equal(inferProfessorLevelCode('4AS'),'');
assert.equal(normalizeProfessorSubjectKey('الرياضيات'),'math');
assert.equal(normalizeProfessorSubjectKey('التكنولوجيا والمعلوماتية'),'technology_informatics');
assert.equal(normalizeProfessorSubjectKey('الفيزياء والكيمياء'),'physical_sciences');
assert.equal(professorSubjectAbbreviation('2AS','math'),'MATS');
assert.equal(professorSubjectAbbreviation('2AS','physical_sciences'),'PC');
assert.equal(professorSubjectAbbreviation('5AS','history_geo','A'),'HG');
assert.equal(professorSubjectFor('5AS','math'),null);

console.log('Professor academic catalog checks passed');
