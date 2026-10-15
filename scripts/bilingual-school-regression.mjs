import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code=fs.readFileSync(new URL('../public/bilingual-school-utils.js',import.meta.url),'utf8');
const scope={window:{},Event};
vm.runInNewContext(code,scope);
const {schoolToFr,bindPair,namePairMismatch}=scope.window.nataijiBilingualUtils;

test('official school types and number notation do not translate proper names',()=>{
 const transliterate=v=>({'ابن خلدون':'Ibn Khaldoun','النجاح':'Ennejah'}[v]||v);
 assert.equal(schoolToFr('مدرسة رقم ستة',transliterate),'École n° 6');
 assert.equal(schoolToFr('المدرسة رقم ٦',transliterate),'École n° 6');
 assert.equal(schoolToFr('إعدادية رقم 6',transliterate),'Collège n° 6');
 assert.equal(schoolToFr('ثانوية ابن خلدون',transliterate),'Lycée Ibn Khaldoun');
 assert.equal(schoolToFr('مدرسة النجاح',transliterate),'École Ennejah');
 assert.equal(schoolToFr('ابن خلدون',transliterate),'Ibn Khaldoun');
});

function field(value){
 const listeners={};
 const document={createElement:()=>({style:{},listeners:{},addEventListener(type,fn){this.listeners[type]=fn},click(){this.listeners.click?.()}})};
 return{value,ownerDocument:document,appended:[],parentNode:{appendChild(node){this.children??=[];this.children.push(node)}},
  listeners,addEventListener(type,fn){(listeners[type]??=[]).push(fn)},
  fire(type){for(const fn of listeners[type]||[])fn({type})},
  dispatchEvent(event){this.fire(event.type)}};
}
test('auto updates French until user explicitly corrects it; manual edits remain locked',()=>{
 const ar=field('محمد سالم'),fr=field('Mohamed Salem');
 const converters={ar,fr,toFr:v=>v==='محمد سالم'?'Mohamed Salem':v==='محمد أحمد'?'Mohamed Ahmed':'',toAr:()=>''};
 const controller=bindPair(converters);
 ar.value='محمد أحمد';ar.fire('input');
 assert.equal(fr.value,'Mohamed Ahmed');
 fr.value='Mohammed Ahmed';fr.fire('input');
 ar.value='محمد سالم';ar.fire('input');
 assert.equal(fr.value,'Mohammed Ahmed');
 controller.regenerate();
 assert.equal(fr.value,'Mohamed Salem');
});
test('editing an existing French name does not overwrite its stored Arabic name',()=>{
 const ar=field('محمد سالم'),fr=field('Mohamed Salem');
 bindPair({ar,fr,toFr:()=> 'Mohamed Salem',toAr:()=> 'نص مصحح آليًا'});
 fr.value='Mohamed Salim';fr.fire('input');
 assert.equal(ar.value,'محمد سالم');
});
test('clear differences trigger only nonblocking mismatch signals',()=>{
 const toFr=ar=>ar==='محمد سالم'?'Mohamed Salem':'Fatimetou';
 assert.equal(namePairMismatch('محمد سالم','Mohamed Salem',toFr),false);
 assert.equal(namePairMismatch('محمد سالم','Mohammed Salem',toFr),false);
 assert.equal(namePairMismatch('محمد سالم','Mohamed Ali',toFr),true);
 assert.equal(namePairMismatch('فاطمة','Fatimetou',toFr),false);
});
