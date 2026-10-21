import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initFamilySchema,mountFamilyRoutes,normalizeMauritaniaPhone} from '../src/family-engagement.js';

test('Mauritanian guardian phone normalization',()=>{
 assert.equal(normalizeMauritaniaPhone('34 12 34 56'),'22234123456');
 assert.equal(normalizeMauritaniaPhone('+222 34 12 34 56'),'22234123456');
 assert.equal(normalizeMauritaniaPhone('00222 34 12 34 56'),'22234123456');
 assert.equal(normalizeMauritaniaPhone('1234'),null);
});
test('family records schema includes shared contacts and scoped sender queue',async()=>{
 const sql=[];
 await initFamilySchema({query:async q=>{sql.push(String(q))}});
 assert(sql.some(s=>s.includes('nataiji_family_contacts')));
 assert(sql.some(s=>s.includes('contact_scope')));
 assert(sql.some(s=>s.includes('nataiji_family_records')));
});
test('teacher and director issue awards without approval; only their own WhatsApp outbox is visible',async()=>{
 const routes=new Map(),contacts=new Map(),records=new Map();
 const key=(a,b,c)=>[a,b,c].join('/');
 const add=method=>(url,...handlers)=>routes.set(method+' '+url,handlers);
 const app={get:add('GET'),put:add('PUT'),post:add('POST'),delete:add('DELETE')};
 const db={query:async(sql,args=[])=>{
  const q=String(sql).replace(/\s+/g,' ');
  if(q.includes('INSERT INTO nataiji_family_contacts')){
   contacts.set(key(args[0],args[1],args[2]),{phone:args[3],consent:true});return{rows:[],rowCount:1};
  }
  if(q.includes('SELECT student_key,phone,consent FROM nataiji_family_contacts')){
   const rows=[...contacts].filter(([k])=>k.startsWith(key(args[0],args[1],'').slice(0,-1)+'/')).map(([k,c])=>({student_key:k.split('/').at(-1),...c}));
   return{rows,rowCount:rows.length};
  }
  if(q.includes('SELECT phone FROM nataiji_family_contacts')){
   const c=contacts.get(key(args[0],args[1],args[2]));return{rows:c?[c]:[],rowCount:c?1:0};
  }
  if(q.includes('DELETE FROM nataiji_family_contacts')){contacts.delete(key(args[0],args[1],args[2]));return{rows:[],rowCount:1}}
  if(q.includes('INSERT INTO nataiji_family_records')){
   const [id,actor_id,actor_name,actor_role,school_name,class_id,class_name,student_key,student_name,guardian_phone,kind,json,status,contact_scope,contact_class_id]=args;
   if(records.has(id))return{rows:[],rowCount:0};
   records.set(id,{id,actor_id,actor_name,actor_role,school_name,class_id,class_name,student_key,student_name,guardian_phone,kind,data:JSON.parse(json),status,contact_scope,contact_class_id,created_at:new Date().toISOString()});
   return{rows:[{id}],rowCount:1};
  }
  if(q.includes('FROM nataiji_family_records r INNER JOIN nataiji_family_contacts c')){
   const rows=[...records.values()].filter(r=>r.actor_id===args[0]&&r.status===args[1]&&contacts.get(key(r.contact_scope,r.contact_class_id,r.student_key))?.phone===r.guardian_phone);
   return{rows,rowCount:rows.length};
  }
  if(q.includes('SELECT id,actor_id FROM nataiji_family_records')){
   const r=records.get(args[0]);return{rows:r?[r]:[],rowCount:r?1:0};
  }
  if(q.includes('SELECT class_id,student_key,status,contact_scope,contact_class_id FROM nataiji_family_records')){
   const r=records.get(args[0]);return{rows:r&&r.actor_id===args[1]?[r]:[],rowCount:r&&r.actor_id===args[1]?1:0};
  }
  if(q.includes("SET guardian_phone=$3,status='pending'")){
   const r=records.get(args[0]);if(!r||r.actor_id!==args[1]||r.status!=='private')return{rows:[],rowCount:0};
   Object.assign(r,{guardian_phone:args[2],status:'pending',contact_scope:args[3],contact_class_id:args[4]});
   return{rows:[r],rowCount:1};
  }
  if(q.includes('UPDATE nataiji_family_records SET status=$3')){
   const r=records.get(args[0]);if(!r||r.actor_id!==args[1]||r.status==='cancelled'||!contacts.has(key(r.contact_scope,r.contact_class_id,r.student_key)))return{rows:[],rowCount:0};
   r.status=args[2];return{rows:[{id:r.id,status:r.status}],rowCount:1};
  }
  if(q.includes('UPDATE nataiji_family_records SET status=')){
   for(const r of records.values())if(r.contact_scope===args[0]&&r.contact_class_id===args[1]&&r.student_key===args[2])r.status='cancelled';
   return{rows:[],rowCount:1};
  }
  if(q.includes('FROM nataiji_family_records WHERE actor_id=$1 ORDER BY')){
   const rows=[...records.values()].filter(r=>r.actor_id===args[0]);return{rows,rowCount:rows.length};
  }
  throw Error('Unhandled SQL: '+q);
 }};
 const auth=(_req,_res,next)=>next(),ownerOnly=(req,res,next)=>req.user?.isSuperAdmin?next():res.status(403).json({error:'forbidden'});
 const professorProfile=async()=>({schoolName:'مدرسة نتائجي',classes:[{id:'c1',name:'1AS',sharedClassId:'shared-1',students:[{id:'s1',name:'أحمد'}]}]});
 const teacherSchool=async()=>({school:'مدرسة نتائجي',classes:[{id:'primary',name:'السنة الرابعة'}],classData:{primary:{pupils:[['123','فاطمة','','','','','','123']]}}});
 mountFamilyRoutes(app,{auth,ownerOnly,getPool:()=>db,loadProfessorProfile:professorProfile,loadTeacherSchool:teacherSchool,assignedClassIds:()=>['primary']});
 const prof={id:'prof-1',name:'الأستاذ',role:'professor',schoolId:'sch1'};
 const prof2={id:'prof-2',name:'أستاذ آخر',role:'professor',schoolId:'sch1'};
 const director={id:'director-1',name:'مدير',role:'admin',profileType:'director',schoolId:'sch1'};
 async function invoke(method,url,user,body={},query={},params={}){
  const handlers=routes.get(method+' '+url);assert(handlers,'Missing route '+method+' '+url);
  const req={user,body,query,params},res={code:200,status(n){this.code=n;return this},json(data){this.data=data;return this},setHeader(){}};
  for(const handler of handlers){let nexted=false;await handler(req,res,()=>{nexted=true});if(res.data||!nexted)break;}
  return res;
 }
 assert.equal((await invoke('PUT','/api/family/contacts',prof,{classId:'c1',studentKey:'s1',phone:'34123456',consent:false})).code,400);
 assert.equal((await invoke('GET','/api/family/contacts',prof,{}, {classId:'other'})).code,403);
 assert.equal((await invoke('PUT','/api/family/contacts',prof,{classId:'c1',studentKey:'s1',phone:'34123456',consent:true})).code,200);
 const shared=await invoke('GET','/api/family/contacts',prof2,{}, {classId:'c1'});
 assert.equal(shared.data.contacts[0].phone,'22234123456');
 const id='aabbccdd-1234-4123-8123-123456789abc';
 const create=await invoke('POST','/api/family/records',prof,{id,classId:'c1',studentKey:'s1',kind:'award',data:{awardType:'progress',reason:'اجتهاد'}});
 assert.equal(create.code,201);assert.equal(create.data.sent,false);assert.equal(create.data.queued,true);
 const own=await invoke('GET','/api/family/outbox',prof,{}, {status:'pending'});
 assert.equal(own.data.records.length,1);
 const other=await invoke('GET','/api/family/outbox',prof2,{}, {status:'pending'});
 assert.equal(other.data.records.length,0);
 assert.equal((await invoke('POST','/api/family/records/:id/status',prof2,{status:'sent'},{},{id})).code,404);
 const opened=await invoke('POST','/api/family/records/:id/status',prof,{status:'opened'},{},{id});
 assert.equal(opened.data.record.status,'opened');
 const sent=await invoke('POST','/api/family/records/:id/status',prof,{status:'sent'},{},{id});
 assert.equal(sent.data.record.status,'sent');
 const privateId='bbccddee-1234-4123-8123-123456789abc';
 const directorAward=await invoke('POST','/api/family/records',director,{id:privateId,classId:'primary',studentKey:'123',kind:'award',data:{awardType:'behavior'}});
 assert.equal(directorAward.code,201);assert.equal(directorAward.data.status,'private');
 assert.equal((await invoke('GET','/api/family/outbox',director)).data.records.length,0);
});

test('certificate PDF is generated as one real A4 landscape page, not portrait print preview',async()=>{
 const script=readFileSync(new URL('../public/family-engagement-v1.js',import.meta.url),'utf8');
 const start=script.indexOf(' function pdfFromJpeg('),end=script.indexOf(' async function awardPdfBlob(',start);
 assert(start>0&&end>start,'Missing direct certificate PDF builder');
 const pdfFromJpeg=new Function(script.slice(start,end)+'\nreturn pdfFromJpeg')();
 const jpg=Uint8Array.from([0xff,0xd8,0xff,0xe0,0x01,0x02,0xff,0xd9]);
 const blob=pdfFromJpeg(jpg);
 assert.equal(blob.type,'application/pdf');
 const bytes=Buffer.from(await blob.arrayBuffer()),text=bytes.toString('latin1');
 assert(text.startsWith('%PDF-1.4'));
 assert.match(text,/\/MediaBox \[0 0 841\.89 595\.28\]/);
 assert.match(text,/\/Subtype \/Image/);
 assert.match(text,/\/Filter \/DCTDecode/);
 assert.match(text,/\/Count 1/);
 const off=Number(text.match(/startxref\n(\d+)\n%%EOF/)[1]);
 assert.equal(text.slice(off,off+5),'xref\n');
});
