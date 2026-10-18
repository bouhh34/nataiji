/* Offline-first append-only outbox for NON-MEDICAL director registers.
 * Account/institution scoped. All writes are acknowledged only after an
 * IndexedDB transaction commits; server replay uses clientMutationId. */
(function(global){
 'use strict';
 const DB='nataiji-director-outbox-v1',STORE='pending',MAX=300;
 const forbidden=new Set(['student-health','teacher-health']);
 let running=false;
 function scope(userId,institutionId){if(!userId||!institutionId)throw Error('director_scope_missing');return String(userId)+':'+String(institutionId)}
 function database(){
  return new Promise((resolve,reject)=>{
   if(!global.indexedDB){reject(Error('indexeddb_unavailable'));return}
   const request=global.indexedDB.open(DB,1);
   request.onupgradeneeded=()=>{
    const db=request.result;
    if(!db.objectStoreNames.contains(STORE)){
     const store=db.createObjectStore(STORE,{keyPath:'id'});
     store.createIndex('scope','scope',{unique:false})
    }
   };
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error||Error('outbox_open_failed'));
   request.onblocked=()=>reject(Error('outbox_blocked'))
  })
 }
 async function transaction(mode,run){
  const db=await database();
  try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
   let value;
   tx.oncomplete=()=>resolve(value);
   tx.onerror=()=>reject(tx.error||Error('outbox_write_failed'));
   tx.onabort=()=>reject(tx.error||Error('outbox_aborted'));
   try{run(store,v=>{value=v},tx)}catch(e){tx.abort();reject(e)}
  })}finally{db.close()}
 }
 const getAll=(userId,institutionId)=>transaction('readonly',(store,set)=>{
  const request=store.index('scope').getAll(scope(userId,institutionId));
  request.onsuccess=()=>set((request.result||[]).sort((a,b)=>a.createdAt-b.createdAt));
 });
 async function enqueue({userId,institutionId,payload}){
  if(!payload||forbidden.has(payload.category)||!payload.clientMutationId||!String(payload.subject||'').trim())throw Error('invalid_offline_record');
  if(!/^[0-9a-f-]{36}$/i.test(String(payload.clientMutationId)))throw Error('invalid_offline_id');
  const ownerScope=scope(userId,institutionId);
  return transaction('readwrite',(store,set,tx)=>{
   const count=store.index('scope').count(ownerScope);
   count.onsuccess=()=>{
    if(count.result>=MAX){tx.abort();return}
    const entry={id:String(payload.clientMutationId),scope:ownerScope,payload:structuredClone(payload),createdAt:Date.now()};
    const req=store.add(entry);
    req.onsuccess=()=>set(entry)
   }
  }).catch(error=>{if(error?.name==='AbortError')throw Error('outbox_capacity_exceeded');throw error})
 }
 const remove=id=>transaction('readwrite',(store)=>store.delete(String(id)));
 async function flush({userId,institutionId,submit,isCurrent}){
  if(running)return {busy:true,sent:0};
  if(typeof submit!=='function'||typeof isCurrent!=='function')throw Error('invalid_outbox_flush');
  running=true;
  let sent=0,error=null;
  try{
   const entries=await getAll(userId,institutionId);
   for(const item of entries){
    if(!isCurrent()){error='session_not_verified';break}
    try{
     const response=await submit(item.payload);
     if(!response?.ok||!response?.record)throw Error('outbox_save_not_verified');
     if(!isCurrent()){error='session_changed';break}
     await remove(item.id);sent++
    }catch(e){error=e?.code||e?.message||'sync_failed';break}
   }
   return {sent,remaining:(await getAll(userId,institutionId)).length,error}
  }finally{running=false}
 }
 global.NataijiDirectorOutbox={enqueue,pending:getAll,flush};
})(globalThis);
