import express from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from 'redis';

const app=express();
const __dirname=path.dirname(fileURLToPath(import.meta.url));
app.set('trust proxy',1);
app.use(express.json({limit:'1mb'}));
app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  next();
});

const memory=new Map();
let redis=null;
let storage='memory';
const SESSION_TTL=60*60*12;
const INVITE_TTL=60*60*24*7;

function memGet(key){const row=memory.get(key);if(!row)return null;if(row.exp&&row.exp<Date.now()){memory.delete(key);return null}return row.value}
async function storeGet(key){return redis?redis.get(key):memGet(key)}
async function storeSet(key,value,ttl){if(redis){if(ttl)return redis.set(key,value,{EX:ttl});return redis.set(key,value)}memory.set(key,{value,exp:ttl?Date.now()+ttl*1000:0})}
async function storeDel(key){if(redis)return redis.del(key);memory.delete(key)}
async function initStore(){
  if(!process.env.REDIS_URL)return;
  try{
    const client=createClient({url:process.env.REDIS_URL,socket:{connectTimeout:5000,reconnectStrategy:false}});
    client.on('error',e=>console.error('Redis:',e.message));
    await client.connect();
    redis=client;storage='redis';
  }catch(e){console.error('Redis unavailable, using memory fallback:',e.message)}
}

const parseCookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(v=>v.trim()).filter(Boolean).map(v=>{const i=v.indexOf('=');return i<0?[v,'']:[v.slice(0,i),decodeURIComponent(v.slice(i+1))]}));
const sessionKey=t=>'nataiji:session:'+crypto.createHash('sha256').update(t).digest('hex');
const userKey=id=>'nataiji:user:'+id;
const schoolKey=id=>'nataiji:school:'+id+':state';
const inviteKey=code=>'nataiji:invite:'+code;
const usersIndexKey='nataiji:users:index';
const normEmail=v=>String(v||'').trim().toLowerCase();
const safeUser=u=>({id:u.id,name:u.name,email:u.email,role:u.role,schoolId:u.schoolId,permissions:u.permissions||[]});
const hashPassword=(password,salt=crypto.randomBytes(16).toString('hex'))=>({salt,hash:crypto.scryptSync(password,salt,64).toString('hex')});
function verifyPassword(password,u){const got=crypto.scryptSync(password,u.salt,64);const exp=Buffer.from(u.passwordHash,'hex');return got.length===exp.length&&crypto.timingSafeEqual(got,exp)}
async function getIndex(){try{return JSON.parse(await storeGet(usersIndexKey)||'{}')}catch{return {}}}
async function setIndex(x){await storeSet(usersIndexKey,JSON.stringify(x))}
async function createSession(res,user){const token=crypto.randomBytes(32).toString('hex');await storeSet(sessionKey(token),JSON.stringify(safeUser(user)),SESSION_TTL);res.cookie('nataiji_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:SESSION_TTL*1000,path:'/'});return safeUser(user)}
async function auth(req,res,next){const token=parseCookies(req).nataiji_session;if(!token)return res.status(401).json({error:'unauthorized'});const raw=await storeGet(sessionKey(token));if(!raw)return res.status(401).json({error:'session_expired'});req.user=JSON.parse(raw);await storeSet(sessionKey(token),raw,SESSION_TTL);next()}
const adminOnly=(req,res,next)=>req.user?.role==='admin'?next():res.status(403).json({error:'forbidden'});

app.get('/health',(_req,res)=>res.json({ok:true,app:'نتائجي',storage}));
app.get('/api/auth/status',async(req,res)=>{const idx=await getIndex();const token=parseCookies(req).nataiji_session;let user=null;if(token){const raw=await storeGet(sessionKey(token));if(raw)user=JSON.parse(raw)}res.json({initialized:Object.keys(idx).length>0,user,storage})});
app.post('/api/auth/register',async(req,res)=>{const idx=await getIndex();if(Object.keys(idx).length)return res.status(409).json({error:'already_initialized'});const name=String(req.body?.name||'').trim(),email=normEmail(req.body?.email),password=String(req.body?.password||''),school=String(req.body?.school||'').trim();if(!name||!email||password.length<8||!school)return res.status(400).json({error:'invalid_input'});const id=crypto.randomUUID(),schoolId=crypto.randomUUID(),hp=hashPassword(password),user={id,name,email,role:'admin',schoolId,permissions:['all'],salt:hp.salt,passwordHash:hp.hash};await storeSet(userKey(id),JSON.stringify(user));idx[email]=id;await setIndex(idx);await storeSet(schoolKey(schoolId),JSON.stringify({school,teacher:name}));res.status(201).json({user:await createSession(res,user)})});
app.post('/api/auth/login',async(req,res)=>{const email=normEmail(req.body?.email),password=String(req.body?.password||'');const idx=await getIndex(),id=idx[email];if(!id)return res.status(401).json({error:'bad_credentials'});const raw=await storeGet(userKey(id));if(!raw)return res.status(401).json({error:'bad_credentials'});const user=JSON.parse(raw);if(!verifyPassword(password,user))return res.status(401).json({error:'bad_credentials'});res.json({user:await createSession(res,user)})});
app.post('/api/auth/logout',auth,async(req,res)=>{const token=parseCookies(req).nataiji_session;await storeDel(sessionKey(token));res.clearCookie('nataiji_session',{path:'/'});res.json({ok:true})});
app.post('/api/auth/join',async(req,res)=>{const code=String(req.body?.code||'').trim().toUpperCase(),name=String(req.body?.name||'').trim(),email=normEmail(req.body?.email),password=String(req.body?.password||'');if(!code||!name||!email||password.length<8)return res.status(400).json({error:'invalid_input'});const invRaw=await storeGet(inviteKey(code));if(!invRaw)return res.status(404).json({error:'invalid_invite'});const idx=await getIndex();if(idx[email])return res.status(409).json({error:'email_exists'});const inv=JSON.parse(invRaw),id=crypto.randomUUID(),hp=hashPassword(password),user={id,name,email,role:'teacher',schoolId:inv.schoolId,permissions:inv.permissions||['grades'],salt:hp.salt,passwordHash:hp.hash};await storeSet(userKey(id),JSON.stringify(user));idx[email]=id;await setIndex(idx);await storeDel(inviteKey(code));res.status(201).json({user:await createSession(res,user)})});
app.post('/api/invites',auth,adminOnly,async(req,res)=>{const permissions=Array.isArray(req.body?.permissions)?req.body.permissions:['grades'];const code='NT-'+crypto.randomBytes(4).toString('hex').toUpperCase();const inv={schoolId:req.user.schoolId,createdBy:req.user.id,permissions,createdAt:new Date().toISOString()};await storeSet(inviteKey(code),JSON.stringify(inv),INVITE_TTL);res.status(201).json({code,expiresInDays:7,permissions})});
app.get('/api/state',auth,async(req,res)=>{const raw=await storeGet(schoolKey(req.user.schoolId));res.json({state:raw?JSON.parse(raw):null,user:req.user})});
app.put('/api/state',auth,async(req,res)=>{const incoming=req.body?.state;if(!incoming||typeof incoming!=='object')return res.status(400).json({error:'invalid_state'});let next=incoming;if(req.user.role!=='admin'){const oldRaw=await storeGet(schoolKey(req.user.schoolId));const old=oldRaw?JSON.parse(oldRaw):{};next={...old,marks:incoming.marks??old.marks,term:incoming.term??old.term};if(req.user.permissions?.includes('pupils'))next.pupils=incoming.pupils??old.pupils}await storeSet(schoolKey(req.user.schoolId),JSON.stringify(next));res.json({ok:true})});

app.use(express.static(path.join(__dirname,'../public')));
app.use((_req,res)=>res.sendFile(path.join(__dirname,'../public/index.html')));

const port=process.env.PORT||3000;
await initStore();
app.listen(port,()=>console.log(`Nataiji running on ${port} with ${storage}`));
