import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const BASE=(process.env.NATAIJI_BASE_URL||'https://nataiji.onrender.com').replace(/\/$/,'');
const TERM1='الفصل الأول';
const TERM2='الفصل الثاني';
const TERM3='الفصل الثالث';
const TERMS=[TERM1,TERM2,TERM3];

function sessionClient(){
  let cookie='';
  async function request(path,{method='GET',body}={}){
    const headers={Accept:'application/json'};
    if(body!==undefined)headers['Content-Type']='application/json';
    if(cookie)headers.Cookie=cookie;
    const response=await fetch(BASE+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
    const setCookies=response.headers.getSetCookie?.()||[];
    const rawSet=setCookies.length?setCookies[0]:response.headers.get('set-cookie');
    if(rawSet){
      const first=rawSet.split(';')[0];
      if(first.startsWith('nataiji_session='))cookie=first;
    }
    const text=await response.text();
    let data={};
    if(text){try{data=JSON.parse(text)}catch{data={raw:text}}}
    if(!response.ok){
      const e=new Error(`${method} ${path} -> ${response.status} ${JSON.stringify(data)}`);
      e.status=response.status;e.data=data;throw e;
    }
    return data;
  }
  return {request,clearCookie(){cookie='';},hasCookie(){return Boolean(cookie)}};
}

async function createAccount(label){
  const id=crypto.randomUUID().replaceAll('-','').slice(0,16);
  const email=`mobile-ci-${label.toLowerCase()}-${id}@example.com`;
  const password=`NtjCI-${id}-9x!`;
  const client=sessionClient();
  const data=await client.request('/api/auth/register',{method:'POST',body:{
    name:`Mobile CI ${label}`,email,password,school:`مدرسة اختبار الهاتف ${label} ${id.slice(0,5)}`
  }});
  assert.equal(data.user?.email,email);
  assert.ok(client.hasCookie(),'registration did not establish a session cookie');
  return {label,id,email,password,client,user:data.user};
}

async function setupSchool(account){
  const classId=`ci-${account.label.toLowerCase()}-${account.id.slice(0,10)}`;
  const pupilName=`تلميذ اختبار الهاتف ${account.label} ${account.id.slice(0,4)}`;
  const nns=`CI-${account.label}-${account.id.slice(0,8)}`;

  const structure=await account.client.request('/api/structure',{method:'PUT',body:{structure:{
    classes:[{id:classId,name:`السنة الثانية الابتدائية - اختبار ${account.label}`,nameFr:`2e année fondamentale - test ${account.label}`,code:'2AF'}],
    terms:TERMS,
    activeClassId:classId,
    term:TERM1
  }}});
  assert.equal(structure.structure?.activeClassId,classId);
  assert.deepEqual(structure.structure?.terms,TERMS);

  const subjectsRes=await account.client.request('/api/subjects?classId='+encodeURIComponent(classId));
  assert.ok(subjectsRes.subjects?.length>=7,'official 2AF subjects were not seeded');
  assert.ok(subjectsRes.subjects.some(s=>String(s?.[0]||'').includes('الإسلامية')),'Arabic subject name missing');
  assert.ok(subjectsRes.subjects.some(s=>String(s?.[2]||'').toLowerCase().includes('fran')),'French subject label missing');

  const pupil=[nns,pupilName,'','2018-01-01','M','','',''];
  const pupilsRes=await account.client.request('/api/pupils',{method:'POST',body:{classId,pupil}});
  assert.equal(pupilsRes.pupils?.length,1);
  assert.equal(pupilsRes.pupils?.[0]?.[1],pupilName);

  const row=subjectsRes.subjects.map((s,i)=>{
    const max=Math.max(1,Number(s?.[3])||20);
    return String(Math.max(1,Math.min(max,Math.round(max*(0.62+(i%3)*0.08)))));
  });

  for(const term of TERMS){
    const saved=await account.client.request('/api/marks',{method:'PUT',body:{classId,term,marks:[row]}});
    assert.equal(saved.term,term);
    assert.equal(saved.marks?.length,1);
    assert.equal(saved.marks?.[0]?.length,subjectsRes.subjects.length);
  }

  const persistence=await account.client.request('/api/persistence-check');
  assert.equal(persistence.ok,true,'durable persistence check failed');
  assert.ok(['postgres','redis'].includes(persistence.storage),'production storage is not durable');
  assert.equal(persistence.schoolId,account.user.schoolId);

  const state=await account.client.request('/api/state?classId='+encodeURIComponent(classId)+'&term='+encodeURIComponent(TERM3));
  const serialized=JSON.stringify(state.state||{});
  assert.ok(serialized.includes(pupilName),'saved pupil missing from state');
  assert.ok(serialized.includes(classId),'saved class missing from state');

  account.classId=classId;
  account.pupilName=pupilName;
  account.nns=nns;
  account.subjectCount=subjectsRes.subjects.length;
  return {state,persistence};
}

async function verifyLoginPersistence(account){
  await account.client.request('/api/auth/logout',{method:'POST',body:{}});
  account.client.clearCookie();
  const login=await account.client.request('/api/auth/login',{method:'POST',body:{email:account.email,password:account.password}});
  assert.equal(login.user?.email,account.email);
  const state=await account.client.request('/api/state?classId='+encodeURIComponent(account.classId)+'&term='+encodeURIComponent(TERM3));
  assert.ok(JSON.stringify(state.state||{}).includes(account.pupilName),'data did not persist across logout/login');
}

async function deleteAccount(account){
  if(!account)return;
  try{
    if(!account.client.hasCookie()){
      await account.client.request('/api/auth/login',{method:'POST',body:{email:account.email,password:account.password}});
    }
    const deleted=await account.client.request('/api/account',{method:'DELETE',body:{password:account.password,confirm:'حذف الحساب نهائيًا'}});
    assert.equal(deleted.ok,true);
  }catch(e){
    console.error(`Cleanup failed for test account ${account.label}:`,e.message);
    throw e;
  }
}

let A,B;
let failure;
try{
  const health=await fetch(BASE+'/health',{cache:'no-store'}).then(r=>r.json());
  assert.equal(health.ok,true);
  assert.equal(health.storage,'postgres','release smoke requires PostgreSQL-backed production');

  A=await createAccount('A');
  await setupSchool(A);
  await verifyLoginPersistence(A);

  B=await createAccount('B');
  await setupSchool(B);

  assert.notEqual(A.user.schoolId,B.user.schoolId,'two independent schools share an id');

  const aState=await A.client.request('/api/state?classId='+encodeURIComponent(A.classId)+'&term='+encodeURIComponent(TERM3));
  const bState=await B.client.request('/api/state?classId='+encodeURIComponent(B.classId)+'&term='+encodeURIComponent(TERM3));
  const aText=JSON.stringify(aState.state||{});
  const bText=JSON.stringify(bState.state||{});
  assert.ok(aText.includes(A.pupilName));
  assert.ok(!aText.includes(B.pupilName),'school A leaked school B pupil data');
  assert.ok(bText.includes(B.pupilName));
  assert.ok(!bText.includes(A.pupilName),'school B leaked school A pupil data');

  console.log(JSON.stringify({
    ok:true,
    storage:health.storage,
    schoolsIsolated:true,
    termsTested:TERMS.length,
    subjectsIn2AF:A.subjectCount,
    loginPersistence:true,
    accountDeletionWillRun:true
  }));
}catch(e){
  failure=e;
  console.error('Mobile production smoke failed:',e.stack||e.message);
}finally{
  const cleanupErrors=[];
  for(const account of [B,A]){
    if(!account)continue;
    try{await deleteAccount(account)}catch(e){cleanupErrors.push(e)}
  }
  if(cleanupErrors.length&&!failure)failure=cleanupErrors[0];
}
if(failure)process.exitCode=1;
