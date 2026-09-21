import {spawn} from 'node:child_process';

const port=3219;
const base=`http://127.0.0.1:${port}`;
const ownerEmail='bahmedou596@gmail.com';
const server=spawn(process.execPath,['--import','./src/gmail-mail-bridge.js','src/server.js'],{
  cwd:new URL('..',import.meta.url),
  env:{...process.env,NODE_ENV:'development',PORT:String(port),DATABASE_URL:'',REDIS_URL:'',SUPER_ADMIN_EMAIL:ownerEmail,SUPER_ADMIN_NAME:'Ahmedou bembe'},
  stdio:['ignore','pipe','pipe']
});

let output='';
server.stdout.on('data',chunk=>{output+=chunk});
server.stderr.on('data',chunk=>{output+=chunk});

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function request(path,expected){
  const response=await fetch(base+path);
  if(response.status!==expected)throw new Error(`${path} returned ${response.status}; expected ${expected}`);
  return response;
}
function client(){
  let cookie='';
  return {async request(path,{method='GET',body,expected=200}={}){
    const headers={Accept:'application/json'};if(body!==undefined)headers['Content-Type']='application/json';if(cookie)headers.Cookie=cookie;
    const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    const set=response.headers.get('set-cookie');if(set?.startsWith('nataiji_session='))cookie=set.split(';')[0];
    const data=await response.json();if(response.status!==expected)throw new Error(`${method} ${path} returned ${response.status}; expected ${expected}: ${JSON.stringify(data)}`);return data
  },clear(){cookie=''}}
}

try{
  let ready=false;
  for(let attempt=0;attempt<30;attempt++){
    if(server.exitCode!==null)throw new Error(`server exited early\n${output}`);
    try{await request('/health',200);ready=true;break}catch{await wait(100)}
  }
  if(!ready)throw new Error(`server did not become ready\n${output}`);
  const health=await (await request('/health',200)).json();
  if(!health.ok||health.storage!=='memory')throw new Error(`unexpected health response: ${JSON.stringify(health)}`);
  const home=await request('/',200);
  if(!(await home.text()).includes('نتائجي'))throw new Error('home page is missing the product name');
  const download=await request('/download.html',200);
  const downloadHtml=await download.text();
  if(!downloadHtml.includes('Nataiji-Android.apk')||!downloadHtml.includes('إضافة إلى الشاشة الرئيسية'))throw new Error('download page is missing mobile installation actions');
  const auth=await (await request('/api/auth/status',200)).json();
  if(auth.storage!=='memory'||auth.canRegister!==true)throw new Error(`unexpected auth status: ${JSON.stringify(auth)}`);
  const owner=client(),member=client(),memberEmail='teacher.smoke@example.com';
  const ownerRegistration=await owner.request('/api/auth/register',{method:'POST',body:{name:'Owner Smoke',email:ownerEmail,password:'OwnerPass-9021',school:'Owner school'},expected:201});
  if(!ownerRegistration.user?.isSuperAdmin||ownerRegistration.user?.name!=='Ahmedou bembe')throw new Error('configured super admin was not created correctly');
  await member.request('/api/auth/register',{method:'POST',body:{name:'Teacher Smoke',email:memberEmail,password:'TeacherPass-9021',school:'Teacher school'},expected:201});
  await member.request('/api/auth/logout',{method:'POST',body:{}});member.clear();
  await member.request('/api/auth/login',{method:'POST',body:{email:memberEmail,password:'TeacherPass-9021'}});
  const overview=await owner.request('/api/owner/overview');
  const memberRow=overview.accounts?.find(x=>x.email===memberEmail);if(!memberRow)throw new Error('owner overview is missing the member account');
  await owner.request(`/api/owner/accounts/${memberRow.id}/action`,{method:'POST',body:{action:'suspend'}});
  member.clear();await member.request('/api/auth/login',{method:'POST',body:{email:memberEmail,password:'TeacherPass-9021'},expected:403});
  await owner.request(`/api/owner/accounts/${memberRow.id}/action`,{method:'POST',body:{action:'activate'}});
  const reset=await owner.request(`/api/owner/accounts/${memberRow.id}/action`,{method:'POST',body:{action:'reset_code'}});
  if(!/^NT-[A-F0-9]{8}$/.test(reset.code||''))throw new Error('owner reset code is invalid');
  await member.request('/api/auth/reset-with-code',{method:'POST',body:{code:reset.code,password:'TeacherPass-2048'}});
  member.clear();await member.request('/api/auth/login',{method:'POST',body:{email:memberEmail,password:'TeacherPass-9021'},expected:401});
  await member.request('/api/auth/login',{method:'POST',body:{email:memberEmail,password:'TeacherPass-2048'}});
  await owner.request(`/api/owner/accounts/${memberRow.id}`,{method:'DELETE',body:{confirm:'DELETE'}});
  member.clear();await member.request('/api/auth/login',{method:'POST',body:{email:memberEmail,password:'TeacherPass-2048'},expected:401});
  console.log('Nataiji server smoke test passed');
}finally{
  server.kill('SIGTERM');
}
