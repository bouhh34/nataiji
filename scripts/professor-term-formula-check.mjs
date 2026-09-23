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
 '1':{tests:['10','11','12'],exam:'13'},
 '2':{tests:['14','15','16'],exam:'17'},
 '3':{tests:['16','17','18'],exam:'19'}
}};
const t1=calc(row,1),t2=calc(row,2),t3=calc(row,3),year=annual(row);
if(!close(t1,12))throw new Error('Trimester 1 formula mismatch: '+t1);
if(!close(t2,16))throw new Error('Trimester 2 formula mismatch: '+t2);
if(!close(t3,18))throw new Error('Trimester 3 formula mismatch: '+t3);
if(!close(year,98/6))throw new Error('Annual subject formula mismatch: '+year);

if(calc({terms:{'1':{tests:['10','11',''],exam:'13'}}},1)!==null)throw new Error('Trimester average must wait for all three tests');
if(calc({terms:{'2':{tests:['12','12','12'],exam:''}}},2)!==null)throw new Error('Trimester average must wait for its exam');
if(annual({terms:{'1':{tests:['10','10','10'],exam:'10'},'2':{tests:['10','10','10'],exam:'10'}}})!==null)throw new Error('Annual average must wait for all three trimesters');

console.log('Professor trimester formulas passed',{t1,t2,t3,annual:year});
