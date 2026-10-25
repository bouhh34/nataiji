import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';
import {JSDOM} from 'jsdom';
import vm from 'node:vm';
const read=file=>fs.readFileSync(new URL('../public/'+file,import.meta.url),'utf8');
const code=read('koutoubi-offline.js'),resources=read('koutoubi-resources.js'),html=read('index.html'),sw=read('sw.js');
test('offline books and preparations add only lightweight pre-cached application files',()=>{
 assert.doesNotThrow(()=>new vm.Script(code));
 assert.doesNotThrow(()=>new vm.Script(resources));
 assert.ok(Buffer.byteLength(code)<21000,'offline functionality should not require a large package');
 for(const file of ['koutoubi-offline.js?v=1','koutoubi-resources.js?v=2','koutoubi-resources.css?v=2']){
  assert.ok(html.includes('/'+file),'index missing '+file);
  assert.ok(sw.includes('/'+file),'PWA shell missing '+file);
 }
 assert.ok(html.indexOf('koutoubi-offline.js?v=1')<html.indexOf('koutoubi-resources.js?v=2'),'library must load before resource dialog');
 assert.ok(/data-mode="offline"/.test(resources));
 assert.ok(!/\.pdf\?v=|\.epub\?v=/.test(sw),'do not bundle any textbooks with app');
 assert.ok(!/\bfetch\(/.test(code),'third-party content should never be silently downloaded');
});
test('offline library degrades gracefully if storage is unavailable',async()=>{
 const dom=new JSDOM('<!doctype html><html><body><div id="content"></div></body></html>',{url:'https://nataiji.onrender.com',runScripts:'outside-only'});
 dom.window.eval(code);
 await dom.window.nataijiOfflineLibrary.render(dom.window.document.querySelector('#content'));
 assert.match(dom.window.document.querySelector('#content').textContent,/التخزين المحلي غير متاح/);
 dom.window.close();
});
test('teacher can write and reopen a preparation through browser database without network',async()=>{
 const dom=new JSDOM('<!doctype html><html><body><div id="content"></div></body></html>',{url:'https://nataiji.onrender.com',runScripts:'outside-only'});
 const w=dom.window,stores={documents:new Map(),preparations:new Map()};
 w.eval('var currentUser={id:"teacher-test"}');
 w.indexedDB={open(){
  const request={result:null,error:null};
  w.queueMicrotask(()=>{
   request.result={
    objectStoreNames:{contains:name=>Object.prototype.hasOwnProperty.call(stores,name)},
    createObjectStore(name){stores[name]=new Map()},
    close(){},
    transaction(name){
     const tx={error:null,objectStore(){
       const q=callback=>{
        const result={result:null,error:null};
        w.queueMicrotask(()=>{try{result.result=callback();result.onsuccess?.();w.queueMicrotask(()=>tx.oncomplete?.())}catch(e){result.error=e;tx.error=e;tx.onabort?.()}});
        return result;
       };
       return{getAll:()=>q(()=>[...stores[name].values()]),get:id=>q(()=>stores[name].get(id)),put:val=>q(()=>{stores[name].set(val.id,val);return val.id}),delete:id=>q(()=>stores[name].delete(id))};
      }};
     return tx;
    }
   };
   request.onupgradeneeded?.();request.onsuccess?.();
  });
  return request;
 }};
 w.eval(code);
 const body=w.document.querySelector('#content');
 await w.nataijiOfflineLibrary.render(body);
 assert.match(body.textContent,/مكتبتي بلا إنترنت/);
 const form=body.querySelector('[data-offline-note]');
 form.elements.namedItem('title').value='درس تجريبي';
 form.elements.namedItem('className').value='1AF';
 form.elements.namedItem('subject').value='الرياضيات';
 form.elements.namedItem('steps').value='التقديم ثم التقويم';
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 for(let n=0;n<15&&stores.preparations.size===0;n++)await new Promise(resolve=>setTimeout(resolve,5));
 assert.equal(stores.preparations.size,1);
 await w.nataijiOfflineLibrary.render(body);
 assert.match(body.textContent,/درس تجريبي/);
 assert.ok(body.querySelector('[data-note-view]'));
 body.querySelector('[data-note-view]').click();
 assert.match(body.querySelector('[data-note-preview]').textContent,/التقديم ثم التقويم/);
 dom.window.close();
});
