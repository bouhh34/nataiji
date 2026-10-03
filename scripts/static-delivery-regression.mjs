import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import {gunzipSync,brotliDecompressSync} from 'node:zlib';
import {staticDelivery} from '../src/static-delivery.js';

test('static compression, conditional requests and isolation',async()=>{
 const app=express();app.use(staticDelivery(new URL('../public',import.meta.url).pathname));app.use((_req,res)=>res.status(404).end());
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const request=(path,headers={},method='GET')=>new Promise((resolve,reject)=>{
  http.get({host:'127.0.0.1',port:server.address().port,path,headers,method},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}))}).on('error',reject);
 });
 try{
  const raw=fs.readFileSync(new URL('../public/professor-v2.js',import.meta.url));
  for(const [encoding,decode] of [['gzip',gunzipSync],['br',brotliDecompressSync]]){
   const r=await request('/professor-v2.js?v=69',{'Accept-Encoding':encoding});
   assert.equal(r.headers['content-encoding'],encoding);assert.deepEqual(decode(r.body),raw);
   assert.ok(r.body.length<raw.length/2);assert.match(r.headers.vary,/Accept-Encoding/);
   const fresh=await request('/professor-v2.js?v=69',{'Accept-Encoding':encoding,'If-None-Match':r.headers.etag});assert.equal(fresh.status,304);assert.equal(fresh.body.length,0);
  }
  const identity=await request('/professor-v2.js',{'Accept-Encoding':'gzip;q=0,br;q=0'});assert.deepEqual(identity.body,raw);assert.equal(identity.headers['content-encoding'],undefined);
  const head=await request('/professor-v2.js',{'Accept-Encoding':'gzip'},'HEAD');assert.equal(head.body.length,0);assert.ok(Number(head.headers['content-length'])>0);
  assert.equal((await request('/api/state')).status,404);
  assert.equal((await request('/missing.js')).status,404);
  const home=await request('/');assert.match(home.headers['cache-control'],/no-store/);
  assert.match((await request('/sw.js')).headers['cache-control'],/no-store/);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
