import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../public/student-import.js',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../public/student-import-modal-v1.css',import.meta.url),'utf8');
async function openWith(language,available=false){
 const calls=[],map=new Map(),steps=[1,2,3].map(i=>({
  dataset:{step:String(i)},attributes:{},classList:{toggle(){}},
  setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]}
 }));
 class Field{
  constructor(){this.dataset={};this.hidden=false;this.disabled=false;this.style={};this.value='';this.textContent='';this.innerHTML='';}
  focus(){this.focused=true}
  replaceChildren(){this.innerHTML=''}
  querySelectorAll(){return []}
  addEventListener(){}
  setAttribute(){}
  hasAttribute(){return false}
 }
 for(const key of ['[data-reading-choice]','[data-save]'])map.set(key,Object.assign(new Field(),{hidden:true}));
 const dialog={
  className:'',innerHTML:'',removed:false,
  querySelector(selector){
   if(!map.has(selector))map.set(selector,new Field());
   return map.get(selector);
  },
  querySelectorAll(selector){
   if(selector==='[data-step]')return steps;
   if(selector==='input[type=file]')return [this.querySelector('[data-file]'),this.querySelector('[data-camera]')];
   return [];
  },
  addEventListener(){},
  remove(){this.removed=true}
 };
 const fakeCanvas={
  getContext:()=>({fillRect(){},drawImage(){}}),
  toDataURL:()=> 'data:image/jpeg;base64,YQ==',
  width:0,height:0
 };
 const mockUrl={createObjectURL:()=> 'blob:test',revokeObjectURL(){}};
 class MockImage {
  naturalWidth=120;naturalHeight=90;
  set src(v){queueMicrotask(()=>this.onload?.())}
 }
 const w={};
 const ctx=vm.createContext({
  window:w,localStorage:{getItem:()=>language},
  document:{createElement:type=>type==='canvas'?fakeCanvas:dialog,body:{append(){}},head:{append(){}},activeElement:null},
  fetch:async(url)=>{
   calls.push(String(url));
   return url==='/api/student-document/status'
    ?{ok:true,json:async()=>({available,provider:available?'Gemini':null})}
    :{ok:true,json:async()=>({names:[{text:'محمد محمود',uncertain:false}]})}
  },
  URL:mockUrl,Image:MockImage,console,
  setTimeout:()=>1,clearTimeout:()=>{},
  AbortSignal:{timeout:()=>undefined}
 });
 vm.runInContext(source,ctx);
 w.nataijiStudentImport.open({toAr:s=>s,toFr:s=>s,onSave:async()=>{}});
 await Promise.resolve();await Promise.resolve();await Promise.resolve();await Promise.resolve();
 const select=async(name='handwriting.jpg')=>{
  const field=dialog.querySelector('[data-file]');
  field.files=[{name,size:123,type:'image/jpeg'}];
  await field.onchange({target:field});
  await Promise.resolve();
 };
 return {dialog,map,steps,calls,select};
}
test('Arabic importer shows simple upload paths and no obscure OCR checkbox',async()=>{
 const x=await openWith('ar',true);
 assert.match(x.dialog.innerHTML,/استيراد التلاميذ/);
 assert.match(x.dialog.innerHTML,/اختيار PDF أو صورة/);
 assert.match(x.dialog.innerHTML,/التقاط صورة بالكاميرا/);
 assert.match(x.dialog.innerHTML,/استخراج الأسماء بالذكاء الاصطناعي/);
 assert.doesNotMatch(x.dialog.innerHTML,/data-read-local/);
 assert.doesNotMatch(x.dialog.innerHTML,/data-cloud-consent/);
 assert.equal(x.steps[0].attributes['aria-current'],'step');
 assert.equal(x.map.get('[data-reading-choice]').hidden,true);
});
test('choosing a handwritten photo never sends it to Gemini automatically',async()=>{
 const x=await openWith('ar',true);
 await x.select();
 assert.equal(x.map.get('[data-reading-choice]').hidden,false);
 assert.equal(x.map.get('[data-read-smart]').focused,true);
 assert.match(x.map.get('[data-smart-disclosure]').textContent,/Gemini/);
 assert.equal(x.calls.filter(c=>c==='/api/student-document/recognize').length,0);
});
test('clear explicit smart-reading click is the only gateway to Gemini image transfer',async()=>{
 const x=await openWith('ar',true);
 await x.select();
 x.map.get('[data-read-smart]').onclick();
 await new Promise(resolve=>setTimeout(resolve,15));
 assert.equal(x.calls.filter(c=>c==='/api/student-document/recognize').length,1);
});
test('French import describes AI image transfer before choice and preserves local button',async()=>{
 const x=await openWith('fr',true);
 assert.match(x.dialog.innerHTML,/Extraire les noms avec Gemini/);
 await x.select();
 assert.match(x.map.get('[data-smart-disclosure]').textContent,/envoyée à Gemini/);
 assert.doesNotMatch(x.dialog.innerHTML,/data-read-local/);
 assert.equal(x.calls.filter(c=>c==='/api/student-document/recognize').length,0);
});
test('Gemini unavailable: selecting a photo never starts unreliable local OCR and allows manual entry',async()=>{
 const x=await openWith('ar',false);
 await x.select();
 assert.equal(x.map.get('[data-reading-choice]').hidden,true);
 assert.match(x.map.get('[data-status]').textContent,/Gemini غير متاح/);
 assert.equal(x.calls.filter(c=>c==='/api/student-document/recognize').length,0);
 assert.equal(x.map.get('[data-file]').disabled,false);
 assert.equal(x.dialog.querySelector('[data-text]').disabled,false);
});
test('server route offers only Gemini and rejects another provider before extracting pupil names',()=>{
 const backend=fs.readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
 assert.match(backend,/const enabled=visionProvider\(\)==='Gemini'/);
 assert.match(backend,/if\(visionProvider\(\)!=='Gemini'\)return res.status\(503\)/);
});
test('all PDF pages are rendered and sent through cloud recognition, not local text OCR',()=>{
 assert.match(source,/output.push\(await ocr\(canvas\)\)/);
 assert.match(source,/const result=await extract\(file,message=>\{status.textContent=message\},\(\)=>cancelled,'both',true\)/);
 assert.doesNotMatch(source,/processFile\(file,false\)/);
});
test('manual pasted names still advance review, and original class save handler exists',async()=>{
 const x=await openWith('ar',false);
 x.dialog.querySelector('[data-text]').value='محمد محمود\nمريم محمد';
 x.dialog.querySelector('[data-review]').onclick();
 assert.equal(x.steps[1].attributes['aria-current'],'step');
 assert.equal(x.map.get('[data-save]').hidden,false);
 assert.match(source,/await onSave\(rows\)/);
 assert.match(source,/data-selected/);
 assert.match(source,/data-ar/);
 assert.match(source,/data-fr/);
});
test('new design is teacher-only and screen-only',()=>{
 assert.match(styles,/@media screen/);
 assert.match(styles,/html:not\(\.nataiji-professor-mode\) \.nataiji-student-import-modal/);
 assert.match(styles,/nti-reading-choice\[hidden\]/);
 assert.doesNotMatch(styles,/@media print/);
});
