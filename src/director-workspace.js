// Director workspace: additive, school-scoped routes. Never mutate legacy grades.
import crypto from 'node:crypto';

export const DIRECTOR_REGISTER_CATEGORIES = Object.freeze([
 'enrolment','correspondence','visits','visitor-log','daily-attendance',
 'supervision','student-absence','staff-meetings','inventory','referrals',
 'notice-board','model-lessons','teacher-health','student-health'
]);
const sensitive = new Set(['teacher-health','student-health']);
const levels = new Set(['primary','middle','secondary']);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const clean = (value,max=160) => String(value??'').trim().slice(0,max);
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value||'')) && !Number.isNaN(Date.parse(String(value)));
const isObject = value => value!==null && typeof value==='object' && !Array.isArray(value);

export async function initDirectorSchema(pool) {
 if(!pool) return;
 await pool.query("CREATE TABLE IF NOT EXISTS nataiji_director_institutions (id text PRIMARY KEY, director_user_id text NOT NULL, level text NOT NULL CHECK (level IN ('primary','middle','secondary')), name text NOT NULL, name_fr text NOT NULL DEFAULT '', region text NOT NULL DEFAULT '', district text NOT NULL DEFAULT '', academic_year text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())");
 await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS nataiji_director_one_institution_idx ON nataiji_director_institutions(director_user_id)");
 await pool.query("CREATE TABLE IF NOT EXISTS nataiji_director_memberships (institution_id text NOT NULL REFERENCES nataiji_director_institutions(id), user_id text NOT NULL, member_role text NOT NULL CHECK (member_role IN ('teacher','professor')), joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(institution_id,user_id))");
 await pool.query("CREATE TABLE IF NOT EXISTS nataiji_director_invites (id uuid PRIMARY KEY, institution_id text NOT NULL REFERENCES nataiji_director_institutions(id), code_hash text NOT NULL UNIQUE, created_by text NOT NULL, expires_at timestamptz NOT NULL, accepted_by text, accepted_at timestamptz, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now())");
 await pool.query("CREATE TABLE IF NOT EXISTS nataiji_director_registers (id uuid PRIMARY KEY, institution_id text NOT NULL REFERENCES nataiji_director_institutions(id), academic_year text NOT NULL DEFAULT '', category text NOT NULL, record_date date NOT NULL, reference text NOT NULL DEFAULT '', subject text NOT NULL, details jsonb NOT NULL DEFAULT '{}'::jsonb, version integer NOT NULL DEFAULT 1, client_mutation_id text, created_by text NOT NULL, updated_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz, UNIQUE (institution_id,client_mutation_id))");
 await pool.query("CREATE INDEX IF NOT EXISTS nataiji_director_register_lookup_idx ON nataiji_director_registers(institution_id,category,record_date DESC) WHERE deleted_at IS NULL");
 await pool.query("CREATE TABLE IF NOT EXISTS nataiji_director_audit (id bigserial PRIMARY KEY, institution_id text NOT NULL, actor_id text NOT NULL, record_id uuid, action text NOT NULL, before_data jsonb, after_data jsonb, occurred_at timestamptz NOT NULL DEFAULT now())");
 await pool.query("CREATE INDEX IF NOT EXISTS nataiji_director_audit_lookup_idx ON nataiji_director_audit(institution_id,occurred_at DESC)");
}

export function mountDirectorRoutes(app,{auth,getPool}) {
 function db(req,res,next){if(!getPool())return res.status(503).json({error:'durable_storage_required'});next()}
 const requireDirector=(req,res,next)=>req.user?.role==='director' && req.user?.profileType==='director'
  ?next():res.status(403).json({error:'director_required'});
 async function ownInstitution(req,res,next){
  const result=await getPool().query('SELECT * FROM nataiji_director_institutions WHERE director_user_id=$1',[req.user.id]);
  req.directorInstitution=result.rows[0]||null;
  if(!req.directorInstitution)return res.status(404).json({error:'director_institution_missing'});
  next();
 }
 const wrap=handler=>(req,res,next)=>Promise.resolve(handler(req,res,next)).catch(next);
 app.get('/api/director/catalog',auth,requireDirector,(_req,res)=>res.json({ok:true,levels:[...levels],registers:DIRECTOR_REGISTER_CATEGORIES.map(id=>({id,enabled:!sensitive.has(id)}))}));
 app.get('/api/director/institution',auth,requireDirector,db,wrap(async(req,res)=>{
  const result=await getPool().query('SELECT * FROM nataiji_director_institutions WHERE director_user_id=$1',[req.user.id]);
  res.json({ok:true,institution:result.rows[0]||null});
 }));
 app.post('/api/director/institution',auth,requireDirector,db,wrap(async(req,res)=>{
  const input=req.body||{},name=clean(input.name),level=clean(input.level),year=clean(input.academicYear,20);
  if(!name||!levels.has(level)||year.length>20)return res.status(400).json({error:'invalid_institution'});
  const id=String(req.user.schoolId||'');
  if(!id)return res.status(409).json({error:'director_school_missing'});
  const row=await getPool().query(
   'INSERT INTO nataiji_director_institutions (id,director_user_id,level,name,name_fr,region,district,academic_year) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING *',
   [id,req.user.id,level,name,clean(input.nameFr),clean(input.region),clean(input.district),year]);
  if(!row.rowCount)return res.status(409).json({error:'institution_already_exists'});
  res.status(201).json({ok:true,institution:row.rows[0]});
 }));
 app.patch('/api/director/institution',auth,requireDirector,db,wrap(ownInstitution),wrap(async(req,res)=>{
  const input=req.body||{},name=clean(input.name),level=clean(input.level);
  if(!name||!levels.has(level))return res.status(400).json({error:'invalid_institution'});
  const row=await getPool().query('UPDATE nataiji_director_institutions SET level=$3,name=$4,name_fr=$5,region=$6,district=$7,academic_year=$8,updated_at=now() WHERE id=$1 AND director_user_id=$2 RETURNING *',
   [req.directorInstitution.id,req.user.id,level,name,clean(input.nameFr),clean(input.region),clean(input.district),clean(input.academicYear,20)]);
  res.json({ok:true,institution:row.rows[0]});
 }));
 app.get('/api/director/overview',auth,requireDirector,db,wrap(ownInstitution),wrap(async(req,res)=>{
  const id=req.directorInstitution.id,pool=getPool();
  const [members,registers]=await Promise.all([
   pool.query('SELECT count(*)::int AS total FROM nataiji_director_memberships WHERE institution_id=$1',[id]),
   pool.query('SELECT category,count(*)::int AS total FROM nataiji_director_registers WHERE institution_id=$1 AND deleted_at IS NULL GROUP BY category',[id])]);
  res.json({ok:true,institution:req.directorInstitution,memberCount:members.rows[0]?.total||0,registerCounts:Object.fromEntries(registers.rows.map(x=>[x.category,x.total]))});
 }));
 app.post('/api/director/invitations',auth,requireDirector,db,wrap(ownInstitution),wrap(async(req,res)=>{
  const code='DIR-'+crypto.randomBytes(16).toString('hex').toUpperCase(),id=crypto.randomUUID();
  await getPool().query("INSERT INTO nataiji_director_invites(id,institution_id,code_hash,created_by,expires_at) VALUES($1,$2,$3,$4,now()+interval '7 days')",[id,req.directorInstitution.id,sha(code),req.user.id]);
  res.status(201).json({ok:true,code,expiresInDays:7}); // Show secret once.
 }));
 app.post('/api/director/invitations/accept',auth,db,wrap(async(req,res)=>{
  const role=req.user?.profileType;
  if(!['teacher','professor'].includes(role))return res.status(403).json({error:'staff_account_required'});
  const code=clean(req.body?.code,80).toUpperCase();
  if(!/^DIR-[A-F0-9]{32}$/.test(code))return res.status(400).json({error:'invalid_invitation'});
  const pool=getPool(),client=await pool.connect();
  try{
   await client.query('BEGIN');
   const invite=await client.query("SELECT * FROM nataiji_director_invites WHERE code_hash=$1 FOR UPDATE",[sha(code)]);
   const row=invite.rows[0];
   if(!row||row.revoked_at||row.accepted_by||new Date(row.expires_at)<=new Date()){await client.query('ROLLBACK');return res.status(409).json({error:'invitation_unavailable'})}
   const institution=await client.query('SELECT id,director_user_id FROM nataiji_director_institutions WHERE id=$1',[row.institution_id]);
   if(!institution.rowCount||institution.rows[0].director_user_id===req.user.id){await client.query('ROLLBACK');return res.status(403).json({error:'invalid_membership'})}
   await client.query('INSERT INTO nataiji_director_memberships(institution_id,user_id,member_role) VALUES($1,$2,$3) ON CONFLICT (institution_id,user_id) DO NOTHING',[row.institution_id,req.user.id,role]);
   await client.query('UPDATE nataiji_director_invites SET accepted_by=$2,accepted_at=now() WHERE id=$1',[row.id,req.user.id]);
   await client.query('COMMIT');res.json({ok:true,institutionId:row.institution_id});
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 }));
 app.get('/api/director/members',auth,requireDirector,db,wrap(ownInstitution),wrap(async(req,res)=>{
  const rows=await getPool().query('SELECT user_id,member_role,joined_at FROM nataiji_director_memberships WHERE institution_id=$1 ORDER BY joined_at DESC',[req.directorInstitution.id]);
  res.json({ok:true,members:rows.rows});
 }));
 app.delete('/api/director/members/:userId',auth,requireDirector,db,wrap(ownInstitution),wrap(async(req,res)=>{
  await getPool().query('DELETE FROM nataiji_director_memberships WHERE institution_id=$1 AND user_id=$2',[req.directorInstitution.id,req.params.userId]);
  res.json({ok:true});
 }));
 app.delete('/api/director/membership/:institutionId',auth,db,wrap(async(req,res)=>{
  await getPool().query('DELETE FROM nataiji_director_memberships WHERE institution_id=$1 AND user_id=$2',[req.params.institutionId,req.user.id]);
  res.json({ok:true});
 }));
 app.get('/api/director/registers',auth,requireDirector,db,wrap(ownInstitution),wrap(async(req,res)=>{
  const category=clean(req.query.category,40),limit=Math.min(100,Math.max(1,Number(req.query.limit)||30));
  if(category&&!DIRECTOR_REGISTER_CATEGORIES.includes(category))return res.status(400).json({error:'invalid_register_category'});
  const result=await getPool().query('SELECT id,category,academic_year,record_date,reference,subject,details,version,created_at,updated_at FROM nataiji_director_registers WHERE institution_id=$1 AND deleted_at IS NULL AND ($2::text IS NULL OR category=$2) ORDER BY record_date DESC,created_at DESC LIMIT $3',[req.directorInstitution.id,category||null,limit]);
  res.json({ok:true,records:result.rows});
 }));
 app.post('/api/director/registers',auth,requireDirector,db,wrap(ownInstitution),wrap(async(req,res)=>{
  const input=req.body||{},category=clean(input.category,40),subject=clean(input.subject,240),date=clean(input.recordDate,20),details=input.details||{},mutationId=clean(input.clientMutationId,64);
  if(!DIRECTOR_REGISTER_CATEGORIES.includes(category))return res.status(400).json({error:'invalid_register_category'});
  if(sensitive.has(category))return res.status(403).json({error:'sensitive_register_not_enabled'});
  if(!subject||!validDate(date)||!isObject(details)||JSON.stringify(details).length>8000)return res.status(400).json({error:'invalid_register_record'});
  const id=crypto.randomUUID(),institutionId=req.directorInstitution.id,pool=getPool(),client=await pool.connect();
  try{
   await client.query('BEGIN');
   const inserted=await client.query('INSERT INTO nataiji_director_registers(id,institution_id,academic_year,category,record_date,reference,subject,details,client_mutation_id,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$10) ON CONFLICT (institution_id,client_mutation_id) DO NOTHING RETURNING *',
    [id,institutionId,req.directorInstitution.academic_year,category,date,clean(input.reference,100),subject,JSON.stringify(details),mutationId||null,req.user.id]);
   const record=inserted.rows[0]||(mutationId?(await client.query('SELECT * FROM nataiji_director_registers WHERE institution_id=$1 AND client_mutation_id=$2',[institutionId,mutationId])).rows[0]:null);
   if(!record){await client.query('ROLLBACK');return res.status(409).json({error:'record_conflict'})}
   if(inserted.rowCount)await client.query('INSERT INTO nataiji_director_audit(institution_id,actor_id,record_id,action,after_data) VALUES($1,$2,$3,$4,$5::jsonb)',[institutionId,req.user.id,record.id,'create',JSON.stringify(record)]);
   await client.query('COMMIT');res.status(inserted.rowCount?201:200).json({ok:true,record});
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 }));
 app.patch('/api/director/registers/:id',auth,requireDirector,db,wrap(ownInstitution),wrap(async(req,res)=>{
  const input=req.body||{},version=Number(input.version),subject=clean(input.subject,240),date=clean(input.recordDate,20),details=input.details||{};
  if(!Number.isInteger(version)||version<1||!subject||!validDate(date)||!isObject(details)||JSON.stringify(details).length>8000)return res.status(400).json({error:'invalid_register_record'});
  const pool=getPool(),client=await pool.connect();
  try{
   await client.query('BEGIN');
   const prev=await client.query('SELECT * FROM nataiji_director_registers WHERE id=$1 AND institution_id=$2 AND deleted_at IS NULL FOR UPDATE',[req.params.id,req.directorInstitution.id]);
   if(!prev.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'register_record_not_found'})}
   if(sensitive.has(prev.rows[0].category)){await client.query('ROLLBACK');return res.status(403).json({error:'sensitive_register_not_enabled'})}
   if(prev.rows[0].version!==version){await client.query('ROLLBACK');return res.status(409).json({error:'record_version_conflict'})}
   const result=await client.query('UPDATE nataiji_director_registers SET subject=$3,record_date=$4,reference=$5,details=$6::jsonb,version=version+1,updated_by=$7,updated_at=now() WHERE id=$1 AND institution_id=$2 RETURNING *',[req.params.id,req.directorInstitution.id,subject,date,clean(input.reference,100),JSON.stringify(details),req.user.id]);
   await client.query('INSERT INTO nataiji_director_audit(institution_id,actor_id,record_id,action,before_data,after_data) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb)',[req.directorInstitution.id,req.user.id,req.params.id,'update',JSON.stringify(prev.rows[0]),JSON.stringify(result.rows[0])]);
   await client.query('COMMIT');res.json({ok:true,record:result.rows[0]});
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 }));
 app.get('/api/director/audit',auth,requireDirector,db,wrap(ownInstitution),wrap(async(req,res)=>{
  const rows=await getPool().query('SELECT id,actor_id,record_id,action,occurred_at FROM nataiji_director_audit WHERE institution_id=$1 ORDER BY occurred_at DESC LIMIT 100',[req.directorInstitution.id]);
  res.json({ok:true,events:rows.rows});
 }));
}
