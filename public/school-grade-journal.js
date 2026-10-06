/* Offline grade edits for the school workspace. Rows contain stable record IDs,
   values and account scope only; never pupil names, passwords or session data. */
(function(global){
 'use strict';
 class SchoolGradeJournal{
  constructor(storage,userId){this.storage=storage;this.key='nataiji-school-grade-drafts-v1:'+String(userId);this.rows=new Map();this.available=true;this.load()}
  id(r){return JSON.stringify([String(r.account),String(r.classId),String(r.term),String(r.pupilKey),String(r.subjectId)])}
  load(){try{const raw=this.storage.getItem(this.key);if(!raw)return;const d=JSON.parse(raw);if(d.version!==1||!Array.isArray(d.rows)||d.rows.length>10000)throw Error('draft_invalid');for(const r of d.rows){if(!r.account||!r.classId||!r.term||!r.pupilKey||!r.subjectId||typeof r.expected!=='string'||typeof r.value!=='string'||!r.revision)throw Error('draft_invalid');this.rows.set(this.id(r),r)}}catch{this.available=false}}
  stage(context,pupilKey,subjectId,expected,value){
   const base={account:String(context.account),classId:String(context.classId),term:String(context.term),pupilKey:String(pupilKey),subjectId:String(subjectId)},id=this.id(base),old=this.rows.get(id);
   if(!old&&this.rows.size>=10000){this.available=false;return null}
   const row={...base,expected:old?.expected??String(expected??''),value:String(value??''),revision:global.crypto?.randomUUID?.()||String(Date.now())+Math.random()};
   this.rows.set(id,row);this.persist();return structuredClone(row)
  }
  persist(){try{if(!this.available)throw Error('draft_unavailable');if(this.rows.size)this.storage.setItem(this.key,JSON.stringify({version:1,rows:[...this.rows.values()]}));else this.storage.removeItem(this.key);return true}catch{this.available=false;return false}}
  snapshot(){return structuredClone([...this.rows.values()])}
  ack(sent){for(const r of sent){const id=this.id(r),current=this.rows.get(id);if(!current)continue;if(current.revision===r.revision)this.rows.delete(id);else{current.expected=String(r.value??'');delete current.conflictValue}}return this.persist()}
  setConflict(row,currentValue){const current=this.rows.get(this.id(row));if(!current)return false;current.conflictValue=String(currentValue??'');return this.persist()}
  rebase(row,currentValue){const current=this.rows.get(this.id(row));if(!current)return false;current.expected=String(currentValue??'');delete current.conflictValue;current.revision=global.crypto?.randomUUID?.()||String(Date.now())+Math.random();return this.persist()}
  discard(row){this.rows.delete(this.id(row));return this.persist()}
 }
 global.NataijiSchoolGradeJournal=SchoolGradeJournal;
})(globalThis);
