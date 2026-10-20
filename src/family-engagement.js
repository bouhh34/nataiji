import crypto from 'node:crypto';

/* Manual, mobile-first WhatsApp relay: ONLY the Nataiji owner opens a
   prepared message in WhatsApp Business. No WhatsApp API and no automatic sends.
   Teacher/professor awards need no director approval. */
const awardTypes = new Set(['excellence','effort','behavior','attendance','progress','subject']);
const attendanceTypes = new Set(['present','late','absent','excused','not-recorded']);
const assessmentTypes = new Set(['excellent','very-good','good','needs-support','not-recorded']);
const cleanText = (value,max) => String(value ?? '').trim().slice(0,max);
function normalizeMauritaniaPhone(input) {
  const raw=String(input||'').replace(/[\s().-]/g,'');
  const digits=raw.replace(/^\+/,'').replace(/^00/,'');
  const eight=digits.startsWith('222')&&digits.length===11?digits.slice(3):digits;
  return /^\d{8}$/.test(eight)?'222'+eight:null;
}
const isUuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s||''));

export async function initFamilySchema(pool){
  if(!pool)return;
  await pool.query(`CREATE TABLE IF NOT EXISTS nataiji_family_contacts (
    actor_id text NOT NULL, class_id text NOT NULL, student_key text NOT NULL,
    phone text NOT NULL, consent boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(actor_id,class_id,student_key)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS nataiji_family_records (
    id uuid PRIMARY KEY, actor_id text NOT NULL, actor_name text NOT NULL,
    actor_role text NOT NULL, school_name text NOT NULL, class_id text NOT NULL,
    class_name text NOT NULL, student_key text NOT NULL, student_name text NOT NULL,
    guardian_phone text NOT NULL, kind text NOT NULL, data jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    opened_at timestamptz, marked_sent_at timestamptz
  )`);
  await pool.query("CREATE INDEX IF NOT EXISTS nataiji_family_records_queue_idx ON nataiji_family_records(status,created_at DESC)");
  await pool.query("CREATE INDEX IF NOT EXISTS nataiji_family_records_actor_idx ON nataiji_family_records(actor_id,created_at DESC)");
}

export function mountFamilyRoutes(app,{auth,ownerOnly,getPool,loadProfessorProfile,loadTeacherSchool,assignedClassIds}){
  const db=(req,res,next)=>getPool()?next():res.status(503).json({error:'durable_storage_required'});
  const allowedUser=user=>['teacher','professor'].includes(user?.role)||user?.role==='admin'&&!user?.activeSharedGrant&&user?.profileType!=='director';
  async function studentFor(user,classId,studentKey){
    if(user.role==='professor'){
      const profile=await loadProfessorProfile(user.id);
      const cls=(profile.classes||[]).find(x=>String(x.id)===classId);
      if(!cls)return null;
      const st=(cls.students||[]).find(s=>String(s.id)===studentKey);
      return st?{name:cleanText(st.name||st.nameFr,160),className:cleanText(cls.name,120),schoolName:cleanText(profile.schoolName,160)}:null;
    }
    const school=await loadTeacherSchool(user.schoolId);
    const classes=school?.classes||[];
    if(user.role==='teacher'&&!assignedClassIds(user,school).some(id=>String(id)===classId))return null;
    const cls=classes.find(c=>String(c.id)===classId);
    if(!cls)return null;
    const data=school.classData?.[classId]||{};
    const p=(data.pupils||[]).find(p=>String(p?.[7]||p?.[0])===studentKey);
    return p?{name:cleanText(p[1],160),className:cleanText(cls.name,120),schoolName:cleanText(school.school,160)}:null;
  }
  const author=(req,res,next)=>allowedUser(req.user)?next():res.status(403).json({error:'forbidden'});
  app.get('/api/family/contacts',auth,db,author,async(req,res)=>{
    const classId=cleanText(req.query.classId,120);
    if(!classId)return res.status(400).json({error:'missing_class'});
    const rows=await getPool().query('SELECT student_key,phone,consent FROM nataiji_family_contacts WHERE actor_id=$1 AND class_id=$2',[req.user.id,classId]);
    res.json({ok:true,contacts:rows.rows});
  });
  app.put('/api/family/contacts',auth,db,author,async(req,res)=>{
    const classId=cleanText(req.body?.classId,120),studentKey=cleanText(req.body?.studentKey,120);
    const phone=normalizeMauritaniaPhone(req.body?.phone);
    if(!classId||!studentKey||!phone||req.body?.consent!==true)return res.status(400).json({error:'phone_and_parent_consent_required'});
    const student=await studentFor(req.user,classId,studentKey);
    if(!student)return res.status(403).json({error:'student_not_authorized'});
    await getPool().query(`INSERT INTO nataiji_family_contacts(actor_id,class_id,student_key,phone,consent,updated_at)
      VALUES($1,$2,$3,$4,true,now()) ON CONFLICT(actor_id,class_id,student_key)
      DO UPDATE SET phone=EXCLUDED.phone,consent=true,updated_at=now()`,[req.user.id,classId,studentKey,phone]);
    res.json({ok:true,phone});
  });
  app.post('/api/family/records',auth,db,author,async(req,res)=>{
    const {id}=req.body||{},classId=cleanText(req.body?.classId,120),studentKey=cleanText(req.body?.studentKey,120),
      kind=cleanText(req.body?.kind,20),raw=req.body?.data||{};
    if(!isUuid(id)||!classId||!studentKey||!['daily','award','results'].includes(kind))return res.status(400).json({error:'invalid_record'});
    const student=await studentFor(req.user,classId,studentKey);
    if(!student)return res.status(403).json({error:'student_not_authorized'});
    const contact=await getPool().query('SELECT phone FROM nataiji_family_contacts WHERE actor_id=$1 AND class_id=$2 AND student_key=$3 AND consent=true',[req.user.id,classId,studentKey]);
    if(!contact.rowCount)return res.status(400).json({error:'parent_contact_and_consent_required'});
    let data={};
    if(kind==='daily'){
      if(!attendanceTypes.has(raw.attendance)||!assessmentTypes.has(raw.assessment))return res.status(400).json({error:'invalid_daily_assessment'});
      data={attendance:raw.attendance,assessment:raw.assessment,note:cleanText(raw.note,600),date:cleanText(raw.date,10)};
      if(!/^\d{4}-\d{2}-\d{2}$/.test(data.date))return res.status(400).json({error:'invalid_date'});
    }else if(kind==='award'){
      if(!awardTypes.has(raw.awardType))return res.status(400).json({error:'invalid_award_type'});
      data={awardType:raw.awardType,reason:cleanText(raw.reason,350),date:new Date().toISOString().slice(0,10)};
    }else {
      data={term:cleanText(raw.term,100),note:cleanText(raw.note,300),date:new Date().toISOString().slice(0,10)};
    }
    const phone=contact.rows[0].phone;
    const result=await getPool().query(`INSERT INTO nataiji_family_records
       (id,actor_id,actor_name,actor_role,school_name,class_id,class_name,student_key,student_name,guardian_phone,kind,data)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
       ON CONFLICT(id) DO NOTHING RETURNING id`,
       [id,req.user.id,cleanText(req.user.name,160),req.user.role,student.schoolName,classId,student.className,studentKey,student.name,phone,kind,JSON.stringify(data)]);
    if(!result.rowCount){
      const existing=await getPool().query('SELECT id,actor_id FROM nataiji_family_records WHERE id=$1',[id]);
      if(existing.rows[0]?.actor_id!==req.user.id)return res.status(409).json({error:'record_id_conflict'});
    }
    res.status(201).json({ok:true,id,queued:true,sent:false,studentName:student.name,schoolName:student.schoolName,className:student.className,data});
  });
  app.get('/api/family/records',auth,db,author,async(req,res)=>{
    const rows=await getPool().query(`SELECT id,student_name,class_name,school_name,kind,data,status,created_at
      FROM nataiji_family_records WHERE actor_id=$1 ORDER BY created_at DESC LIMIT 60`,[req.user.id]);
    res.json({ok:true,records:rows.rows});
  });
  app.get('/api/family/owner/queue',auth,ownerOnly,db,async(req,res)=>{
    const statuses=['pending','opened','sent'];
    const status=statuses.includes(req.query.status)?req.query.status:'pending';
    const rows=await getPool().query(`SELECT id,actor_id,actor_name,actor_role,student_name,class_name,school_name,
      guardian_phone,kind,data,status,created_at,opened_at,marked_sent_at
      FROM nataiji_family_records WHERE status=$1 ORDER BY created_at ASC LIMIT 100`,[status]);
    res.setHeader('Cache-Control','no-store');
    res.json({ok:true,records:rows.rows,status});
  });
  app.post('/api/family/owner/records/:id/status',auth,ownerOnly,db,async(req,res)=>{
    const id=String(req.params.id||''),status=String(req.body?.status||'');
    if(!isUuid(id)||!['opened','sent','pending'].includes(status))return res.status(400).json({error:'invalid_status'});
    const rows=await getPool().query(`UPDATE nataiji_family_records
       SET status=$2,opened_at=CASE WHEN $2='opened' THEN now() ELSE opened_at END,
       marked_sent_at=CASE WHEN $2='sent' THEN now() ELSE NULL END
       WHERE id=$1 RETURNING id,status`,[id,status]);
    if(!rows.rowCount)return res.status(404).json({error:'record_not_found'});
    res.json({ok:true,record:rows.rows[0]});
  });
}
