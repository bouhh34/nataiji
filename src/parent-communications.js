/* Manual, mobile-first parent messages. No WhatsApp API, no automatic sending.
 * Teacher/professor awards are self-issued. The super-admin alone can open
 * the official Nataiji WhatsApp Business outbox from an authenticated session. */
import crypto from 'node:crypto';

const validPhone=value=>{
 const digits=String(value||'').replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[\s()+.-]/g,'');
 const d=digits.startsWith('00222')?digits.slice(5):digits.startsWith('222')&&digits.length===11?digits.slice(3):digits;
 return /^[0-9]{8}$/.test(d)?'+222'+d:'';
};
const text=(v,n=250)=>String(v??'').trim().slice(0,n);
const ratingSet=new Set(['excellent','very_good','good','needs_support','not_evaluated']);
const attendanceSet=new Set(['present','absent','late','not_recorded']);
const awardSet=new Set(['excellence','conduct','improvement','attendance','effort']);
export async function initParentCommunications(pool){
 await pool.query("CREATE TABLE IF NOT EXISTS nataiji_parent_contacts (scope_key text NOT NULL,class_id text NOT NULL,pupil_key text NOT NULL,phone text NOT NULL,consent boolean NOT NULL DEFAULT false,updated_by text NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(scope_key,class_id,pupil_key))");
 await pool.query("CREATE TABLE IF NOT EXISTS nataiji_parent_outbox (id uuid PRIMARY KEY,scope_key text NOT NULL,school_name text NOT NULL,class_id text NOT NULL,class_name text NOT NULL,pupil_key text NOT NULL,pupil_name text NOT NULL,phone text NOT NULL,kind text NOT NULL,payload jsonb NOT NULL,issued_by text NOT NULL,issued_by_name text NOT NULL,status text NOT NULL DEFAULT 'pending',created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz)");
 await pool.query("CREATE INDEX IF NOT EXISTS nataiji_parent_outbox_pending_idx ON nataiji_parent_outbox(status,created_at DESC)");
 await pool.query("CREATE INDEX IF NOT EXISTS nataiji_parent_outbox_owner_idx ON nataiji_parent_outbox(issued_by,created_at DESC)");
}
export function mountParentCommunications(app,{auth,professorSpaceActor,getPool,getProfessorProfile,getSchoolState,assignedClassIds,ownerOnly}){
 const available=(req,res,next)=>getPool()?next():res.status(503).json({error:'durable_storage_required'});
 const protectedRoutes=[auth,professorSpaceActor,available];
 async function workspace(req){
  const u=req.user;
  if(u.role==='professor'){
   const profile=await getProfessorProfile(u.id);
   return {scope:'professor:'+u.id,school:text(profile.schoolName||'مؤسسة تعليمية',160),classes:(profile.classes||[]).map(c=>({id:String(c.id),name:text(c.name,120)})),profile,professor:true};
  }
  if(!['teacher','admin'].includes(u.role)||!u.schoolId)throw Object.assign(new Error('forbidden'),{http:403});
  const full=await getSchoolState(u.schoolId);
  const allowed=u.role==='admin'?(full.classes||[]).map(x=>x.id):assignedClassIds(u,full);
  return {scope:'school:'+u.schoolId,school:text(full.school||'مؤسسة تعليمية',160),classes:(full.classes||[]).filter(c=>allowed.includes(c.id)).map(c=>({id:String(c.id),name:text(c.name,120)})),full,professor:false};
 }
 async function roster(req,w,classId){
  const cls=w.classes.find(c=>c.id===classId);
  if(!cls)throw Object.assign(new Error('forbidden_class'),{http:403});
  if(w.professor){
   const local=w.profile.classes.find(c=>String(c.id)===classId);
   return (local?.students||[]).map(s=>({id:String(s.id),name:text(s.name||s.nameFr,160)})).filter(s=>s.id&&s.name);
  }
  const pool=getPool();
  const rows=await pool.query("SELECT nns,data FROM nataiji_pupils WHERE school_id=$1 AND class_id=$2 ORDER BY position,updated_at",[req.user.schoolId,classId]);
  const migrated=await pool.query("SELECT 1 FROM nataiji_migrations WHERE school_id=$1 AND class_id=$2 AND resource='pupils' LIMIT 1",[req.user.schoolId,classId]);
  const source=migrated.rowCount?rows.rows.map(r=>({key:r.nns,p:r.data})):(w.full.classData?.[classId]?.pupils||[]).map(p=>({key:p?.[7]||p?.[0],p}));
  return source.map(({key,p})=>({id:String(key||''),name:text(p?.[1]||'',160)})).filter(s=>s.id&&s.name);
 }
 async function selected(req){
  const w=await workspace(req),classId=text(req.body?.classId||req.query?.classId,120),pupilKey=text(req.body?.pupilKey||req.params?.pupilKey,160);
  if(!classId||!pupilKey)throw Object.assign(new Error('missing_student'),{http:400});
  const pupils=await roster(req,w,classId),pupil=pupils.find(s=>s.id===pupilKey);
  if(!pupil)throw Object.assign(new Error('student_not_found'),{http:404});
  return {w,classId,pupil};
 }
 const guarded=handler=>async(req,res,next)=>{try{await handler(req,res)}catch(e){if(e.http)return res.status(e.http).json({error:e.message});next(e)}};
 app.get('/api/parent-communications/classes',...protectedRoutes,guarded(async(req,res)=>{
  const w=await workspace(req);res.json({ok:true,classes:w.classes,school:w.school});
 }));
 app.get('/api/parent-communications/students',...protectedRoutes,guarded(async(req,res)=>{
  const w=await workspace(req),classId=text(req.query.classId,120),students=await roster(req,w,classId);
  const contacts=(await getPool().query('SELECT pupil_key,phone,consent FROM nataiji_parent_contacts WHERE scope_key=$1 AND class_id=$2',[w.scope,classId])).rows;
  const byId=new Map(contacts.map(c=>[c.pupil_key,c]));
  res.json({ok:true,students:students.map(s=>({...s,phone:byId.get(s.id)?.phone||'',consent:byId.get(s.id)?.consent===true}))});
 }));
 app.put('/api/parent-communications/contacts/:pupilKey',...protectedRoutes,guarded(async(req,res)=>{
  const {w,classId,pupil}=await selected(req);
  const phone=validPhone(req.body?.phone),consent=req.body?.consent===true;
  if(!phone)return res.status(400).json({error:'invalid_mauritania_phone'});
  await getPool().query("INSERT INTO nataiji_parent_contacts(scope_key,class_id,pupil_key,phone,consent,updated_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(scope_key,class_id,pupil_key) DO UPDATE SET phone=$4,consent=$5,updated_by=$6,updated_at=now()",[w.scope,classId,pupil.id,phone,consent,req.user.id]);
  res.json({ok:true,phone,consent});
 }));
 app.post('/api/parent-communications/queue',...protectedRoutes,guarded(async(req,res)=>{
  const {w,classId,pupil}=await selected(req),kind=text(req.body?.kind,25);
  if(!['daily','award','result'].includes(kind))return res.status(400).json({error:'invalid_message_kind'});
  const contact=(await getPool().query('SELECT phone,consent FROM nataiji_parent_contacts WHERE scope_key=$1 AND class_id=$2 AND pupil_key=$3',[w.scope,classId,pupil.id])).rows[0];
  if(!contact?.consent||!validPhone(contact.phone))return res.status(409).json({error:'guardian_consent_required'});
  let payload={};
  if(kind==='daily'){
   const attendance=text(req.body?.attendance,30),rating=text(req.body?.rating,30);
   if(!attendanceSet.has(attendance)||!ratingSet.has(rating))return res.status(400).json({error:'invalid_daily_evaluation'});
   payload={attendance,rating,note:text(req.body?.note,500),date:new Date().toISOString().slice(0,10)};
  }else if(kind==='award'){
   const award=text(req.body?.award,30);
   if(!awardSet.has(award))return res.status(400).json({error:'invalid_award'});
   payload={award,note:text(req.body?.note,350),date:new Date().toISOString().slice(0,10),issuedWithoutDirectorApproval:true};
  }else{
   payload={date:new Date().toISOString().slice(0,10),noticeOnly:true};
  }
  const id=crypto.randomUUID(),className=w.classes.find(c=>c.id===classId).name;
  await getPool().query("INSERT INTO nataiji_parent_outbox(id,scope_key,school_name,class_id,class_name,pupil_key,pupil_name,phone,kind,payload,issued_by,issued_by_name) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12)",[id,w.scope,w.school,classId,className,pupil.id,pupil.name,contact.phone,kind,JSON.stringify(payload),req.user.id,text(req.user.name,160)]);
  res.status(201).json({ok:true,id,kind,status:'pending'});
 }));
 app.get('/api/parent-communications/mine',...protectedRoutes,guarded(async(req,res)=>{
  const rows=(await getPool().query("SELECT id,kind,pupil_name,class_name,payload,status,created_at FROM nataiji_parent_outbox WHERE issued_by=$1 ORDER BY created_at DESC LIMIT 50",[req.user.id])).rows;
  res.json({ok:true,items:rows});
 }));
 app.get('/api/parent-communications/outbox',auth,ownerOnly,available,guarded(async(req,res)=>{
  const status=text(req.query.status||'pending',20);
  if(!['pending','sent'].includes(status))return res.status(400).json({error:'invalid_status'});
  const rows=(await getPool().query('SELECT id,school_name,class_name,pupil_name,phone,kind,payload,issued_by_name,status,created_at,sent_at FROM nataiji_parent_outbox WHERE status=$1 ORDER BY created_at ASC LIMIT 100',[status])).rows;
  res.json({ok:true,items:rows});
 }));
 app.patch('/api/parent-communications/outbox/:id',auth,ownerOnly,available,guarded(async(req,res)=>{
  if(req.body?.status!=='sent'||!/^[0-9a-f-]{36}$/i.test(String(req.params.id)))return res.status(400).json({error:'invalid_status'});
  const r=await getPool().query("UPDATE nataiji_parent_outbox SET status='sent',sent_at=now() WHERE id=$1 AND status='pending' RETURNING id,status,sent_at",[req.params.id]);
  if(!r.rowCount)return res.status(409).json({error:'message_not_pending'});
  res.json({ok:true,item:r.rows[0]});
 }));
 app.get('/api/parent-communications/awards/:id',...protectedRoutes,guarded(async(req,res)=>{
  const r=req.user.isSuperAdmin?await getPool().query("SELECT id,school_name,class_name,pupil_name,payload,issued_by_name,created_at FROM nataiji_parent_outbox WHERE id=$1 AND kind='award'",[req.params.id]):await getPool().query("SELECT id,school_name,class_name,pupil_name,payload,issued_by_name,created_at FROM nataiji_parent_outbox WHERE id=$1 AND kind='award' AND issued_by=$2",[req.params.id,req.user.id]);
  if(!r.rowCount)return res.status(404).json({error:'award_not_found'});
  res.json({ok:true,award:r.rows[0]});
 }));
}
