import fs from 'node:fs';
import vm from 'node:vm';

globalThis.window={};
globalThis.document={};
globalThis.localStorage={getItem:()=> 'ar',setItem:()=>{}};

const source=fs.readFileSync(new URL('../public/professor-v2.js',import.meta.url),'utf8');
vm.runInThisContext(source,{filename:'professor-v2.js'});
const calc=globalThis.window?.NataijiProfessor?._calculateTerm;
if(typeof calc!=='function')throw new Error('Professor term calculator is not exposed');

const close=(a,b)=>Math.abs(a-b)<1e-9;
const sample={test1:'10',exam1:'12',test2:'14',exam2:'13',test3:'16',exam3:'15'};
const t1=calc(sample,1),t2=calc(sample,2),t3=calc(sample,3);
if(!close(t1,11))throw new Error('Term 1 formula mismatch: '+t1);
if(!close(t2,12.4))throw new Error('Term 2 formula mismatch: '+t2);
if(!close(t3,123/9))throw new Error('Term 3 formula mismatch: '+t3);

const equalTests={test1:'10',exam1:'12',test2:'10',exam2:'13',test3:'10',exam3:'15'};
const final=calc(equalTests,3);
if(!close(final,113/9))throw new Error('User example mismatch: '+final);

if(calc({test1:'10',exam1:'12'},2)!==null)throw new Error('Term 2 must wait for term 2 inputs');
if(calc({test1:'10',exam1:'12',test2:'14',exam2:'13'},3)!==null)throw new Error('Term 3 must wait for term 3 inputs');

console.log('Professor term formulas passed', {t1,t2,t3,userExample:final});
