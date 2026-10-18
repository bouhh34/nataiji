// Independent director class timetables: isolated by institution, academic year, and class.
// Timetables do not change grades, attendance, teaching assignments or staff accounts.
import crypto from 'node:crypto';
const days=new Set(['mon','tue','wed','thu','fri','sat']);
const clean=(s,max=160)=>String(s??'').trim().slice(0,max);
const normalizeTeacher=s=>clean(s,120).replace(/\s+/g,' ').toLocaleLowerCase();
const timeValue=s=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s)?Number(s.slice(0,2))*60+Number(s.slice(3)):null;
const conflict=(a,b)=>a.day===b.day&&timeValue(a.start)<timeValue(b.end)&&timeValue(b.start)<timeValue(a.end);
const publicSchedule=r=>({classKey:r.class_key,className:r.class_name,academicYear:r.academic_year,entries:r.entries,version:r.version,updatedAt:r.updated_at});
export function validateTimetableEntries(value){
 if(!Array.isArray(value)||value.length>100)return{error:'invalid_timetable_entries'};
 const entries=[];
 for(const raw of value){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return{error:'invalid_timetable_entry'};
  const day=clean(raw.day,12),start=clean(raw.start,12),end=clean(raw.end,12),
   subject=clean(raw.subject,120),teacher=clean(raw.teacher,120),room=clean(raw.room,80);
  const a=timeValue(start),b=timeValue(end);
  if(!days.has(day)||a===null||b===null||b<=a||b-a>240||!subject||subject.length>120)return{error:'invalid_timetable_entry'};
  entries.push({day,start,end,subject,teacher,room});
 }
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)if(conflict(entries[i],entries[j]))return{error:'class_schedule_overlap'};
 return{entries};
}
export async function initDirectorTimetableSchema(pool){
 if(!pool)return;
 await pool.query("CREATE TABLE IF NOT EXISTS nataiji_director_timetables (institution_id text NOT NULL REFERENCES nataiji_director_institutions(id), academic_year text NOT NULL, class_key text NOT NULL, class_name text NOT NULL, entries jsonb NOT NULL DEFAULT '[]'::jsonb, version integer NOT NULL DEFAULT 1, created_by text NOT NULL, updated_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(institution_id,academic_year,class_key))");
 await pool.query("CREATE INDEX IF NOT EXISTS nataiji_director_timetable_year_idx ON nataiji_director_timetables(institution_id,academic_year)");
}
export function mountDirectorTimetableRoutes(app,{auth,getPool,getProfessorClasses=async()=>[]}){
 const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
 const ensure=(req,res,next)=>{
  if(req.user?.role!=='admin'||req.user?.profileType!=='director'||req.user?.activeSharedGrant)return res.status(403).json({error:'director_required'});
  if(!getPool())return res.status(503).json({error:'durable_storage_required'});
  next();
 };
 async function own(req,res,next){
  const p=await getPool().query('SELECT * FROM nataiji_director_institutions WHERE director_user_id=$1 AND id=$2',[req.user.id,req.user.schoolId]);
  if(!p.rowCount)return res.status(404).json({error:'director_institution_missing'});
  req.directorInstitution=p.rows[0];
  next();
 }
 async function ownedClassOptions(req){
  const schoolId=req.directorInstitution.id,structure=await getPool().query('SELECT data FROM nataiji_structure WHERE school_id=$1',[schoolId]);
  const classes=Array.isArray(structure.rows[0]?.data?.classes)?structure.rows[0].data.classes:[];
  const rows=classes.map(c=>({classKey:'school:'+clean(c?.id,120),className:clean(c?.name||c?.code,120),source:'school'})).filter(c=>c.classKey.length>7&&c.className);
  // Only read the director's OWN teaching account. Linked teachers' profiles are private.
  if(['middle','secondary'].includes(req.directorInstitution.level)){
   const own=await getProfessorClasses(req.user.id);
   for(const c of (Array.isArray(own)?own:[]))if(c?.id&&c?.name)rows.push({classKey:'professor:'+clean(c.id,120),className:clean(c.name,120),source:'professor'});
  }
  return [...new Map(rows.map(x=>[x.classKey,x])).values()];
 }
 const scope=[auth,ensure,wrap(own)];
 app.get('/api/director/timetables',...scope,wrap(async(req,res)=>{
  const year=clean(req.directorInstitution.academic_year,20),id=req.directorInstitution.id;
  const [saved,owned]=await Promise.all([
   getPool().query('SELECT class_key,class_name,academic_year,entries,version,updated_at FROM nataiji_director_timetables WHERE institution_id=$1 AND academic_year=$2 ORDER BY class_name',[id,year]),
   ownedClassOptions(req)
  ]);
  const classes=new Map(owned.map(c=>[c.classKey,c]));
  for(const r of saved.rows)if(r.class_key.startsWith('manual:')||classes.has(r.class_key))classes.set(r.class_key,{classKey:r.class_key,className:r.class_name,source:r.class_key.startsWith('manual:')?'manual':classes.get(r.class_key).source});
  res.json({ok:true,academicYear:year,classes:[...classes.values()].sort((a,b)=>a.className.localeCompare(b.className,'fr')),timetables:saved.rows.map(publicSchedule).filter(x=>classes.has(x.classKey))});
 }));
 app.put('/api/director/timetables/:classKey',...scope,wrap(async(req,res)=>{
  const key=clean(req.params.classKey,180),year=clean(req.directorInstitution.academic_year,20),schoolId=req.directorInstitution.id,
   version=req.body?.expectedVersion,className=clean(req.body?.className,120),validation=validateTimetableEntries(req.body?.entries);
  if(!year||typeof version!=='number'||!Number.isInteger(version)||version<0||version>1000000||!className)return res.status(400).json({error:'invalid_timetable_request'});
  if(validation.error)return res.status(400).json({error:validation.error});
  const manual=/^manual:[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(key);
  if(!manual){
   const matched=(await ownedClassOptions(req)).find(x=>x.classKey===key);
   if(!matched)return res.status(400).json({error:'class_not_in_institution'});
  }
  const pool=getPool(),client=await pool.connect();
  try{
   await client.query('BEGIN');
   // One lock per institution/year serializes writes and prevents teacher double-booking.
   await client.query('SELECT pg_advisory_xact_lock(hashtext($1::text))',[schoolId+'|'+year+'|timetables']);
   const all=await client.query('SELECT class_key,class_name,entries,version FROM nataiji_director_timetables WHERE institution_id=$1 AND academic_year=$2',[schoolId,year]);
   const previous=all.rows.find(x=>x.class_key===key);
   if((previous?.version||0)!==version){await client.query('ROLLBACK');return res.status(409).json({error:'timetable_version_conflict',currentVersion:previous?.version||0})}
   // Do not let names collide with an existing timetable of a different class.
   if(all.rows.some(x=>x.class_key!==key&&x.class_name.trim().toLocaleLowerCase()===className.toLocaleLowerCase())){
    await client.query('ROLLBACK');return res.status(409).json({error:'timetable_class_name_conflict'});
   }
   for(const entry of validation.entries){
    if(!entry.teacher)continue;
    const name=normalizeTeacher(entry.teacher);
    const busy=all.rows.some(r=>r.class_key!==key&&Array.isArray(r.entries)&&r.entries.some(other=>normalizeTeacher(other.teacher)===name&&conflict(entry,other)));
    if(busy){await client.query('ROLLBACK');return res.status(409).json({error:'teacher_schedule_conflict',teacher:entry.teacher,day:entry.day,start:entry.start})}
   }
   const saved=await client.query("INSERT INTO nataiji_director_timetables(institution_id,academic_year,class_key,class_name,entries,version,created_by,updated_by) VALUES($1,$2,$3,$4,$5::jsonb,1,$6,$6) ON CONFLICT (institution_id,academic_year,class_key) DO UPDATE SET class_name=EXCLUDED.class_name,entries=EXCLUDED.entries,version=nataiji_director_timetables.version+1,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING *",
    [schoolId,year,key,className,JSON.stringify(validation.entries),req.user.id]);
   await client.query('COMMIT');res.json({ok:true,timetable:publicSchedule(saved.rows[0])});
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 }));
}
