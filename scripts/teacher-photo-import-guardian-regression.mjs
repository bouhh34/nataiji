import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {importedPupilRows} from '../src/student-roster-import.js';
import {parsePupilGuardian,savePupilGuardian} from '../src/pupil-guardian.js';

test('real teacher photo-import route persists guardian contacts atomically with pupil identity',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`
   CREATE TABLE nataiji_pupils(school_id text,class_id text,nns text,data jsonb,position integer,updated_at timestamptz DEFAULT now(),PRIMARY KEY(school_id,class_id,nns));
   CREATE TABLE nataiji_migrations(school_id text,class_id text,resource text,PRIMARY KEY(school_id,class_id,resource));
   CREATE TABLE nataiji_family_contacts(actor_id text,class_id text,student_key text,phone text,consent boolean,updated_at timestamptz DEFAULT now(),PRIMARY KEY(actor_id,class_id,student_key));
   CREATE TABLE nataiji_family_records(contact_scope text,contact_class_id text,student_key text,guardian_phone text,status text);
  `);
  let injectFailure=false;
  const client={
   async query(sql,args){
    if(injectFailure&&sql.includes('INSERT INTO nataiji_family_contacts'))throw Error('simulated_contact_failure');
    const result=await db.query(sql,args);
    return {...result,rowCount:result.rows.length||result.affectedRows||0};
   },release(){}
  };
  const pool={connect:async()=>client};
  let route;
  const source=fs.readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
  const from=source.indexOf("app.post('/api/pupils/import',"),to=source.indexOf("\napp.post('/api/pupils',",from);
  assert.ok(from>0&&to>from);
  vm.runInNewContext(source.slice(from,to),{
   pool,crypto,importedPupilRows,parsePupilGuardian,savePupilGuardian,
   app:{post:(path,...args)=>{if(path==='/api/pupils/import')route=args.at(-1)}},
   auth(){},
   loadDurableSchoolStructure:async()=>({classes:[{id:'c1'}]}),
   resolveTeacherMutationClass:(_user,_structure,classId)=>({ok:true,classId}),
   console
  });
  assert.equal(typeof route,'function');
  const request=async students=>{
   let status=200;
   let response;
   await route({user:{role:'admin',schoolId:'s1'},body:{classId:'c1',students}},
    {status(n){status=n;return this},json(value){response=value;return this}});
   return{status,...response};
  };
  const pupil=(name,values={})=>({name,nameFr:'FR '+name,...values});
  const before=await request([
   pupil('محمد',{nns:'N123',sex:'male',birthDate:'2017-01-05',phone:'+222 33 22 11 00',guardianConsent:true}),
   pupil('مريم',{sex:'female'})
  ]);
  assert.equal(before.status,201);
  assert.equal(before.imported,2);
  assert.equal(before.contacts,1);
  const imported=(await db.query('SELECT nns,data FROM nataiji_pupils ORDER BY position')).rows;
  assert.equal(imported[0].nns,'N123');
  assert.deepEqual(imported[0].data.slice(0,6),['N123','محمد','ذكر','2017-01-05','FR محمد',1]);
  assert.equal(imported[1].data[2],'أنثى');
  const contacts=(await db.query('SELECT student_key,phone,consent FROM nataiji_family_contacts')).rows;
  assert.equal(contacts.length,1);
  assert.equal(contacts[0].student_key,imported[0].data[7]);
  assert.equal(contacts[0].phone,'22233221100');
  assert.equal(contacts[0].consent,true);

  const invalid=await request([pupil('غير موافق',{phone:'33221100',guardianConsent:false})]);
  assert.equal(invalid.status,400);
  assert.equal(invalid.error,'guardian_consent_required');
  const duplicate=await request([pupil('مكرر',{nns:'N123'})]);
  assert.equal(duplicate.status,400);
  assert.equal((await db.query('SELECT * FROM nataiji_pupils')).rows.length,2);
  injectFailure=true;
  await assert.rejects(request([pupil('سليم'),pupil('فشل',{phone:'22446688',guardianConsent:true})]),/simulated_contact_failure/);
  injectFailure=false;
  assert.equal((await db.query('SELECT * FROM nataiji_pupils')).rows.length,2);
  const old=await request([pupil('إدخال قديم')]);
  assert.equal(old.status,201);
  assert.equal(old.contacts,0);
  assert.equal((await db.query('SELECT * FROM nataiji_family_contacts')).rows.length,1);
 }finally{await db.close()}
});
