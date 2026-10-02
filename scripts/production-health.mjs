import fs from 'node:fs';

const base='https://nataiji.onrender.com';
const localSW=fs.readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
const expectedCache=localSW.match(/nataiji-shell-v\d+/)?.[0];
if(!expectedCache)throw new Error('Missing local release cache identity');
async function get(path){
 const r=await fetch(base+path,{cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error(`${path}: HTTP ${r.status}`);
 return r;
}
let problem;
for(let attempt=1;attempt<=24;attempt++){
 try{
  const [healthResponse,swResponse,privacyResponse,deletionResponse]=await Promise.all([
   get('/health'),get('/sw.js'),get('/privacy.html'),get('/delete-account.html')
  ]);
  const h=await healthResponse.json(),sw=await swResponse.text();
  if(h.ok!==true||h.storage!=='postgres'||h.databaseOk!==true)throw new Error('Durable PostgreSQL service unavailable');
  if(h.emailConfigured!==true||h.superAdminConfigured!==true)throw new Error('Mail or owner configuration unavailable');
  if(!sw.includes(expectedCache))throw new Error('Render is still serving an earlier public release');
  const privacy=await privacyResponse.text(),deletion=await deletionResponse.text();
  if(!privacy.includes('bahmedou596@gmail.com')||!deletion.includes('mailto:bahmedou596@gmail.com'))throw new Error('Public privacy/deletion contact is missing');
  const asset=localSW.match(/"(\/accessibility\.css\?v=\d+)"/)?.[1];
  if(!asset)throw new Error('Missing accessibility asset');
  const response=await fetch(base+asset,{headers:{'Accept-Encoding':'br'},cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok||response.headers.get('Content-Encoding')!=='br')throw new Error('Compressed static delivery unavailable');
  console.log('Production release verified:',{release:expectedCache,storage:h.storage,databaseOk:h.databaseOk,compressed:true,privacy:true,deletion:true});
  process.exit(0);
 }catch(e){problem=e;console.log(`Deployment check ${attempt}/24: ${e.message}`)}
 if(attempt<24)await new Promise(resolve=>setTimeout(resolve,10000));
}
throw problem||new Error('Production release could not be verified');
