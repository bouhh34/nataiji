import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const source=fs.readFileSync(new URL('../public/account-isolation.js',import.meta.url),'utf8');
function fixture(response){
 const requests=[],clickListeners=[],state={activeClassId:'class-b',pupils:[['','New Student','','','',2,'','auto-123']],marks:[['13']],classData:{}};
 const ctx=vm.createContext({window:{},state,currentUser:{id:'u1',schoolId:'school-1'},startApp:async()=>{},structuredClone,localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},document:{addEventListener:(name,fn)=>clickListeners.push(fn)},api:async(path,options)=>{requests.push({path,options});return typeof response==='function'?response(ctx):response}});vm.runInContext(source,ctx);return{ctx,requests,clickListeners,state};
}
test('verifying a blank-NNS student only reads the selected class and preserves grades',async()=>{
 const f=fixture({ok:true,pupils:[['','New Student','','','',2,'','auto-123']]});assert.equal(await f.ctx.window.nataijiVerifyPupils(),true);assert.equal(f.requests.length,1);assert.equal(f.requests[0].path,'/api/pupils?classId=class-b');assert.equal(f.requests[0].options,undefined);assert.deepEqual(f.state.marks,[['13']]);
});
test('a student save click does not launch a competing bulk save or false failure banner',()=>{assert.equal(fixture({}).clickListeners.length,0)});
test('verification mismatch does not overwrite the local student list or grades',async()=>{const f=fixture({ok:true,pupils:[]});await assert.rejects(f.ctx.window.nataijiVerifyPupils(),/pupil_save_not_verified/);assert.equal(f.state.pupils[0][1],'New Student');assert.deepEqual(f.state.marks,[['13']]);assert.ok(f.requests.every(r=>!r.options))});
test('a late verification cannot replace another class or account',async()=>{const f=fixture(ctx=>{ctx.state.activeClassId='class-c';ctx.currentUser.id='u2';return{ok:true,pupils:[]}});assert.equal(await f.ctx.window.nataijiVerifyPupils(),false);assert.equal(f.state.activeClassId,'class-c');assert.equal(f.ctx.currentUser.id,'u2')});
