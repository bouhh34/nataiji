import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function indexedDbStub(){
 const values=new Map(); let created=false;
 const db={
  objectStoreNames:{contains:()=>created},
  createObjectStore(){created=true;return{createIndex(){}}},
  close(){},
  transaction(){
   const tx={pending:0,oncomplete:null,onerror:null,onabort:null,error:null};
   function request(run){
    tx.pending++;
    const r={result:undefined,onsuccess:null,onerror:null};
    queueMicrotask(()=>{
     try{r.result=run();r.onsuccess?.()}
     catch(e){tx.error=e;r.onerror?.();tx.onerror?.();return}
     finally{tx.pending--}
     queueMicrotask(()=>{if(tx.pending===0)tx.oncomplete?.()})
    });
    return r
   }
   tx.objectStore=()=>({
    index:()=>({
     count:scope=>request(()=>[...values.values()].filter(x=>x.scope===scope).length),
     getAll:scope=>request(()=>[...values.values()].filter(x=>x.scope===scope))
    }),
    add:item=>request(()=>{if(values.has(item.id))throw Error('duplicate');values.set(item.id,item);return item.id}),
    delete:id=>request(()=>values.delete(id))
   });
   tx.abort=()=>{tx.error=Error('abort');tx.onabort?.()};
   return tx
  }
 };
 return {open(){
  const r={result:db,onsuccess:null,onerror:null,onupgradeneeded:null,onblocked:null};
  queueMicrotask(()=>{if(!created)r.onupgradeneeded?.();r.onsuccess?.()});
  return r
 }}
}
function loadOutbox(withDb=true){
 const code=fs.readFileSync(new URL('../public/director-outbox-v1.js',import.meta.url),'utf8');
 const ctx={indexedDB:withDb?indexedDbStub():undefined,structuredClone,Date,queueMicrotask,console,globalThis:null};
 ctx.globalThis=ctx;
 vm.runInNewContext(code,ctx);
 return ctx.NataijiDirectorOutbox
}
const record=(id,category='enrolment')=>({
 category,clientMutationId:id,subject:'Student 1',recordDate:'2026-10-18',
 details:{studentName:'Student 1'}
});
const id1='ee4d5c5d-0d6d-49dd-a484-aec06feb3879',id2='998a0a9c-d9b9-438d-9693-d95e77c4482e';
test('outbox is durable, institution and account scoped',async()=>{
 const q=loadOutbox();
 await q.enqueue({userId:'director1',institutionId:'school1',payload:record(id1)});
 await q.enqueue({userId:'director2',institutionId:'school2',payload:record(id2)});
 assert.equal((await q.pending('director1','school1')).length,1);
 assert.equal((await q.pending('director1','school2')).length,0);
 assert.equal((await q.pending('director2','school2')).length,1);
 const submitted=[];
 const synced=await q.flush({userId:'director1',institutionId:'school1',isCurrent:()=>true,submit:async p=>{submitted.push(p.clientMutationId);return{ok:true,record:{id:'server-1'}}}});
 assert.equal(synced.sent,1);assert.equal(synced.remaining,0);
 assert.deepEqual(submitted,[id1]);
 assert.equal((await q.pending('director2','school2')).length,1);
});
test('offline queue preserves entries when session is unverified or server fails',async()=>{
 const q=loadOutbox();
 await q.enqueue({userId:'d',institutionId:'s',payload:record(id1)});
 const offline=await q.flush({userId:'d',institutionId:'s',isCurrent:()=>false,submit:async()=>{throw Error('must not submit')}});
 assert.equal(offline.sent,0);assert.equal(offline.remaining,1);
 const failed=await q.flush({userId:'d',institutionId:'s',isCurrent:()=>true,submit:async()=>{throw Error('network down')}});
 assert.equal(failed.remaining,1);assert.equal((await q.pending('d','s')).length,1);
});
test('outbox refuses sensitive data and never claims save without IndexedDB',async()=>{
 const q=loadOutbox();
 await assert.rejects(q.enqueue({userId:'d',institutionId:'s',payload:record(id1,'student-health')}));
 await assert.rejects(loadOutbox(false).enqueue({userId:'d',institutionId:'s',payload:record(id2)}),/indexeddb_unavailable/);
});
