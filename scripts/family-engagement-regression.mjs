import test from 'node:test';
import assert from 'node:assert/strict';
import {initFamilySchema,mountFamilyRoutes,normalizeMauritaniaPhone} from '../src/family-engagement.js';

test('Mauritanian guardian phone normalization is strict',()=>{
  assert.equal(normalizeMauritaniaPhone('34 12 34 56'),'22234123456');
  assert.equal(normalizeMauritaniaPhone('+222 34 12 34 56'),'22234123456');
  assert.equal(normalizeMauritaniaPhone('00222 34 12 34 56'),'22234123456');
  assert.equal(normalizeMauritaniaPhone('123'),null);
  assert.equal(normalizeMauritaniaPhone('222 111 222 333 444'),null);
});

test('schema prepares audited queue with contacts',async()=>{
  const sql=[];
  await initFamilySchema({query:async text=>{sql.push(text)}});
  assert.equal(sql.some(s=>s.includes('nataiji_family_contacts')),true);
  assert.equal(sql.some(s=>s.includes('nataiji_family_records')),true);
});

test('teacher/professor may award independently; only queued, never auto-sent',async()=>{
  const routes=new Map(),contacts=new Map(),records=new Map();
  const reg=method=>(url,...handlers)=>routes.set(method+' '+url,handlers);
  const app={get:reg('GET'),post:reg('POST'),put:reg('PUT'),delete:reg('DELETE')};
  const db={query:async(sql,args=[])=>{
    const q=String(sql).replace(/\s+/g,' ');
    if(q.includes('DELETE FROM nataiji_family_contacts')){
      contacts.delete(args.join('/'));return {rowCount:1,rows:[]};
    }
    if(q.includes('INSERT INTO nataiji_family_contacts')){
      contacts.set(args.slice(0,3).join('/'),{phone:args[3],consent:true});
      return {rowCount:1,rows:[]};
    }
    if(q.includes('SELECT student_key,phone,consent FROM nataiji_family_contacts')){
      const rows=[...contacts.entries()].filter(([k])=>k.startsWith(args[0]+'/'+args[1]+'/')).map(([k,v])=>({student_key:k.split('/').at(-1),...v}));
      return {rowCount:rows.length,rows};
    }
    if(q.includes('SELECT phone FROM nataiji_family_contacts')){
      const record=contacts.get(args.join('/'));return {rowCount:record?1:0,rows:record?[{phone:record.phone}]:[]}
    }
    if(q.includes('INSERT INTO nataiji_family_records')){
      if(records.has(args[0]))return {rowCount:0,rows:[]};
      const [id,actor_id,actor_name,actor_role,school_name,class_id,class_name,student_key,student_name,guardian_phone,kind,data,status]=args;
      records.set(id,{id,actor_id,actor_name,actor_role,school_name,class_id,class_name,student_key,student_name,guardian_phone,kind,data:JSON.parse(data),status});
      return {rowCount:1,rows:[{id}]}
    }
    if(q.includes('SELECT class_id,student_key,status FROM nataiji_family_records')){const record=records.get(args[0]);return{rowCount:record&&record.actor_id===args[1]?1:0,rows:record&&record.actor_id===args[1]?[record]:[]}}
    if(q.includes('SELECT id,actor_id FROM nataiji_family_records')){
      const r=records.get(args[0]);return{rowCount:r?1:0,rows:r?[r]:[]}
    }
    if(q.includes("SET guardian_phone=$3,status='pending'")){const record=records.get(args[0]);if(!record||record.status!=='private'||record.actor_id!==args[1])return{rowCount:0,rows:[]};record.guardian_phone=args[2];record.status='pending';return{rowCount:1,rows:[record]}}
    if(q.includes('UPDATE nataiji_family_records')){
      const r=records.get(args[0]);if(!r)return{rowCount:0,rows:[]};
      r.status=args[1];return{rowCount:1,rows:[{id:r.id,status:r.status}]}
    }
    if(q.includes('FROM nataiji_family_records r INNER JOIN')&&q.includes('WHERE r.status=')){
      const rows=[...records.values()].filter(r=>r.status===args[0]);return{rowCount:rows.length,rows}
    }
    if(q.includes('FROM nataiji_family_records WHERE actor_id=')){
      const rows=[...records.values()].filter(r=>r.actor_id===args[0]);return{rowCount:rows.length,rows}
    }
    throw Error('Unexpected SQL: '+q)
  }};
  const auth=(req,res,next)=>next(),ownerOnly=(req,res,next)=>req.user?.isSuperAdmin?next():res.status(403).json({error:'forbidden'});
  mountFamilyRoutes(app,{auth,ownerOnly,getPool:()=>db,
    loadProfessorProfile:async()=>({schoolName:'École Nataiji',classes:[{id:'c1',name:'1AS',students:[{id:'s1',name:'Ahmed'}]}]}),
    loadTeacherSchool:async()=>({classes:[],classData:{}}),assignedClassIds:()=>[]
  });
  const user={id:'teacher-1',name:'Enseignant',role:'professor'};
  async function invoke(method,url,body={},usr=user,query={},params={}){
    const req={user:usr,body,query,params},res={code:200,status(n){this.code=n;return this},json(v){this.data=v;return this},setHeader(){}};
    const handlers=routes.get(method+' '+url);
    assert.ok(handlers,'missing '+url);
    for(const h of handlers){
      let called=false;const next=()=>{called=true};
      await h(req,res,next);
      if(res.data||!called)break;
    }
    return res;
  }
  assert.equal((await invoke('GET','/api/family/contacts',{},user,{classId:'other'})).code,403);
  assert.equal((await invoke('PUT','/api/family/contacts',{classId:'c1',studentKey:'s1',phone:'34123456',consent:false})).code,400);
  const id='bead1234-1234-4123-8123-123456789abc';
  const body={id,classId:'c1',studentKey:'s1',kind:'award',data:{awardType:'progress',reason:'اجتهاد ملحوظ'}};
  const created=await invoke('POST','/api/family/records',body);
  assert.equal(created.code,201);assert.equal(created.data.sent,false);
  assert.equal(created.data.queued,false);
  assert.equal(records.get(id).status,'private');
  const owner={id:'owner-1',role:'admin',isSuperAdmin:true};
  const beforeConsent=await invoke('GET','/api/family/owner/queue',{},owner,{status:'pending'});
  assert.equal(beforeConsent.data.records.length,0);
  const prematureShare=await invoke('POST','/api/family/records/:id/queue',{},user,{}, {id});
  assert.equal(prematureShare.code,409);
  assert.equal((await invoke('PUT','/api/family/contacts',{classId:'c1',studentKey:'s1',phone:'34123456',consent:true})).code,200);
  const ready=await invoke('POST','/api/family/records/:id/queue',{},user,{}, {id});
  assert.equal(ready.code,200);assert.equal(records.get(id).status,'pending');
  const ownQueue=await invoke('GET','/api/family/owner/queue',{},user,{status:'pending'});
  assert.equal(ownQueue.code,403);
  const pending=await invoke('GET','/api/family/owner/queue',{},owner,{status:'pending'});
  assert.equal(pending.data.records.length,1);
  assert.equal(pending.data.records[0].guardian_phone,'22234123456');
  const mark=await invoke('POST','/api/family/owner/records/:id/status',{status:'opened'},owner,{}, {id});
  assert.equal(mark.data.record.status,'opened');
  const sent=await invoke('POST','/api/family/owner/records/:id/status',{status:'sent'},owner,{}, {id});
  assert.equal(sent.data.record.status,'sent');
  assert.equal(records.get(id).status,'sent');
  const revoked=await invoke('DELETE','/api/family/contacts',{classId:'c1',studentKey:'s1'});
  assert.equal(revoked.data.revoked,true);
  assert.equal(contacts.size,0);
});
