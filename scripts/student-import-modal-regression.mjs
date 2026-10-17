import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../public/student-import.js',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../public/student-import-modal-v1.css',import.meta.url),'utf8');
async function openWith(language,available=false){
  let modal,cloudConsent={checked:false};
  const map=new Map(),steps=[1,2,3].map(i=>({
    dataset:{step:String(i)}, attributes:{}, classList:{toggle(){}},
    setAttribute(key,value){this.attributes[key]=value},
    removeAttribute(key){delete this.attributes[key]}
  }));
  class Field {
    constructor(){this.dataset={};this.hidden=false;this.disabled=false;this.style={};this.value='';this.textContent='';this.innerHTML='';this.onclick=null;}
    focus(){}
    replaceChildren(){this.innerHTML=''}
    querySelectorAll(){return []}
    addEventListener(){}
    setAttribute(){}
  }
  const dialog={
    className:'',innerHTML:'',removed:false,
    querySelector(selector){
      if(selector==='[data-cloud-consent]')return cloudConsent;
      if(!map.has(selector))map.set(selector,new Field());
      return map.get(selector);
    },
    querySelectorAll(selector){return selector==='[data-step]'?steps:[]},
    addEventListener(){},
    remove(){this.removed=true}
  };
  const window={};
  const context=vm.createContext({
    window,
    localStorage:{getItem:()=>language},
    document:{createElement:()=>dialog,body:{append(node){modal=node}},head:{append(){}},activeElement:null},
    fetch:async()=>({ok:true,json:async()=>({available,provider:'Gemini'})}),
    console,
    setTimeout:()=>1,
    clearTimeout:()=>{},
    URL,
  });
  vm.runInContext(source,context);
  window.nataijiStudentImport.open({toAr:s=>s,toFr:s=>s,onSave:async()=>{}});
  await Promise.resolve();await Promise.resolve();await Promise.resolve();await Promise.resolve();
  return {modal,map,steps,cloudConsent};
}
test('teacher importer offers accessible steps, PDF/photo and camera in Arabic',async()=>{
  const x=await openWith('ar',false);
  assert.match(x.modal.className,/nataiji-student-import-modal/);
  assert.match(x.modal.innerHTML,/استيراد التلاميذ/);
  assert.match(x.modal.innerHTML,/اختيار PDF أو صورة/);
  assert.match(x.modal.innerHTML,/التقاط صورة بالكاميرا/);
  assert.match(x.modal.innerHTML,/data-file accept=/);
  assert.match(x.modal.innerHTML,/data-camera accept="image\/\*" capture="environment"/);
  assert.match(x.modal.innerHTML,/data-rows/);
  assert.equal(x.steps[0].attributes['aria-current'],'step');
  assert.equal(x.map.get('[data-cloud-note]').hidden,true);
  assert.equal(x.map.get('[data-save]').hidden,true);
});
test('French interface displays compact French labels and safe cloud choice',async()=>{
  const x=await openWith('fr',true);
  assert.match(x.modal.innerHTML,/dir="ltr"/);
  assert.match(x.modal.innerHTML,/Importer des élèves/);
  assert.match(x.modal.innerHTML,/Choisir un PDF ou une photo/);
  assert.match(x.modal.innerHTML,/Vérifier les noms/);
  assert.equal(x.map.get('[data-cloud-note]').hidden,false);
  assert.match(x.map.get('[data-cloud-copy]').textContent,/Gemini/);
  assert.equal(x.cloudConsent.checked,false,'cloud image transfer must remain opt-in');
  assert.match(source,/const consent=cloud&&q\('\[data-cloud-consent\]'\)\?\.checked===true/);
  assert.match(source,/extract\(file,s=>status\.textContent=s,\(\)=>cancelled,'both',consent\)/);
});
test('review stage remains available for manual text entry and original save handler',async()=>{
  const x=await openWith('ar',false);
  x.map.get('[data-text]').value='محمد محمود\nمريم محمد';
  x.map.get('[data-review]').onclick();
  assert.equal(x.steps[1].attributes['aria-current'],'step');
  assert.equal(x.map.get('[data-save]').hidden,false);
  assert.match(source,/await onSave\(rows\)/);
  assert.match(source,/data-selected/);
  assert.match(source,/data-ar/);
  assert.match(source,/data-fr/);
});
test('design is screen-only, focused on teacher modal and leaves professor UI alone',()=>{
  assert.match(styles,/@media screen/);
  assert.match(styles,/html:not\(\.nataiji-professor-mode\) \.nataiji-student-import-modal/);
  assert.doesNotMatch(styles,/@media print/);
  assert.doesNotMatch(styles,/\.professor-v2\s*\{/);
});
