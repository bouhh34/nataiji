import {spawn} from 'node:child_process';

const port=3219;
const base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['--import','./src/gmail-mail-bridge.js','src/server.js'],{
  cwd:new URL('..',import.meta.url),
  env:{...process.env,NODE_ENV:'development',PORT:String(port),DATABASE_URL:'',REDIS_URL:''},
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
  const auth=await (await request('/api/auth/status',200)).json();
  if(auth.storage!=='memory'||auth.canRegister!==true)throw new Error(`unexpected auth status: ${JSON.stringify(auth)}`);
  console.log('Nataiji server smoke test passed');
}finally{
  server.kill('SIGTERM');
}
