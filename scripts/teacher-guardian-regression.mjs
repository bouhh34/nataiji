import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {JSDOM} from 'jsdom';
import {PGlite} from '@electric-sql/pglite';
import {parsePupilGuardian,backupPupil,savePupilGuardian} from '../src/pupil-guardian.js';

const source=fs.readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
const editor=fs.readFileSync(new URL('../public/bilingual-data-editor-v1.js',import.meta.url),'utf8');
test('teacher editor and real PostgreSQL transactions preserve pupil/contact identity',async t=>{
 const db=new PGlite();
 await db.exec(`
 CREATE TABLE kv_store(key text PRIMARY KEY,value text);
 CREATE TABLE nataiji_pupils(school_id text,class_id text,nns text,data jsonb,position int,updated_at timestamptz DEFAULT now(),PRIMARY KEY(school_id,class_id,nns));
 CREATE TABLE nataiji_marks(school_id text,class_id text,pupil_key text,value text,updated_at timestamptz DEFAULT now());
 CREATE TABLE nataiji_migrations(school_id text,class_id text,resource text,PRIMARY KEY(school_id,class_id,resource));
 CREATE TABLE nataiji_family_contacts(actor_id text,class_id text,student_key text,phone text,consent boolean,updated_at timestamptz DEFAULT now(),PRIMARY KEY(actor_id,class_id,student_key));
 CREATE TABLE nataiji_family_records(contact_scope text,contact_class_id text,student_key text,guardian_phone text,status text);
 `);
 const client={async query(sql,args){const r=await db.query(sql,args);return {...r,rowCount:r.rows.length||r.affectedRows||0}},release(){}};
 const pool={...client,connect:async()=>client},handlers={};
 const ctx={pool,crypto,structuredClone,parsePupilGuardian,backupPupil,savePupilGuardian,auth(){},
  app:{post:(path,...h)=>handlers.post=h.at(-1),put:(path,...h)=>handlers.put=h.at(-1)},
  loadDurableSchoolStructure:async()=>({classes:[{id:'c1'},{id:'c2'}]}),resolveTeacherMutationClass:(u,s,id)=>({ok:true,classId:id}),pupilRows:rows=>rows.map(r=>r.data)};
 const a=source.indexOf("app.post('/api/pupils',"),b=source.indexOf('\n',source.indexOf("app.put('/api/pupils/:nns',",a));
 vm.runInNewContext(source.slice(a,b),ctx);
 let failedContact=false;
 const originalQuery=client.query;
 client.query=async(sql,args)=>{if(failedContact&&sql.includes('INSERT INTO nataiji_family_contacts'))throw Error('injected contact failure');return originalQuery(sql,args)};
 async function request(method,body,key){let status=200,result;await handlers[method]({user:{role:'admin',schoolId:'s1'},body,params:{nns:key}},{status(n){status=n;return this},json(r){result=r;return this}});return{status,...result}}
 const pupil=(name,call,nns='')=>[nns,name,'ذكر','','Test '+name,call,'',''];
 let first,second;
 await t.test('create saves guardian atomically and returns explicit identity',async()=>{
  first=await request('post',{classId:'c1',pupil:pupil('اختبار أول',1),guardian:{phone:'٢٢١١٣٣٤٤',consent:true}});
  assert.equal(first.status,201);assert.ok(first.pupilKey.startsWith('auto-'));
  const rows=(await db.query('SELECT * FROM nataiji_family_contacts')).rows;assert.equal(rows[0].student_key,first.pupilKey);assert.equal(rows[0].phone,'22222113344');
 });
 await t.test('failure of contact write rolls back pupil insertion',async()=>{
  failedContact=true;await assert.rejects(request('post',{classId:'c1',pupil:pupil('فشل',2),guardian:{phone:'22334455',consent:true}}),/injected/);failedContact=false;
  assert.equal((await db.query('SELECT * FROM nataiji_pupils')).rows.length,1);
 });
 await t.test('repeated create cannot duplicate call number; other pupil retains own phone',async()=>{
  const r=await request('post',{classId:'c1',pupil:pupil('اختبار أول',1)});assert.equal(r.status,409);
  second=await request('post',{classId:'c1',pupil:pupil('اختبار ثان',2),guardian:{phone:'33445566',consent:false}});assert.equal(second.status,201);
 });
 await t.test('NNS edit keeps marks, contact and records together and creates backup',async()=>{
  await db.query('INSERT INTO nataiji_marks(school_id,class_id,pupil_key,value) VALUES($1,$2,$3,$4)',['s1','c1',first.pupilKey,'17']);
  await db.query('INSERT INTO nataiji_family_records VALUES($1,$2,$3,$4,$5)',['school:s1','c1',first.pupilKey,'22222113344','pending']);
  const result=await request('put',{classId:'c1',pupil:pupil('اختبار أول',1,'TEST-NNS')},first.pupilKey);
  assert.equal(result.status,200);assert.equal((await db.query('SELECT pupil_key FROM nataiji_marks')).rows[0].pupil_key,'TEST-NNS');
  const c=(await db.query('SELECT * FROM nataiji_family_contacts WHERE student_key=$1',['TEST-NNS'])).rows[0];assert.equal(c.phone,'22222113344');
  assert.equal((await db.query('SELECT student_key FROM nataiji_family_records')).rows[0].student_key,'TEST-NNS');
  const backup=JSON.parse((await db.query('SELECT value FROM kv_store')).rows[0].value);assert.equal(backup.pupils[0].nns,first.pupilKey);assert.equal(backup.marks[0].value,'17');
 });
 await t.test('revocation retains phone but cancels queued communication',async()=>{
  await request('put',{classId:'c1',pupil:pupil('اختبار أول',1,'TEST-NNS'),guardian:{phone:'22113344',consent:false}},'TEST-NNS');
  assert.equal((await db.query('SELECT status FROM nataiji_family_records')).rows[0].status,'cancelled');
  assert.equal((await db.query('SELECT phone FROM nataiji_family_contacts WHERE student_key=$1',[second.pupilKey])).rows[0].phone,'22233445566');
 });
 await t.test('contact key collision rolls back rename without mixing pupils',async()=>{
  await db.query('INSERT INTO nataiji_family_contacts(actor_id,class_id,student_key,phone,consent) VALUES($1,$2,$3,$4,true)',['school:s1','c1','orphan','22244556677']);
  await assert.rejects(request('put',{classId:'c1',pupil:pupil('اختبار أول',1,'orphan')},'TEST-NNS'),/guardian_key_conflict/);
  assert.equal((await db.query('SELECT * FROM nataiji_pupils WHERE nns=$1',['TEST-NNS'])).rows.length,1);
 });
 await t.test('actual bilingual editor add, edit, reload and contact loading failure',async()=>{
  const dom=new JSDOM('<button id="addStudent">Add</button><table><tbody id="list"></tbody></table>',{url:'https://nataiji.test',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;w.structuredClone=structuredClone;w.currentUser={role:'admin'};w.state={activeClassId:'c1',pupils:[],classData:{c1:{}}};w.render=()=>{};w.alert=()=>{};
  let contactFailure=false;
  w.api=async(url,opt)=>{
   if(url.startsWith('/api/family/contacts')){if(contactFailure)throw Error('offline');return{ok:true,contacts:(await db.query('SELECT student_key,phone,consent FROM nataiji_family_contacts WHERE class_id=$1',['c1'])).rows}}
   const result=await request(opt.method==='POST'?'post':'put',JSON.parse(opt.body),decodeURIComponent(url.split('/').at(-1)));if(result.status>=400)throw Error(result.error);return result;
  };
  w.eval(editor);w.document.querySelector('#addStudent').click();
  await new Promise(r=>setTimeout(r,20));
  const fill=(id,value)=>{w.document.querySelector(id).value=value};
  assert.ok(w.document.querySelector('#bi-guardian-phone'));
  fill('#bi-ar','اختبار النموذج');fill('#bi-call','3');fill('#bi-guardian-phone','44556677');w.document.querySelector('#bi-guardian-consent').checked=true;
  await w.document.querySelector('.bi-save').onclick();assert.equal(w.document.querySelector('.nataiji-bi-editor'),null);
  assert.equal(w.state.pupils.length,3);
  const idx=w.state.pupils.findIndex(p=>p[1]==='اختبار النموذج');
  const edit=w.document.createElement('button');edit.className='nataiji-edit-pupil';edit.dataset.i=String(idx);w.document.body.append(edit);
  edit.click();await new Promise(r=>setTimeout(r,30));assert.equal(w.document.querySelector('#bi-guardian-phone').value,'+22244556677');assert.equal(w.document.querySelector('#bi-guardian-consent').checked,true);
  fill('#bi-guardian-phone','55667788');w.document.querySelector('#bi-guardian-phone').dispatchEvent(new w.Event('input'));assert.equal(w.document.querySelector('#bi-guardian-consent').checked,false);
  w.document.querySelector('#bi-guardian-consent').checked=true;await w.document.querySelector('.bi-save').onclick();
  // Rebuild state from durable database, not from form/local values.
  w.state.pupils=(await db.query('SELECT data FROM nataiji_pupils ORDER BY position,updated_at')).rows.map(r=>r.data);
  edit.dataset.i=String(w.state.pupils.findIndex(p=>p[1]==='اختبار النموذج'));edit.click();await new Promise(r=>setTimeout(r,30));assert.equal(w.document.querySelector('#bi-guardian-phone').value,'+22255667788');
  w.document.querySelector('.x').click();contactFailure=true;edit.click();await new Promise(r=>setTimeout(r,30));assert.equal(w.document.querySelector('.bi-save').disabled,true);assert.equal(w.document.querySelector('#bi-guardian-retry').hidden,false);
  w.close();
 });
 await db.close();
});
test('guardian phone rejects malformed input and preserves missing payload',()=>{
 assert.equal(parsePupilGuardian(undefined),undefined);assert.throws(()=>parsePupilGuardian({phone:'123',consent:true}),/invalid_guardian_phone/);
 assert.deepEqual(parsePupilGuardian({phone:'',consent:false}),{phone:'',consent:false});
});
