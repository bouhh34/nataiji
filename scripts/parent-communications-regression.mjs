import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initParentCommunications,mountParentCommunications} from '../src/parent-communications.js';

const teacher={id:'teacher-one',role:'teacher',name:'المعلم أحمد',schoolId:'school-one',classIds:['class-a'],permissions:['reports']};
const owner={id:'owner',role:'admin',isSuperAdmin:true,name:'نتائجي',schoolId:'school-one'};
function setup(){
 const contacts=new Map(),outbox=new Map(),routes=new Map(),statements=[];
 const pool={async query(sql,args=[]){
  statements.push(sql);
  if(sql.startsWith('CREATE ')||sql.startsWith('CREATE INDEX'))return {rows:[],rowCount:0};
  if(sql.includes('FROM nataiji_pupils'))return {rows:[],rowCount:0};
  if(sql.includes('FROM nataiji_migrations'))return {rows:[],rowCount:0};
  if(sql.startsWith('INSERT INTO nataiji_parent_contacts')){
   const [scope,cls,pupil,phone,consent,by]=args;
   contacts.set(scope+':'+cls+':'+pupil,{pupil_key:pupil,phone,consent,updated_by:by});return {rows:[],rowCount:1};
  }
  if(sql.includes('FROM nataiji_parent_contacts WHERE scope_key')&&sql.includes('pupil_key=$3')){
   const c=contacts.get(args[0]+':'+args[1]+':'+args[2]);return {rows:c?[c]:[],rowCount:c?1:0};
  }
  if(sql.includes('FROM nataiji_parent_contacts WHERE scope_key')){
   return {rows:[...contacts.values()].filter(c=>c.updated_by===teacher.id),rowCount:contacts.size};
  }
  if(sql.startsWith('INSERT INTO nataiji_parent_outbox')){
   const [id,scope,school,classId,className,pupilId,pupilName,phone,kind,payload,issuedBy,issuedByName,status]=args;
   outbox.set(id,{id,scope_key:scope,school_name:school,class_id:classId,class_name:className,pupil_key:pupilId,pupil_name:pupilName,phone,kind,payload:JSON.parse(payload),issued_by:issuedBy,issued_by_name:issuedByName,status});
   return {rows:[],rowCount:1};
  }
  if(sql.includes('FROM nataiji_parent_outbox WHERE id=$1 AND issued_by=$2')){const row=outbox.get(args[0]);return {rows:row&&row.issued_by===args[1]?[row]:[],rowCount:row&&row.issued_by===args[1]?1:0}}
  if(sql.startsWith("UPDATE nataiji_parent_outbox SET status='pending'")){const row=outbox.get(args[0]);if(!row||row.status!=='private'||row.issued_by!==args[1])return {rows:[],rowCount:0};row.status='pending';row.phone=args[2];return {rows:[row],rowCount:1}}
  if(sql.includes('FROM nataiji_parent_outbox WHERE issued_by=$1')){
   const items=[...outbox.values()].filter(x=>x.issued_by===args[0]);
   return {rows:items,rowCount:items.length};
  }
  if(sql.includes('FROM nataiji_parent_outbox WHERE status=$1')){
   const items=[...outbox.values()].filter(x=>x.status===args[0]);
   return {rows:items,rowCount:items.length};
  }
  if(sql.startsWith('UPDATE nataiji_parent_outbox SET status=')){
   const row=outbox.get(args[0]);if(!row||row.status!=='pending')return {rows:[],rowCount:0};
   row.status='sent';return {rows:[row],rowCount:1};
  }
  if(sql.includes("FROM nataiji_parent_outbox WHERE id=$1 AND kind='award'")){
   const row=outbox.get(args[0]);return {rows:row?.kind==='award'&&row.issued_by===args[1]?[row]:[],rowCount:row?.kind==='award'&&row.issued_by===args[1]?1:0};
  }
  throw Error('Unexpected SQL: '+sql);
 }};
 const app={get:(path,...handlers)=>routes.set('GET '+path,handlers),put:(path,...handlers)=>routes.set('PUT '+path,handlers),post:(path,...handlers)=>routes.set('POST '+path,handlers),patch:(path,...handlers)=>routes.set('PATCH '+path,handlers)};
 const auth=(req,res,next)=>next(),professorSpaceActor=auth,ownerOnly=(req,res,next)=>req.user.isSuperAdmin?next():res.status(403).json({error:'forbidden'});
 const school={school:'مدرسة نموذجية',classes:[{id:'class-a',name:'الرابعة'},{id:'class-b',name:'الخامسة'}],classData:{'class-a':{pupils:[['', 'أحمد محمد','','','','','','p-123']]},'class-b':{pupils:[['','فاطمة','','','','','','p-456']]}}};
 mountParentCommunications(app,{auth,professorSpaceActor,ownerOnly,getPool:()=>pool,getSchoolState:async()=>school,assignedClassIds:()=>['class-a'],getProfessorProfile:async()=>({schoolName:'إعدادية',classes:[{id:'prof-a',name:'1AS',students:[{id:'stud-1',name:'محمد'}]}]})});
 async function request(method,path,{user=teacher,body={},params={},query={}}={}){
  const h=routes.get(method+' '+path);assert.ok(h,'route registered '+method+' '+path);
  let code=200,payload,passed=true;
  const res={status(n){code=n;return this},json(v){payload=v;return this}};
  for(const handler of h){
   if(payload!==undefined||!passed)break;
   passed=false;
   await handler({user,body,params,query},res,(error)=>{if(error)throw error;passed=true});
  }
  return {code,payload};
 }
 return {pool,request,contacts,outbox,statements};
}
test('Contact consent and teacher-issued award are scoped without director approval',async()=>{
 const x=setup();await initParentCommunications(x.pool);
 const forbidden=await x.request('GET','/api/parent-communications/students',{query:{classId:'class-b'}});
 assert.equal(forbidden.code,403);
 const premature=await x.request('POST','/api/parent-communications/queue',{body:{classId:'class-a',pupilKey:'p-123',kind:'award',award:'excellence'}});
 assert.equal(premature.code,201);assert.equal(premature.payload.status,'private');
 const contact=await x.request('PUT','/api/parent-communications/contacts/:pupilKey',{params:{pupilKey:'p-123'},body:{classId:'class-a',phone:'44112233',consent:true}});
 assert.equal(contact.payload.phone,'+22244112233');
 const award=await x.request('POST','/api/parent-communications/queue',{body:{classId:'class-a',pupilKey:'p-123',kind:'award',award:'excellence',note:'أحسنت'}});
 assert.equal(award.code,201);assert.equal(award.payload.status,'pending');assert.equal(x.outbox.size,2);
 assert.equal([...x.outbox.values()][0].issued_by,teacher.id);
 const cert=await x.request('GET','/api/parent-communications/awards/:id',{params:{id:award.payload.id}});
 assert.equal(cert.code,200);
 const ownerOnly=await x.request('GET','/api/parent-communications/outbox',{query:{status:'pending'}});
 assert.equal(ownerOnly.code,403);
 const list=await x.request('GET','/api/parent-communications/outbox',{user:owner,query:{status:'pending'}});
 assert.equal(list.code,200);assert.equal(list.payload.items.length,1);
 const mark=await x.request('PATCH','/api/parent-communications/outbox/:id',{user:owner,params:{id:award.payload.id},body:{status:'sent'}});
 assert.equal(mark.code,200);
});
test('Daily data is validated; ordinary teacher cannot access unrelated class',async()=>{
 const x=setup();
 const denied=await x.request('PUT','/api/parent-communications/contacts/:pupilKey',{params:{pupilKey:'p-456'},body:{classId:'class-b',phone:'44112233',consent:true}});
 assert.equal(denied.code,403);
 const valid=await x.request('PUT','/api/parent-communications/contacts/:pupilKey',{params:{pupilKey:'p-123'},body:{classId:'class-a',phone:'44112233',consent:false}});
 assert.equal(valid.code,200);
 const blocked=await x.request('POST','/api/parent-communications/queue',{body:{classId:'class-a',pupilKey:'p-123',kind:'daily',attendance:'present',rating:'good'}});
 assert.equal(blocked.code,201);assert.equal(blocked.payload.status,'private');
 assert.equal(x.outbox.size,1);
 const withoutConsent=await x.request('POST','/api/parent-communications/mine/:id/share',{params:{id:blocked.payload.id}});
 assert.equal(withoutConsent.code,409);
 await x.request('PUT','/api/parent-communications/contacts/:pupilKey',{params:{pupilKey:'p-123'},body:{classId:'class-a',phone:'44112233',consent:true}});
 const ready=await x.request('POST','/api/parent-communications/mine/:id/share',{params:{id:blocked.payload.id}});
 assert.equal(ready.code,200);assert.equal(ready.payload.item.status,'pending');
});
test('Mobile source uses manual WhatsApp handoff, not background API sending',()=>{
 const client=readFileSync(new URL('../public/parent-communications-v1.js',import.meta.url),'utf8');
 assert.match(client,/https:\/\/wa\.me\//);
 assert.match(client,/window\.open\(url/);
 assert.match(client,/status:'sent'/);
 assert.doesNotMatch(client,/graph\.facebook\.com/);
});
