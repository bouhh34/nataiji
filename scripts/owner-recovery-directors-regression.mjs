import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const staffSource=readFileSync(new URL('../public/owner-staff-v1.js',import.meta.url),'utf8');
const ownerSource=readFileSync(new URL('../public/auth-access-v2.js',import.meta.url),'utf8');

function fixture({clipboard,execResult=false,language='ar'}={}){
 let modalHTML='',modalTitle='',clipboardCalls=0,legacyCalls=0,selected=false;
 const button={disabled:false,textContent:'',onclick:null};
 const status={textContent:''};
 const field={focus(){},select(){selected=true},setSelectionRange(){}};
 const nodes={'[data-copy-recovery]':button,'[data-recovery-value]':field,'[data-copy-status]':status};
 const modalRoot={querySelector(selector){return nodes[selector]||null}};
 const context={
  document:{addEventListener(){},createElement(){return{textContent:''}},head:{appendChild(){}},execCommand(command){assert.equal(command,'copy');legacyCalls++;return execResult}},
  navigator:{clipboard:clipboard&&{writeText:async value=>{clipboardCalls++;return clipboard(value)}}},
  window:{},localStorage:{getItem:()=>language},
  modal(title,html){modalTitle=title;modalHTML=html;return modalRoot}
 };
 vm.runInNewContext(staffSource,context);
 return {show:context.window.NataijiOwnerStaff.showRecoveryCode,button,status,field,
  html:()=>modalHTML,title:()=>modalTitle,calls:()=>clipboardCalls,legacy:()=>legacyCalls,selected:()=>selected}
}

test('recovery code is selectable, escaped, and copied only on explicit click',async()=>{
 const copied=[],f=fixture({clipboard:async value=>copied.push(value)});
 f.show('NT-A1B2C3D4');
 assert.match(f.html(),/readonly data-recovery-value/);
 assert.match(f.html(),/data-copy-recovery/);
 assert.match(f.html(),/NT-A1B2C3D4/);
 assert.equal(f.calls(),0);
 await f.button.onclick();
 assert.deepEqual(copied,['NT-A1B2C3D4']);
 assert.match(f.status.textContent,/تم نسخ الرمز/);
 assert.equal(f.button.disabled,false);
 assert.equal(f.legacy(),0);
});

test('clipboard permission failure falls back to selecting and copying input',async()=>{
 const f=fixture({clipboard:async()=>{throw new Error('denied')},execResult:true});
 f.show('NT-AABBCCDD');
 await f.button.onclick();
 assert.equal(f.calls(),1);
 assert.equal(f.legacy(),1);
 assert.ok(f.selected());
 assert.match(f.status.textContent,/تم نسخ الرمز/);
});

test('failed copy never reports success and leaves code selectable',async()=>{
 const f=fixture({execResult:false,language:'fr'});
 f.show('NT-AABBCCDD');
 await f.button.onclick();
 assert.ok(f.selected());
 assert.match(f.status.textContent,/Copie automatique impossible/);
 assert.doesNotMatch(f.status.textContent,/Code copié/);
 assert.equal(f.button.disabled,false);
});

test('recovery markup escapes untrusted display values',()=>{
 const f=fixture();
 f.show('NT-\"<script>');
 assert.doesNotMatch(f.html(),/value="NT-\\"<script>/);
 assert.match(f.html(),/&quot;&lt;script&gt;/);
});

test('owner control displays a distinct director tab and safe deletion-preview path',()=>{
 assert.match(staffSource,/data-staff-tab="director"/);
 assert.match(staffSource,/staff\.directors/);
 assert.match(staffSource,/role==='teacher'\|\|role==='director'/);
 assert.match(staffSource,/data-staff-action="reset_code"/);
 assert.match(ownerSource,/NataijiOwnerStaff\?\.showRecoveryCode/);
});
