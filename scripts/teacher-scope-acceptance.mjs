import { spawn } from 'node:child_process';
import { Pool } from 'pg';

const port=3223;
const base=`http://127.0.0.1:${port}`;
const ownerEmail='teacher.scope.owner@example.com';
const teacherEmail='teacher.scope.member@example.com';

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required for teacher scope acceptance');

const server=spawn(process.execPath,['--import','./src/gmail-mail-bridge.js','src/server.js'],{
  cwd:new URL('..',import.meta.url),
  env:{...process.env,NODE_ENV:'development',PORT:String(port),REDIS_URL:'',SUPER_ADMIN_EMAIL:ownerEmail,SUPER_ADMIN_NAME:'Teacher Scope Owner'},
  stdio:['ignore','pipe','pipe']
});

let output='';
server.stdout.on('data',chunk=>{output+=chunk});
server.stderr.on('data',chunk=>{output+=chunk});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function client(){
  let cookie='';
  return {
    async request(path,{method='GET',body,expected=200}={}){
      const headers={Accept:'application/json'};
      if(body!==undefined)headers['Content-Type']='application/json';
      if(cookie)headers.Cookie=cookie;
      const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
      const set=response.headers.get('set-cookie');
      if(set?.startsWith('nataiji_session='))cookie=set.split(';')[0];
      const data=await response.json();
      if(response.status!==expected)throw new Error(`${method} ${path} returned ${response.status}; expected ${expected}: ${JSON.stringify(data)}`);
      return data;
    }
  };
}

try{
  let ready=false;
  for(let attempt=0;attempt<50;attempt++){
    if(server.exitCode!==null)throw new Error(`server exited early\n${output}`);
    try{
      const response=await fetch(base+'/health');
      if(response.ok){
        const health=await response.json();
        if(health.storage==='postgres'){ready=true;break}
      }
    }catch{}
    await wait(150);
  }
  if(!ready)throw new Error(`server did not become ready with PostgreSQL\n${output}`);

  const owner=client(),teacher=client();
  const ownerRegistration=await owner.request('/api/auth/register',{
    method:'POST',
    body:{name:'Teacher Scope Owner',email:ownerEmail,password:'OwnerPass-9021',school:'مدرسة اختبار العزل'},
    expected:201
  });
  if(!ownerRegistration.user?.isSuperAdmin)throw new Error('scope test owner is not super admin');

  const classes=[
    {id:'class-a',name:'القسم المسموح',nameFr:'Classe autorisée',code:'A'},
    {id:'class-b',name:'القسم المحظور',nameFr:'Classe interdite',code:'B'}
  ];
  const terms=['الفصل الأول','الفصل الثاني','الفصل الثالث'];
  await owner.request('/api/structure',{
    method:'PUT',
    body:{structure:{classes,terms,activeClassId:'class-b',term:terms[0]}}
  });

  // Reproduce the production failure: the legacy school snapshot still knows the
  // classes, while the normalized structure row has temporarily lost them.
  const db=new Pool({connectionString:process.env.DATABASE_URL});
  await db.query(
    'UPDATE nataiji_structure SET data=$2::jsonb,updated_at=now() WHERE school_id=$1',
    [ownerRegistration.user.schoolId,JSON.stringify({classes:[],terms,activeClassId:'',term:terms[0]})]
  );
  const recoveredPupil=await owner.request('/api/pupils',{
    method:'POST',
    body:{classId:'class-a',pupil:['','طالب استعادة','','','','Recovered Student','','']},
    expected:201
  });
  if(!recoveredPupil.pupils?.some(p=>p?.[1]==='طالب استعادة'))throw new Error('pupil save did not recover a stale structure row');
  const repairedRow=await db.query('SELECT data FROM nataiji_structure WHERE school_id=$1',[ownerRegistration.user.schoolId]);
  const repairedIds=(repairedRow.rows[0]?.data?.classes||[]).map(x=>String(x.id));
  if(!repairedIds.includes('class-a')||!repairedIds.includes('class-b'))throw new Error(`structure was not repaired before pupil save: ${JSON.stringify(repairedIds)}`);
  await db.end();

  const invite=await owner.request('/api/invites',{
    method:'POST',
    body:{
      teacherName:'معلم محدود',
      permissions:['pupils','reports'],
      classAccess:{'class-a':{fullClass:true,allSubjects:true,subjectIds:[],hiddenSubjectIds:[]}}
    },
    expected:201
  });
  if(!invite.code)throw new Error('teacher invite code was not created');

  await teacher.request('/api/auth/register',{
    method:'POST',
    body:{name:'Teacher Scope Member',email:teacherEmail,password:'TeacherPass-9021',school:'مساحة المعلم الخاصة'},
    expected:201
  });
  const attached=await teacher.request('/api/access/attach',{method:'POST',body:{code:invite.code}});
  if(attached.user?.role!=='teacher'||!attached.user?.activeSharedGrant)throw new Error('attached account did not enter teacher workspace');

  const structure=await teacher.request('/api/structure');
  const visibleClassIds=(structure.structure?.classes||[]).map(x=>String(x.id));
  if(JSON.stringify(visibleClassIds)!==JSON.stringify(['class-a']))throw new Error(`teacher structure leaked unassigned classes: ${JSON.stringify(visibleClassIds)}`);
  if(String(structure.structure?.activeClassId||'')!=='class-a')throw new Error(`teacher active class escaped assigned scope: ${structure.structure?.activeClassId}`);

  const state=await teacher.request('/api/state');
  const stateClassIds=(state.state?.classes||[]).map(x=>String(x.id));
  if(JSON.stringify(stateClassIds)!==JSON.stringify(['class-a']))throw new Error(`teacher state leaked unassigned classes: ${JSON.stringify(stateClassIds)}`);

  await teacher.request('/api/pupils',{
    method:'POST',
    body:{classId:'class-b',pupil:['','طالب غير مسموح','','','','Blocked Student','','']},
    expected:403
  });
  await teacher.request('/api/pupils/not-a-real-pupil',{
    method:'PUT',
    body:{classId:'class-b',pupil:['','طالب غير مسموح','','','','Blocked Student','','']},
    expected:403
  });
  await teacher.request('/api/pupils/not-a-real-pupil?classId=class-b',{method:'DELETE',expected:403});

  const created=await teacher.request('/api/pupils',{
    method:'POST',
    body:{classId:'class-a',pupil:['','طالب مسموح','','','','Allowed Student','','']},
    expected:201
  });
  if(!Array.isArray(created.pupils)||!created.pupils.some(p=>p?.[1]==='طالب مسموح'))throw new Error('teacher could not create a pupil inside the assigned class');

  await teacher.request('/api/active-selection',{method:'POST',body:{classId:'class-b'},expected:400});

  console.log('Nataiji teacher scope acceptance passed');
}finally{
  server.kill('SIGTERM');
}
