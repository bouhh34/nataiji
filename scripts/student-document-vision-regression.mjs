import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recognizeStudentDocument,visionConfigured} from '../src/student-document-vision.js';
const env={OPENAI_API_KEY:'test-only-key'},image='data:image/jpeg;base64,/9j/';
const reply=names=>({ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({names})}]}]})});
test('cloud reader requires configuration and rejects URLs',async()=>{
 assert.equal(visionConfigured({}),false);
 await assert.rejects(recognizeStudentDocument(image,{env:{}}),/vision_unconfigured/);
 await assert.rejects(recognizeStudentDocument('https://example.test/a.jpg',{env}),/invalid_image/);
});
test('preserves source script, order, homonyms and uncertainty without storing responses',async()=>{
 const names=[{text:'محمد محمدن',uncertain:false},{text:'Sidi Hamoud',uncertain:true},{text:'Sidi Hamoud',uncertain:false}];
 const result=await recognizeStudentDocument(image,{env,fetchImpl:async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');const request=JSON.parse(options.body);assert.equal(request.store,false);assert.equal(request.input[0].content[1].image_url,image);assert.equal(request.text.format.strict,true);return reply(names)}});
 assert.deepEqual(result.names,names);
});
test('rejects malformed provider output and handles provider failure',async()=>{
 await assert.rejects(recognizeStudentDocument(image,{env,fetchImpl:async()=>reply([{text:'invented\nsecond row',uncertain:false}])}),/vision_invalid_result/);
 await assert.rejects(recognizeStudentDocument(image,{env,fetchImpl:async()=>({ok:false,status:429,json:async()=>({error:{code:'rate_limit_exceeded'}})})}),/vision_busy/);
});

test('billing failures are distinct from temporary rate limits and invalid credentials',async()=>{
 for(const [status,code,expected] of [[429,'insufficient_quota','vision_quota'],[401,'invalid_api_key','vision_invalid_key'],[403,'permission_denied','vision_access_denied']])await assert.rejects(recognizeStudentDocument(image,{env,fetchImpl:async()=>({ok:false,status,json:async()=>({error:{code}})})}),new RegExp(expected));
});

test('Gemini takes priority and preserves original names with structured image input',async()=>{
 const names=[{text:'مولاي أعمر',uncertain:false},{text:'Mariem Sidi',uncertain:true}];
 const result=await recognizeStudentDocument(image,{env:{...env,GEMINI_API_KEY:'gemini-test-key'},fetchImpl:async(url,options)=>{
  assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent');
  assert.equal(options.headers['x-goog-api-key'],'gemini-test-key');assert.equal(options.headers.Authorization,undefined);
  const request=JSON.parse(options.body);assert.deepEqual(request.contents[0].parts[0].inlineData,{mimeType:'image/jpeg',data:'/9j/'});
  assert.equal(request.generationConfig.responseMimeType,'application/json');assert.deepEqual(request.generationConfig.responseJsonSchema.required,['names']);
  return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'ignore internal thought'},{text:JSON.stringify({names})}]}}]})};
 }});assert.deepEqual(result.names,names);
});
test('Gemini quota, invalid key and truncated output cannot masquerade as names',async()=>{
 const geminiEnv={GEMINI_API_KEY:'test-key'};
 for(const [status,error,expected] of [[429,{status:'RESOURCE_EXHAUSTED'},'vision_quota'],[400,{details:[{reason:'API_KEY_INVALID'}]},'vision_invalid_key']])await assert.rejects(recognizeStudentDocument(image,{env:geminiEnv,fetchImpl:async()=>({ok:false,status,json:async()=>({error})})}),new RegExp(expected));
 await assert.rejects(recognizeStudentDocument(image,{env:geminiEnv,fetchImpl:async()=>({ok:true,json:async()=>({candidates:[{finishReason:'MAX_TOKENS'}]})})}),/vision_incomplete/);
});
test('unavailable default Gemini model retries once with compatible Flash',async()=>{
 let calls=0;const names=[{text:'محمد محمدن',uncertain:false}];
 const result=await recognizeStudentDocument(image,{env:{GEMINI_API_KEY:'test'},fetchImpl:async url=>{calls++;if(calls===1)return {ok:false,status:404};assert.match(url,/gemini-2.5-flash:generateContent$/);return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({names})}]}}]})}}});assert.equal(calls,2);assert.deepEqual(result.names,names);
});
