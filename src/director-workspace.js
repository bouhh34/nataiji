import crypto from 'node:crypto';

export const DIRECTOR_REGISTER_TYPES = Object.freeze([
  'student_enrolment','correspondence','visits','persons','daily_attendance',
  'supervision','student_absence','meetings','furniture','referrals',
  'notices','model_lessons','teacher_health','student_health'
]);
const REGISTER_SET = new Set(DIRECTOR_REGISTER_TYPES);
const SCHOOL_LEVELS = new Set(['primary','middle','secondary']);
const isUUID = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
const field = (v, n=200) => String(v ?? '').trim().slice(0, n);
const hash = v => crypto.createHash('sha256').update(String(v)).digest('hex');
const errorCode = e => e?.code === '23505' ? 409 : 500;
const safeRecord = r => ({id:r.id,type:r.type,subject:r.subject,date:r.entry_date,year:r.school_year,serial:r.serial,details:r.details,version:r.version,createdAt:r.created_at,updatedAt:r.updated_at});
const manager = (req,res,next) => req.user?.profileType === 'director' && !req.user.activeSharedGrant && req.user.schoolId ? next() : res.status(403).json({error:'director_only'});

export async function initializeDirectorSchema(pool) {
  await pool.query('CREATE TABLE IF NOT EXISTS nataiji_director_institutions (school_id text PRIMARY KEY,owner_user_id text NOT NULL UNIQUE,name text NOT NULL,name_fr text NOT NULL DEFAULT \'\',level text NOT NULL,wilaya text NOT NULL DEFAULT \'\',district text NOT NULL DEFAULT \'\',academic_year text NOT NULL DEFAULT \'\',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())');
  await pool.query('CREATE TABLE IF NOT EXISTS nataiji_director_members (school_id text NOT NULL,user_id text NOT NULL,member_role text NOT NULL DEFAULT \'teacher\',joined_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(school_id,user_id))');
  await pool.query('CREATE INDEX IF NOT EXISTS nataiji_director_members_user_idx ON nataiji_director_members(user_id)');
  await pool.query('CREATE TABLE IF NOT EXISTS nataiji_director_invites (token_hash text PRIMARY KEY,school_id text NOT NULL,created_by text NOT NULL,expires_at timestamptz NOT NULL,used_by text,used_at timestamptz,created_at timestamptz NOT NULL DEFAULT now())');
  await pool.query('CREATE INDEX IF NOT EXISTS nataiji_director_invites_school_idx ON nataiji_director_invites(school_id,created_at DESC)');
  await pool.query('CREATE TABLE IF NOT EXISTS nataiji_director_students (id uuid PRIMARY KEY,school_id text NOT NULL,school_year text NOT NULL,register_no text NOT NULL,name text NOT NULL,name_fr text NOT NULL DEFAULT \'\',class_name text NOT NULL DEFAULT \'\',created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(school_id,school_year,register_no))');
  await pool.query('CREATE INDEX IF NOT EXISTS nataiji_director_students_school_idx ON nataiji_director_students(school_id,school_year)');
  await pool.query('CREATE TABLE IF NOT EXISTS nataiji_director_serials (school_id text NOT NULL,school_year text NOT NULL,type text NOT NULL,current_serial integer NOT NULL,PRIMARY KEY(school_id,school_year,type))');
  await pool.query('CREATE TABLE IF NOT EXISTS nataiji_director_registers (id uuid PRIMARY KEY,school_id text NOT NULL,school_year text NOT NULL,type text NOT NULL,subject text NOT NULL,entry_date date NOT NULL,serial integer NOT NULL,details jsonb NOT NULL DEFAULT \'{}\'::jsonb,created_by text NOT NULL,request_id uuid NOT NULL,version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(school_id,request_id),UNIQUE(school_id,school_year,type,serial))');
  await pool.query('CREATE INDEX IF NOT EXISTS nataiji_director_registers_school_idx ON nataiji_director_registers(school_id,type,entry_date DESC)');
}

export function registerDirectorRoutes(app,{auth,getPool}) {
  function withDb(req,res,next) { if(!getPool()) return res.status(503).json({error:'durable_storage_required'}); next(); }
  async function ownInstitution(req) {
    return (await getPool().query('SELECT * FROM nataiji_director_institutions WHERE school_id=$1 AND owner_user_id=$2',[req.user.schoolId,req.user.id])).rows[0] || null;
  }
  async function mustOwn(req,res) {
    const s=await ownInstitution(req);
    if(!s) {res.status(404).json({error:'director_institution_missing'});return null;}
    return s;
  }
  app.get('/api/director/overview',auth,manager,withDb,async (req,res) => {
    const s=await ownInstitution(req);
    if(!s) return res.json({ok:true,institution:null,stats:{students:0,members:0,registers:0}});
    const [students,members,registers]=await Promise.all([
      getPool().query('SELECT count(*)::int AS n FROM nataiji_director_students WHERE school_id=$1 AND school_year=$2',[s.school_id,s.academic_year]),
      getPool().query('SELECT count(*)::int AS n FROM nataiji_director_members WHERE school_id=$1',[s.school_id]),
      getPool().query('SELECT count(*)::int AS n FROM nataiji_director_registers WHERE school_id=$1 AND school_year=$2',[s.school_id,s.academic_year])
    ]);
    res.json({ok:true,institution:s,stats:{students:students.rows[0].n,members:members.rows[0].n,registers:registers.rows[0].n}});
  });
  app.put('/api/director/institution',auth,manager,withDb,async (req,res) => {
    const name=field(req.body?.name,160),nameFr=field(req.body?.nameFr,160),level=field(req.body?.level,20),wilaya=field(req.body?.wilaya,120),district=field(req.body?.district,120),year=field(req.body?.academicYear,30);
    if(!name||!SCHOOL_LEVELS.has(level)||!/^20\d{2}-20\d{2}$/.test(year)||Number(year.slice(5))!==Number(year.slice(0,4))+1) return res.status(400).json({error:'invalid_institution'});
    const previous=await ownInstitution(req);
    if(previous && (previous.level!==level || previous.academic_year!==year)) {
      const existing=await getPool().query('SELECT 1 FROM nataiji_director_registers WHERE school_id=$1 LIMIT 1',[req.user.schoolId]);
      if(existing.rowCount && previous.level!==level) return res.status(409).json({error:'level_change_requires_migration'});
    }
    const q=await getPool().query('INSERT INTO nataiji_director_institutions(school_id,owner_user_id,name,name_fr,level,wilaya,district,academic_year) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(school_id) DO UPDATE SET name=EXCLUDED.name,name_fr=EXCLUDED.name_fr,level=EXCLUDED.level,wilaya=EXCLUDED.wilaya,district=EXCLUDED.district,academic_year=EXCLUDED.academic_year,updated_at=now() WHERE nataiji_director_institutions.owner_user_id=EXCLUDED.owner_user_id RETURNING *',[req.user.schoolId,req.user.id,name,nameFr,level,wilaya,district,year]);
    if(!q.rowCount) return res.status(403).json({error:'forbidden'});
    res.json({ok:true,institution:q.rows[0]});
  });
  app.get('/api/director/students',auth,manager,withDb,async (req,res) => {
    const s=await mustOwn(req,res);if(!s)return;
    const q=await getPool().query('SELECT id,school_year AS year,register_no AS "registerNo",name,name_fr AS "nameFr",class_name AS "className" FROM nataiji_director_students WHERE school_id=$1 AND school_year=$2 ORDER BY register_no LIMIT 500',[s.school_id,s.academic_year]);
    res.json({ok:true,students:q.rows});
  });
  app.post('/api/director/students',auth,manager,withDb,async (req,res) => {
    const s=await mustOwn(req,res);if(!s)return;
    const name=field(req.body?.name,160),nameFr=field(req.body?.nameFr,160),registerNo=field(req.body?.registerNo,60),className=field(req.body?.className,120);
    if(!name||!registerNo)return res.status(400).json({error:'invalid_student'});
    try {
      const q=await getPool().query('INSERT INTO nataiji_director_students(id,school_id,school_year,register_no,name,name_fr,class_name) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[crypto.randomUUID(),s.school_id,s.academic_year,registerNo,name,nameFr,className]);
      res.status(201).json({ok:true,id:q.rows[0].id});
    } catch(e) {if(errorCode(e)===409)return res.status(409).json({error:'register_number_exists'});throw e;}
  });
  app.get('/api/director/registers',auth,manager,withDb,async(req,res)=>{
    const s=await mustOwn(req,res);if(!s)return;
    const type=field(req.query.type,40),year=field(req.query.year,30)||s.academic_year;
    if(type && !REGISTER_SET.has(type))return res.status(400).json({error:'invalid_register_type'});
    const q=await getPool().query('SELECT * FROM nataiji_director_registers WHERE school_id=$1 AND school_year=$2 AND ($3::text=\'\' OR type=$3) ORDER BY entry_date DESC,created_at DESC LIMIT 100',[s.school_id,year,type]);
    res.json({ok:true,registers:q.rows.map(safeRecord)});
  });
  app.post('/api/director/registers',auth,manager,withDb,async(req,res)=>{
    const s=await mustOwn(req,res);if(!s)return;
    const type=field(req.body?.type,40),subject=field(req.body?.subject,250),date=field(req.body?.date,20),requestId=String(req.body?.requestId||''),details=req.body?.details;
    if(!REGISTER_SET.has(type)||!subject||!isUUID(requestId)||!/^20\d{2}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||!details||typeof details!=='object'||Array.isArray(details)||JSON.stringify(details).length>12000)return res.status(400).json({error:'invalid_register'});
    const client=await getPool().connect();
    try {
      await client.query('BEGIN');
      const duplicate=await client.query('SELECT * FROM nataiji_director_registers WHERE school_id=$1 AND request_id=$2',[s.school_id,requestId]);
      if(duplicate.rowCount){await client.query('COMMIT');return res.json({ok:true,register:safeRecord(duplicate.rows[0]),duplicate:true});}
      const no=await client.query('INSERT INTO nataiji_director_serials(school_id,school_year,type,current_serial) VALUES($1,$2,$3,1) ON CONFLICT(school_id,school_year,type) DO UPDATE SET current_serial=nataiji_director_serials.current_serial+1 RETURNING current_serial',[s.school_id,s.academic_year,type]);
      const row=await client.query('INSERT INTO nataiji_director_registers(id,school_id,school_year,type,subject,entry_date,serial,details,created_by,request_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10) RETURNING *',[crypto.randomUUID(),s.school_id,s.academic_year,type,subject,date,no.rows[0].current_serial,JSON.stringify(details),req.user.id,requestId]);
      await client.query('COMMIT');res.status(201).json({ok:true,register:safeRecord(row.rows[0])});
    } catch(e){await client.query('ROLLBACK');if(errorCode(e)===409)return res.status(409).json({error:'duplicate_request'});throw e;}finally{client.release();}
  });
  app.patch('/api/director/registers/:id',auth,manager,withDb,async(req,res)=>{
    const s=await mustOwn(req,res);if(!s)return;
    const id=field(req.params.id,50),version=Number(req.body?.version),subject=field(req.body?.subject,250),details=req.body?.details;
    if(!isUUID(id)||!Number.isInteger(version)||version<1||!subject||!details||typeof details!=='object'||Array.isArray(details)||JSON.stringify(details).length>12000)return res.status(400).json({error:'invalid_register'});
    const q=await getPool().query('UPDATE nataiji_director_registers SET subject=$3,details=$4::jsonb,version=version+1,updated_at=now() WHERE school_id=$1 AND id=$2 AND version=$5 RETURNING *',[s.school_id,id,subject,JSON.stringify(details),version]);
    if(!q.rowCount)return res.status(409).json({error:'record_changed_or_missing'});
    res.json({ok:true,register:safeRecord(q.rows[0])});
  });
  app.get('/api/director/members',auth,manager,withDb,async(req,res)=>{
    const s=await mustOwn(req,res);if(!s)return;
    const q=await getPool().query('SELECT user_id AS id,member_role AS role,joined_at FROM nataiji_director_members WHERE school_id=$1 ORDER BY joined_at DESC',[s.school_id]);
    res.json({ok:true,members:q.rows});
  });
  app.post('/api/director/invites',auth,manager,withDb,async(req,res)=>{
    const s=await mustOwn(req,res);if(!s)return;
    const code=crypto.randomBytes(9).toString('hex').toUpperCase();
    await getPool().query('INSERT INTO nataiji_director_invites(token_hash,school_id,created_by,expires_at) VALUES($1,$2,$3,now()+interval \'7 days\')',[hash(code),s.school_id,req.user.id]);
    res.status(201).json({ok:true,code,expiresInDays:7});
  });
  app.post('/api/director/invites/accept',auth,withDb,async(req,res)=>{
    if(!['teacher','professor'].includes(req.user.profileType)||req.user.activeSharedGrant)return res.status(403).json({error:'teacher_or_professor_required'});
    const code=field(req.body?.code,60).toUpperCase();
    if(!/^[A-F0-9]{18}$/.test(code))return res.status(400).json({error:'invalid_invitation'});
    const client=await getPool().connect();
    try{
      await client.query('BEGIN');
      const invite=await client.query('SELECT * FROM nataiji_director_invites WHERE token_hash=$1 FOR UPDATE',[hash(code)]);
      const row=invite.rows[0];
      if(!row||row.used_by||new Date(row.expires_at).getTime()<Date.now()){await client.query('ROLLBACK');return res.status(400).json({error:'invitation_unavailable'});}
      if(row.created_by===req.user.id){await client.query('ROLLBACK');return res.status(403).json({error:'self_join_not_allowed'});}
      const institution=await client.query('SELECT name FROM nataiji_director_institutions WHERE school_id=$1',[row.school_id]);
      if(!institution.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'director_institution_missing'});}
      await client.query('INSERT INTO nataiji_director_members(school_id,user_id,member_role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[row.school_id,req.user.id,req.user.profileType]);
      await client.query('UPDATE nataiji_director_invites SET used_by=$2,used_at=now() WHERE token_hash=$1',[hash(code),req.user.id]);
      await client.query('COMMIT');res.json({ok:true,institutionName:institution.rows[0].name});
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  });
  app.get('/api/director/my-memberships',auth,withDb,async(req,res)=>{
    const q=await getPool().query('SELECT m.school_id,i.name,i.level,m.member_role FROM nataiji_director_members m JOIN nataiji_director_institutions i ON i.school_id=m.school_id WHERE m.user_id=$1',[req.user.id]);
    res.json({ok:true,memberships:q.rows});
  });
  app.delete('/api/director/members/:id',auth,manager,withDb,async(req,res)=>{
    const s=await mustOwn(req,res);if(!s)return;
    const q=await getPool().query('DELETE FROM nataiji_director_members WHERE school_id=$1 AND user_id=$2 RETURNING user_id',[s.school_id,field(req.params.id,150)]);
    res.json({ok:true,removed:q.rowCount>0});
  });
}
