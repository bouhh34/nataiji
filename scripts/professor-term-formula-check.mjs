import fs from 'node:fs';
import vm from 'node:vm';

globalThis.window={};
globalThis.document={};
globalThis.localStorage={getItem:()=> 'ar',setItem:()=>{}};

const source=fs.readFileSync(new URL('../public/professor-v2.js',import.meta.url),'utf8');
vm.runInThisContext(source,{filename:'professor-v2.js'});
const calc=globalThis.window?.NataijiProfessor?._calculateTerm;
const annual=globalThis.window?.NataijiProfessor?._calculateAnnual;
if(typeof calc!=='function'||typeof annual!=='function')throw new Error('Professor calculators are not exposed');

const close=(a,b)=>Math.abs(a-b)<1e-9;
const row={terms:{
 '1':{tests:['10'],exam:'13'},
 '2':{tests:['14'],exam:'17'},
 '3':{tests:['16'],exam:'19'}
}};
const t1=calc(row,1),t2=calc(row,2),t3=calc(row,3),year=annual(row);
if(!close(t1,11.5))throw new Error('Trimester 1 formula mismatch: '+t1);
if(!close(t2,15.5))throw new Error('Trimester 2 formula mismatch: '+t2);
if(!close(t3,17.5))throw new Error('Trimester 3 formula mismatch: '+t3);
if(!close(year,16))throw new Error('Final subject formula mismatch: '+year);

const userExample={terms:{
 '1':{tests:['10'],exam:'12'},
 '2':{tests:['10'],exam:'13'},
 '3':{tests:['10'],exam:'15'}
}};
if(!close(annual(userExample),113/9))throw new Error('Requested 1-2-3 weighted final subject formula mismatch: '+annual(userExample));

if(calc({terms:{'1':{tests:[''],exam:'13'}}},1)!==null)throw new Error('Trimester average must wait for its test');
if(calc({terms:{'2':{tests:['12'],exam:''}}},2)!==null)throw new Error('Trimester average must wait for its exam');
if(annual({terms:{'1':{tests:['10'],exam:'10'},'2':{tests:['10'],exam:'10'}}})!==null)throw new Error('Final subject average must wait for all three trimesters');

console.log('Professor trimester formulas passed',{t1,t2,t3,finalSubjectAverage:year,userExample:annual(userExample)});
