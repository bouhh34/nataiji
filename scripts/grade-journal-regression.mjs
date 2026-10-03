import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({structuredClone,crypto:globalThis.crypto,Date,Math});
vm.runInContext(fs.readFileSync(new URL('../public/grade-journal.js',import.meta.url),'utf8'),ctx);
const Journal=ctx.NataijiGradeJournal,c={assignmentId:'math',term:1},empty={test:'',exam:''};
function storage(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),map}}
test('draft survives reload, preserves zero and absence, and isolates accounts',()=>{const s=storage(),a=new Journal(s,'a');a.stage(c,'p',empty,{test:'0',exam:'ABSENT'});assert.equal(new Journal(s,'a').snapshot()[0].value.test,'0');assert.equal(new Journal(s,'b').rows.size,0);assert.equal(s.map.size,1)});
test('edits are coalesced without changing original baseline',()=>{const a=new Journal(storage(),'a');a.stage(c,'p',empty,{test:'12',exam:''});a.stage(c,'p',{test:'12',exam:''},{test:'14',exam:''});assert.equal(a.rows.size,1);assert.equal(a.snapshot()[0].expected.test,'')});
test('acknowledging an older in-flight write preserves a newer draft',()=>{const a=new Journal(storage(),'a');a.stage(c,'p',empty,{test:'12',exam:''});const sent=a.snapshot();a.stage(c,'p',empty,{test:'14',exam:''});a.ack(sent);assert.equal(a.rows.size,1);assert.equal(a.snapshot()[0].expected.test,'12');assert.equal(a.snapshot()[0].value.test,'14');a.ack(a.snapshot());assert.equal(a.rows.size,0)});
test('reverting while save is in flight sends a compensating edit',()=>{const a=new Journal(storage(),'a');a.stage(c,'p',empty,{test:'12',exam:''});const sent=a.snapshot();a.stage(c,'p',empty,empty);a.ack(sent);assert.equal(a.rows.size,1);assert.equal(a.snapshot()[0].expected.test,'12');assert.equal(a.snapshot()[0].value.test,'')});
test('contexts stay attached to their original assignment and trimester',()=>{const a=new Journal(storage(),'a');a.stage(c,'p',empty,{test:'12',exam:''});a.stage({...c,term:2},'p',empty,{test:'13',exam:''});a.stage({...c,assignmentId:'arabic'},'p',empty,{test:'14',exam:''});assert.equal(a.rows.size,3)});
test('storage failure is explicit and does not discard in-memory drafts',()=>{const s=storage();s.setItem=()=>{throw Error('quota')};const a=new Journal(s,'a');assert.equal(a.stage(c,'p',empty,{test:'12',exam:''}),false);assert.equal(a.available,false);assert.equal(a.rows.size,1)});
test('conflict resolution requires chosen server baseline, preserves local value',()=>{const a=new Journal(storage(),'a');a.stage(c,'p',empty,{test:'12',exam:''});a.resolve(a.snapshot()[0],{test:'15',exam:''},false);assert.equal(a.snapshot()[0].expected.test,'15');assert.equal(a.snapshot()[0].value.test,'12');a.resolve(a.snapshot()[0],{test:'15',exam:''},true);assert.equal(a.rows.size,0)});
test('corrupt storage is preserved and not silently overwritten',()=>{const s=storage();s.setItem('nataiji-grade-drafts-v1:a','broken');const a=new Journal(s,'a');assert.equal(a.available,false);a.stage(c,'p',empty,{test:'12',exam:''});assert.equal(s.getItem(a.key),'broken')});
