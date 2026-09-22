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

async function expectStatus(client,path,options,status){
  try{
    await client.request(path,options);
  }catch(e){
    assert.equal(e.status,status,`expected HTTP ${status} for ${options?.method||'GET'} ${path}, got ${e.status}: ${e.message}`);
    return e.data;
  }
  assert.fail(`expected HTTP ${status} for ${options?.method||'GET'} ${path}`);
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

  const firstSubject=subjectsRes.subjects[0];
  const firstSubjectId=String(firstSubject?.[4]||'');
  const firstMax=Math.max(1,Number(firstSubject?.[3])||20);
  const invalid=await expectStatus(account.client,'/api/mark',{method:'PUT',body:{
    classId,term:TERM1,pupilKey:nns,subjectId:firstSubjectId,value:String(firstMax+1)
  }},422);
  assert.equal(invalid?.error,'mark_out_of_range','server accepted a grade above subject maximum');

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
  account.subjects=subjectsRes.subjects;
  account.subjectIds=subjectsRes.subjects.map(x=>String(x?.[4]||''));
  account.row=row;
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

async function verifyPasswordRotation(account){
  const parallel=sessionClient();
  const first=await parallel.request('/api/auth/login',{method:'POST',body:{email:account.email,password:account.password}});
  assert.equal(first.user?.email,account.email);

  const oldPassword=account.password;
  const newPassword=oldPassword+'R9!';
  const changed=await account.client.request('/api/account/password',{method:'POST',body:{
    currentPassword:oldPassword,password:newPassword
  }});
  assert.equal(changed.ok,true);
  account.password=newPassword;

  await expectStatus(parallel,'/api/state',{},401);

  const oldLogin=sessionClient();
  await expectStatus(oldLogin,'/api/auth/login',{method:'POST',body:{email:account.email,password:oldPassword}},401);

  const fresh=sessionClient();
  const login=await fresh.request('/api/auth/login',{method:'POST',body:{email:account.email,password:newPassword}});
  assert.equal(login.user?.email,account.email);
  await fresh.request('/api/auth/logout',{method:'POST',body:{}});
  return true;
}

async function expectHttpError(action,status,code){
  let caught=null;
  try{await action()}catch(e){caught=e}
  assert.ok(caught,'expected request to fail');
  assert.equal(caught.status,status);
  if(code)assert.equal(caught.data?.error,code);
}

async function verifySharingPermissions(owner,recipient){
  const editableSubjectId=String(owner.subjects?.[0]?.[4]||'');
  const blockedSubjectId=String(owner.subjects?.[1]?.[4]||'');
  assert.ok(editableSubjectId&&blockedSubjectId,'share permission test needs at least two subjects');

  const invite=await owner.client.request('/api/invites',{method:'POST',body:{
    teacherName:'Mobile CI shared teacher',
    permissions:['grades'],
    classAccess:{
      [owner.classId]:{
        allSubjects:false,
        subjectIds:[editableSubjectId],
        hiddenSubjectIds:[],
        fullClass:false
      }
    }
  }});
  assert.ok(invite.code,'invite code missing');

  const attached=await recipient.client.request('/api/access/attach',{method:'POST',body:{code:invite.code}});
  assert.equal(attached.user?.role,'teacher');
  assert.equal(attached.user?.schoolId,owner.user.schoolId);
  assert.deepEqual(attached.user?.permissions,['grades']);
  const grantId=attached.grant?.grantId;
  assert.ok(grantId,'grant id missing');

  const sharedState=await recipient.client.request('/api/state?classId='+encodeURIComponent(owner.classId)+'&term='+encodeURIComponent(TERM1));
  const sharedText=JSON.stringify(sharedState.state||{});
  assert.ok(sharedText.includes(owner.pupilName),'shared class did not expose permitted school data');
  assert.ok(!sharedText.includes(recipient.pupilName),'recipient own-school pupil leaked into shared workspace');

  const allowed=await recipient.client.request('/api/mark',{method:'PUT',body:{
    classId:owner.classId,term:TERM1,pupilKey:owner.nns,subjectId:editableSubjectId,value:'1'
  }});
  assert.equal(allowed.ok,true,'permitted subject could not be edited');

  await expectHttpError(
    ()=>recipient.client.request('/api/mark',{method:'PUT',body:{
      classId:owner.classId,term:TERM1,pupilKey:owner.nns,subjectId:blockedSubjectId,value:'1'
    }}),
    403,'subject_forbidden'
  );

  await expectHttpError(
    ()=>recipient.client.request('/api/pupils',{method:'POST',body:{
      classId:owner.classId,pupil:['CI-SHARE-BLOCK','Blocked pupil','','2018-02-02','M','','','']
    }}),
    403,'forbidden'
  );

  const revoked=await owner.client.request('/api/shares/'+encodeURIComponent(grantId),{method:'DELETE'});
  assert.equal(revoked.ok,true,'share revocation failed');

  const status=await recipient.client.request('/api/auth/status');
  assert.equal(status.user?.activeSharedGrant,'','revoked share remained active');
  assert.equal(status.user?.schoolId,recipient.user.schoolId,'recipient did not return to own school after revocation');

  const ownState=await recipient.client.request('/api/state?classId='+encodeURIComponent(recipient.classId)+'&term='+encodeURIComponent(TERM1));
  const ownText=JSON.stringify(ownState.state||{});
  assert.ok(ownText.includes(recipient.pupilName),'recipient own school was not restored after revocation');
  assert.ok(!ownText.includes(owner.pupilName),'revoked owner data remained visible');

  return true;
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
  await verifyPasswordRotation(B);

  assert.notEqual(A.user.schoolId,B.user.schoolId,'two independent schools share an id');

  const aState=await A.client.request('/api/state?classId='+encodeURIComponent(A.classId)+'&term='+encodeURIComponent(TERM3));
  const bState=await B.client.request('/api/state?classId='+encodeURIComponent(B.classId)+'&term='+encodeURIComponent(TERM3));
  const aText=JSON.stringify(aState.state||{});
  const bText=JSON.stringify(bState.state||{});
  assert.ok(aText.includes(A.pupilName));
  assert.ok(!aText.includes(B.pupilName),'school A leaked school B pupil data');
  assert.ok(bText.includes(B.pupilName));
  assert.ok(!bText.includes(A.pupilName),'school B leaked school A pupil data');

  // Sharing/teacher permission isolation:
  // B keeps its own school account, then temporarily enters A's shared classroom.
  const editableSubjectId=A.subjectIds[0];
  const hiddenSubjectId=A.subjectIds[1];
  const forbiddenSubjectId=A.subjectIds[2];
  assert.ok(editableSubjectId&&hiddenSubjectId&&forbiddenSubjectId,'not enough subjects to test sharing permissions');

  const invite=await A.client.request('/api/invites',{method:'POST',body:{
    teacherName:'Mobile CI Teacher',
    permissions:['grades','reports'],
    classAccess:{
      [A.classId]:{
        fullClass:false,
        allSubjects:false,
        subjectIds:[editableSubjectId],
        hiddenSubjectIds:[hiddenSubjectId]
      }
    }
  }});
  assert.ok(/^NT-[A-F0-9]{8,16}$/.test(invite.code||''),'invite code was not created');

  const attached=await B.client.request('/api/access/attach',{method:'POST',body:{code:invite.code}});
  assert.equal(attached.user?.role,'teacher','shared workspace did not enter teacher role');
  assert.equal(attached.user?.schoolId,A.user.schoolId,'shared workspace did not switch to owner school');
  const grantId=attached.grant?.grantId;
  assert.ok(grantId,'shared grant id missing');

  const sharedState=await B.client.request('/api/state?classId='+encodeURIComponent(A.classId)+'&term='+encodeURIComponent(TERM1));
  const sharedText=JSON.stringify(sharedState.state||{});
  assert.ok(sharedText.includes(A.pupilName),'shared teacher cannot see assigned class pupil');
  assert.ok(!sharedText.includes(B.pupilName),'shared teacher leaked own-school pupil into shared school');
  const visibleIds=(sharedState.state?.subjects||[]).map(x=>String(x?.[4]||''));
  assert.ok(visibleIds.includes(editableSubjectId),'editable shared subject is not visible');
  assert.ok(!visibleIds.includes(hiddenSubjectId),'hidden shared subject is visible');

  const editableMax=Math.max(1,Number(A.subjects?.[0]?.[3])||20);
  const teacherValue=String(Math.min(1,editableMax));
  await B.client.request('/api/mark',{method:'PUT',body:{
    classId:A.classId,term:TERM1,pupilKey:A.nns,subjectId:editableSubjectId,value:teacherValue
  }});

  await expectStatus(B.client,'/api/mark',{method:'PUT',body:{
    classId:A.classId,term:TERM1,pupilKey:A.nns,subjectId:forbiddenSubjectId,value:'1'
  }},403);

  await expectStatus(B.client,'/api/pupils',{method:'POST',body:{
    classId:A.classId,
    pupil:['CI-NO-PUPIL-'+B.id.slice(0,5),'غير مسموح','','2018-01-01','M','','','']
  }},403);

  await expectStatus(B.client,'/api/structure',{method:'PUT',body:{structure:{
    classes:[{id:A.classId,name:'محاولة غير مسموحة',nameFr:'Interdit',code:'2AF'}],
    terms:TERMS,activeClassId:A.classId,term:TERM1
  }}},403);

  const ownerAfterTeacherEdit=await A.client.request('/api/state?classId='+encodeURIComponent(A.classId)+'&term='+encodeURIComponent(TERM1));
  const editRow=ownerAfterTeacherEdit.state?.marks||[];
  const ownerSubjectIndex=(ownerAfterTeacherEdit.state?.subjects||[]).findIndex(x=>String(x?.[4]||'')===editableSubjectId);
  assert.ok(ownerSubjectIndex>=0,'owner cannot resolve teacher-edited subject');
  assert.equal(String(editRow?.[0]?.[ownerSubjectIndex]??''),teacherValue,'allowed teacher grade did not persist to owner school');

  await A.client.request('/api/shares/'+encodeURIComponent(grantId),{method:'DELETE',body:{}});
  const sharedAfterRevoke=await B.client.request('/api/shared');
  assert.equal(sharedAfterRevoke.activeSharedGrant,'','revoked grant remained active');
  assert.equal((sharedAfterRevoke.grants||[]).length,0,'revoked grant remained in recipient account');

  const bOwnAgain=await B.client.request('/api/state?classId='+encodeURIComponent(B.classId)+'&term='+encodeURIComponent(TERM3));
  const bOwnAgainText=JSON.stringify(bOwnAgain.state||{});
  assert.ok(bOwnAgainText.includes(B.pupilName),'recipient did not return to its own school after revocation');
  assert.ok(!bOwnAgainText.includes(A.pupilName),'revoked shared-school data remained visible');

  console.log(JSON.stringify({
    ok:true,
    storage:health.storage,
    schoolsIsolated:true,
    sharingPermissions:true,
    sharingRevocation:true,
    termsTested:TERMS.length,
    subjectsIn2AF:A.subjectCount,
    loginPersistence:true,
    passwordRotation:true,
    serverGradeMaximum:true,
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
