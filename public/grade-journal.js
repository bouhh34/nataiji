/* Durable, account-scoped drafts. No credentials or pupil names are stored. */
(function(global){
 'use strict';
 class GradeJournal {
  constructor(storage,userId){this.storage=storage;this.key='nataiji-grade-drafts-v1:'+String(userId);this.rows=new Map();this.available=true;this.load()}
  load(){try{const raw=this.storage.getItem(this.key);if(!raw)return;const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.rows))throw Error('draft_invalid');for(const r of data.rows){if(!r.assignmentId||!r.studentId||![1,2,3].includes(r.term)||!r.expected||!r.value)throw Error('draft_invalid');this.rows.set(this.id(r),r)}}catch{this.available=false}}
  id(r){return JSON.stringify([String(r.assignmentId),Number(r.term),String(r.studentId)])}
  pair(r){return {test:String(r?.test??''),exam:String(r?.exam??'')}}
  stage(context,studentId,expected,value){
   const row={assignmentId:String(context.assignmentId),term:Number(context.term),studentId:String(studentId)},id=this.id(row),old=this.rows.get(id),base=old?.expected||this.pair(expected),next=this.pair(value);
   if(!old&&JSON.stringify(base)===JSON.stringify(next)){this.rows.delete(id)}else this.rows.set(id,{...row,expected:base,value:next,revision:global.crypto?.randomUUID?.()||String(Date.now())+Math.random()});
   return this.persist()
  }
  persist(){try{if(!this.available)throw Error('draft_unavailable');if(this.rows.size)this.storage.setItem(this.key,JSON.stringify({version:1,rows:[...this.rows.values()]}));else this.storage.removeItem(this.key);return true}catch{this.available=false;return false}}
  snapshot(){return structuredClone([...this.rows.values()])}
  ack(sent){for(const r of sent){const id=this.id(r),current=this.rows.get(id);if(!current)continue;if(current.revision===r.revision)this.rows.delete(id);else{current.expected=this.pair(r.value);if(JSON.stringify(current.expected)===JSON.stringify(current.value))this.rows.delete(id)}}return this.persist()}
  resolve(row,current,useServer){const id=this.id(row),draft=this.rows.get(id);if(!draft)return;if(useServer)this.rows.delete(id);else{draft.expected=this.pair(current);draft.revision=global.crypto?.randomUUID?.()||String(Date.now())+Math.random()}return this.persist()}
  clear(){this.storage.removeItem(this.key);this.rows.clear();this.available=true}
 }
 global.NataijiGradeJournal=GradeJournal;
})(globalThis);
