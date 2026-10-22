import crypto from 'node:crypto';

/* Teacher/professor/director can manually send to guardian via own WhatsApp.
   No WhatsApp API or unattended bulk sends. Issuing awards never needs approval. */
const awardTypes = new Set(['excellence','effort','behavior','attendance','progress','subject']);
const attendanceTypes = new Set(['present','late','absent','excused','not-recorded']);
const assessmentTypes = new Set(['excellent','very-good','good','needs-support','not-recorded']);
const cleanText = (value,max) => String(value ?? '').trim().slice(0,max);
export function normalizeMauritaniaPhone(input) {
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
    contact_scope text NOT NULL DEFAULT '', contact_class_id text NOT NULL DEFAULT '',
    opened_at timestamptz, marked_sent_at timestamptz
  )`);
  await pool.query("ALTER TABLE nataiji_family_records ADD COLUMN IF NOT EXISTS contact_scope text NOT NULL DEFAULT ''");
  await pool.query("ALTER TABLE nataiji_family_records ADD COLUMN IF NOT EXISTS contact_class_id text NOT NULL DEFAULT ''");
  await pool.query("UPDATE nataiji_family_records SET contact_scope=actor_id,contact_class_id=class_id WHERE contact_scope=''");
  await pool.query("CREATE INDEX IF NOT EXISTS nataiji_family_records_queue_idx ON nataiji_family_records(status,created_at DESC)");
  await pool.query("CREATE INDEX IF NOT EXISTS nataiji_family_records_actor_idx ON nataiji_family_records(actor_id,created_at DESC)");
  await pool.query("CREATE TABLE IF NOT EXISTS nataiji_family_certificate_links (token_hash text PRIMARY KEY, record_id uuid NOT NULL, actor_id text NOT NULL, phone text NOT NULL, pdf bytea NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now())");
  await pool.query("CREATE INDEX IF NOT EXISTS nataiji_family_certificate_expiry_idx ON nataiji_family_certificate_links(expires_at)");

}

export function mountFamilyRoutes(app,{auth,ownerOnly,getPool,loadProfessorProfile,loadTeacherSchool,assignedClassIds}){
  const db=(req,res,next)=>getPool()?next():res.status(503).json({error:'durable_storage_required'});
  const allowedUser=user=>['teacher','professor'].includes(user?.role)||user?.role==='admin'&&!user?.activeSharedGrant;
  async function contactLocation(user,classId){
    if(user.role==='professor'||user.role==='admin'&&user.profileType==='director'){
      const profile=await loadProfessorProfile(user.id),cls=(profile.classes||[]).find(c=>String(c.id)===classId);
      if(cls)return{scope:cls.sharedClassId?'shared:'+String(cls.sharedClassId):'professor:'+user.id,classId:String(cls.sharedClassId||cls.id)};
      if(user.role==='professor')return null;
    }
    return user.schoolId?{scope:'school:'+user.schoolId,classId}:null;
  }
  async function studentFor(user,classId,studentKey){
    if(user.role==='professor'||user.role==='admin'&&user.profileType==='director'){
      const profile=await loadProfessorProfile(user.id);
      const cls=(profile.classes||[]).find(x=>String(x.id)===classId);
      if(cls){const st=(cls.students||[]).find(s=>String(s.id)===studentKey);return st?{name:cleanText(st.name||st.nameFr,160),className:cleanText(cls.name,120),schoolName:cleanText(profile.schoolName,160)}:null}
      if(user.role==='professor')return null;
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
  async function activeStudentKeys(user,classId){
    if(user.role==='professor'||user.role==='admin'&&user.profileType==='director'){
      const profile=await loadProfessorProfile(user.id);
      const cls=(profile.classes||[]).find(x=>String(x.id)===classId);
      if(cls)return new Set((cls.students||[]).map(st=>String(st.id)));
      if(user.role==='professor')return null;
    }
    const school=await loadTeacherSchool(user.schoolId);
    if(user.role==='teacher'&&!assignedClassIds(user,school).some(x=>String(x)===classId))return null;
    if(!(school.classes||[]).some(x=>String(x.id)===classId))return null;
    return new Set((school.classData?.[classId]?.pupils||[]).map(p=>String(p?.[7]||p?.[0]||'')));
  }
  const author=(req,res,next)=>allowedUser(req.user)?next():res.status(403).json({error:'forbidden'});
  app.get('/api/family/classes',auth,db,author,async(req,res)=>{
    const classes=[];
    if(req.user.role==='professor'||req.user.profileType==='director'){
      const profile=await loadProfessorProfile(req.user.id);
      for(const c of profile.classes||[]){
        classes.push({id:String(c.id),name:cleanText(c.name,120),schoolName:cleanText(profile.schoolName,160),
          students:(c.students||[]).map(st=>({id:String(st.id),name:cleanText(st.name||st.nameFr,160)}))});
      }
      if(req.user.role==='professor')return res.json({ok:true,classes});
    }
    if(req.user.schoolId){
      const school=await loadTeacherSchool(req.user.schoolId);
      const accessible=req.user.role==='teacher'?new Set(assignedClassIds(req.user,school).map(String)):null;
      for(const cls of school.classes||[]){
        const classId=String(cls.id);
        if(accessible&&!accessible.has(classId))continue;
        if(classes.some(c=>c.id===classId))continue;
        const pupils=school.classData?.[classId]?.pupils||[];
        classes.push({id:classId,name:cleanText(cls.name,120),schoolName:cleanText(school.school,160),
          students:pupils.map(p=>({id:String(p?.[7]||p?.[0]||''),name:cleanText(p?.[1],160)})).filter(st=>st.id&&st.name)});
      }
    }
    res.setHeader('Cache-Control','no-store');
    res.json({ok:true,classes});
  });
  app.get('/api/family/contacts',auth,db,author,async(req,res)=>{
    const classId=cleanText(req.query.classId,120);
    if(!classId)return res.status(400).json({error:'missing_class'});
    const validKeys=await activeStudentKeys(req.user,classId);
    if(!validKeys)return res.status(403).json({error:'forbidden_class'});
    const loc=await contactLocation(req.user,classId);if(!loc)return res.status(403).json({error:'forbidden_class'});
    const rows=await getPool().query('SELECT student_key,phone,consent FROM nataiji_family_contacts WHERE actor_id=$1 AND class_id=$2',[loc.scope,loc.classId]);
    res.json({ok:true,contacts:rows.rows.filter(row=>validKeys.has(String(row.student_key)))});
  });
  app.put('/api/family/contacts',auth,db,author,async(req,res)=>{
    const classId=cleanText(req.body?.classId,120),studentKey=cleanText(req.body?.studentKey,120);
    const phone=normalizeMauritaniaPhone(req.body?.phone);
    if(!classId||!studentKey||!phone||req.body?.consent!==true)return res.status(400).json({error:'phone_and_parent_consent_required'});
    const student=await studentFor(req.user,classId,studentKey);
    if(!student)return res.status(403).json({error:'student_not_authorized'});
    const loc=await contactLocation(req.user,classId);if(!loc)return res.status(403).json({error:'forbidden_class'});
    await getPool().query(`INSERT INTO nataiji_family_contacts(actor_id,class_id,student_key,phone,consent,updated_at)
      VALUES($1,$2,$3,$4,true,now()) ON CONFLICT(actor_id,class_id,student_key)
      DO UPDATE SET phone=EXCLUDED.phone,consent=true,updated_at=now()`,[loc.scope,loc.classId,studentKey,phone]);
    // A changed destination invalidates queued messages for the previous phone.
    await getPool().query("UPDATE nataiji_family_records SET status='cancelled',guardian_phone='' WHERE contact_scope=$1 AND contact_class_id=$2 AND student_key=$3 AND guardian_phone<>$4 AND status IN ('pending','opened')",[loc.scope,loc.classId,studentKey,phone]);
    res.json({ok:true,phone});
  });
  app.delete('/api/family/contacts',auth,db,author,async(req,res)=>{
    const classId=cleanText(req.body?.classId,120),studentKey=cleanText(req.body?.studentKey,120);
    if(!classId||!studentKey)return res.status(400).json({error:'invalid_contact'});
    const student=await studentFor(req.user,classId,studentKey);if(!student)return res.status(403).json({error:'student_not_authorized'});
    const loc=await contactLocation(req.user,classId);if(!loc)return res.status(403).json({error:'forbidden_class'});
    await getPool().query('DELETE FROM nataiji_family_contacts WHERE actor_id=$1 AND class_id=$2 AND student_key=$3',[loc.scope,loc.classId,studentKey]);
    await getPool().query("UPDATE nataiji_family_records SET status='cancelled',guardian_phone='' WHERE contact_scope=$1 AND contact_class_id=$2 AND student_key=$3 AND status IN ('pending','opened')",[loc.scope,loc.classId,studentKey]);
    res.json({ok:true,revoked:true})
  });
  app.post('/api/family/records',auth,db,author,async(req,res)=>{
    const {id}=req.body||{},classId=cleanText(req.body?.classId,120),studentKey=cleanText(req.body?.studentKey,120),
      kind=cleanText(req.body?.kind,20),raw=req.body?.data||{};
    if(!isUuid(id)||!classId||!studentKey||!['daily','award','results'].includes(kind))return res.status(400).json({error:'invalid_record'});
    const student=await studentFor(req.user,classId,studentKey);
    if(!student)return res.status(403).json({error:'student_not_authorized'});
    const loc=await contactLocation(req.user,classId);if(!loc)return res.status(403).json({error:'forbidden_class'});
    const contact=await getPool().query('SELECT phone FROM nataiji_family_contacts WHERE actor_id=$1 AND class_id=$2 AND student_key=$3 AND consent=true',[loc.scope,loc.classId,studentKey]);
    if(!contact.rowCount&&kind==='results')return res.status(400).json({error:'parent_contact_and_consent_required'});
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
    const phone=contact.rows[0]?.phone||'',messageStatus=phone?'pending':'private';
    const result=await getPool().query(`INSERT INTO nataiji_family_records
       (id,actor_id,actor_name,actor_role,school_name,class_id,class_name,student_key,student_name,guardian_phone,kind,data,status,contact_scope,contact_class_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15)
       ON CONFLICT(id) DO NOTHING RETURNING id`,
       [id,req.user.id,cleanText(req.user.name,160),req.user.role,student.schoolName,classId,student.className,studentKey,student.name,phone,kind,JSON.stringify(data),messageStatus,loc.scope,loc.classId]);
    if(!result.rowCount){
      const existing=await getPool().query('SELECT id,actor_id FROM nataiji_family_records WHERE id=$1',[id]);
      if(existing.rows[0]?.actor_id!==req.user.id)return res.status(409).json({error:'record_id_conflict'});
    }
    res.status(201).json({ok:true,id,queued:!!phone,status:messageStatus,sent:false,studentName:student.name,schoolName:student.schoolName,className:student.className,data});
  });
  app.post('/api/family/records/:id/queue',auth,db,author,async(req,res)=>{
    const id=String(req.params.id||'');
    if(!isUuid(id))return res.status(400).json({error:'invalid_record'});
    const r=await getPool().query("SELECT class_id,student_key,status,contact_scope,contact_class_id FROM nataiji_family_records WHERE id=$1 AND actor_id=$2",[id,req.user.id]);
    const row=r.rows[0];if(!row||row.status!=='private')return res.status(409).json({error:'record_not_private'});
    const allowed=await studentFor(req.user,String(row.class_id),String(row.student_key));
    if(!allowed)return res.status(403).json({error:'student_not_authorized'});
    const loc=await contactLocation(req.user,String(row.class_id));if(!loc)return res.status(403).json({error:'forbidden_class'});
    const contact=await getPool().query('SELECT phone FROM nataiji_family_contacts WHERE actor_id=$1 AND class_id=$2 AND student_key=$3 AND consent=true',[loc.scope,loc.classId,row.student_key]);
    if(!contact.rowCount)return res.status(409).json({error:'parent_contact_and_consent_required'});
    const saved=await getPool().query("UPDATE nataiji_family_records SET guardian_phone=$3,status='pending',contact_scope=$4,contact_class_id=$5 WHERE id=$1 AND actor_id=$2 AND status='private' RETURNING id,status",[id,req.user.id,contact.rows[0].phone,loc.scope,loc.classId]);
    if(!saved.rowCount)return res.status(409).json({error:'record_status_changed'});
    res.json({ok:true,record:saved.rows[0]});
  });

  // Share only this educator's award with a guardian who consented to messages.
  app.post('/api/family/certificate-links',auth,db,author,async(req,res)=>{
    const id=String(req.body?.recordId||''),phone=normalizeMauritaniaPhone(req.body?.phone),
      data=String(req.body?.pdfBase64||'');
    if(!isUuid(id)||!phone||!data||data.length>980000||
       !/^[A-Za-z0-9+/]+={0,2}$/.test(data)||data.length%4!==0)
      return res.status(400).json({error:'invalid_certificate_payload'});
    const pdf=Buffer.from(data,'base64');
    if(pdf.byteLength<100||pdf.byteLength>735000||
       pdf.subarray(0,5).toString('latin1')!=='%PDF-'||
       !pdf.subarray(Math.max(0,pdf.length-120)).toString('latin1').includes('%%EOF'))
      return res.status(400).json({error:'invalid_certificate_pdf'});
    const record=await getPool().query(
      "SELECT r.id FROM nataiji_family_records r INNER JOIN nataiji_family_contacts c ON c.actor_id=r.contact_scope AND c.class_id=r.contact_class_id AND c.student_key=r.student_key AND c.phone=$3 AND c.consent=true WHERE r.id=$1 AND r.actor_id=$2 AND r.kind='award' AND r.status IN ('pending','opened','sent') LIMIT 1",
      [id,req.user.id,phone]);
    if(!record.rowCount)return res.status(403).json({error:'guardian_consent_or_award_required'});
    const token=crypto.randomBytes(32).toString('hex');
    const hash=crypto.createHash('sha256').update(token).digest('hex');
    await getPool().query("DELETE FROM nataiji_family_certificate_links WHERE expires_at<now() OR (record_id=$1 AND actor_id=$2)",[id,req.user.id]);
    await getPool().query("INSERT INTO nataiji_family_certificate_links (token_hash,record_id,actor_id,phone,pdf,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '7 days')",[hash,id,req.user.id,phone,pdf]);
    res.setHeader('Cache-Control','no-store');
    res.json({ok:true,url:'/api/family/certificate-links/'+token,expiresInDays:7});
  });
  // Token is unguessable; no account login is needed for the parent to view.
  // A revoked consent or changed guardian number instantly blocks the link.
  app.get('/api/family/certificate-links/:token',async(req,res)=>{
    const token=String(req.params.token||'');
    if(!/^[a-f0-9]{64}$/.test(token))return res.status(404).end();
    if(!getPool())return res.status(503).end();
    const hash=crypto.createHash('sha256').update(token).digest('hex');
    const result=await getPool().query(
      "SELECT l.pdf FROM nataiji_family_certificate_links l INNER JOIN nataiji_family_records r ON r.id=l.record_id AND r.actor_id=l.actor_id INNER JOIN nataiji_family_contacts c ON c.actor_id=r.contact_scope AND c.class_id=r.contact_class_id AND c.student_key=r.student_key AND c.phone=l.phone AND c.consent=true WHERE l.token_hash=$1 AND l.expires_at>now() AND r.kind='award' AND r.status NOT IN ('cancelled','private') LIMIT 1",
      [hash]);
    if(!result.rowCount)return res.status(404).end();
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','inline; filename="certificat-scolaire.pdf"');
    res.setHeader('Cache-Control','private, no-store, max-age=0');
    res.setHeader('X-Robots-Tag','noindex, noarchive');
    res.setHeader('Referrer-Policy','no-referrer');
    return res.end(result.rows[0].pdf);
  });
  app.get('/api/family/records',auth,db,author,async(req,res)=>{
    const rows=await getPool().query(`SELECT id,class_id,student_key,student_name,class_name,school_name,kind,data,status,created_at
      FROM nataiji_family_records WHERE actor_id=$1 ORDER BY created_at DESC LIMIT 60`,[req.user.id]);
    res.json({ok:true,records:rows.rows});
  });
  // Per-user outbox: only the signed-in teacher, professor or director can
  // open a parent's number in their own WhatsApp account.
  app.get('/api/family/outbox',auth,db,author,async(req,res)=>{
    const statuses=['pending','opened','sent'];
    const status=statuses.includes(req.query.status)?req.query.status:'pending';
    const rows=await getPool().query(`SELECT r.id,r.actor_id,r.actor_name,r.actor_role,r.student_name,r.student_key,
      r.class_name,r.class_id,r.school_name,r.guardian_phone,r.kind,r.data,r.status,r.created_at,r.opened_at,r.marked_sent_at
      FROM nataiji_family_records r INNER JOIN nataiji_family_contacts c
      ON c.actor_id=r.contact_scope AND c.class_id=r.contact_class_id AND c.student_key=r.student_key
      AND c.phone=r.guardian_phone AND c.consent=true
      WHERE r.actor_id=$1 AND r.status=$2 ORDER BY r.created_at DESC LIMIT 150`,[req.user.id,status]);
    res.setHeader('Cache-Control','no-store');res.json({ok:true,records:rows.rows,status});
  });
  app.post('/api/family/records/:id/status',auth,db,author,async(req,res)=>{
    const id=String(req.params.id||''),status=String(req.body?.status||'');
    if(!isUuid(id)||!['opened','sent','pending'].includes(status))return res.status(400).json({error:'invalid_status'});
    const rows=await getPool().query(`UPDATE nataiji_family_records
       SET status=$3,opened_at=CASE WHEN $3='opened' THEN now() ELSE opened_at END,
       marked_sent_at=CASE WHEN $3='sent' THEN now() ELSE NULL END
       WHERE id=$1 AND actor_id=$2 AND status <> 'cancelled'
       AND EXISTS(SELECT 1 FROM nataiji_family_contacts c
         WHERE c.actor_id=nataiji_family_records.contact_scope
         AND c.class_id=nataiji_family_records.contact_class_id
         AND c.student_key=nataiji_family_records.student_key
         AND c.phone=nataiji_family_records.guardian_phone AND c.consent=true)
       RETURNING id,status`,[id,req.user.id,status]);
    if(!rows.rowCount)return res.status(404).json({error:'record_not_found'});
    res.json({ok:true,record:rows.rows[0]});
  });
}
