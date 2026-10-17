import assert from 'node:assert/strict';
import {test} from 'node:test';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../public/teacher-account-sheet-v1.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/teacher-account-sheet-v1.css',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
function setup(user,language='ar'){
 const handlers=new Map(),events=new Map(),actions={password:0,logout:0,school:0},attrs={};
 const profile={
  classList:{items:new Set(),contains(c){return this.items.has(c)},add(c){this.items.add(c)}},
  setAttribute(name,val){attrs[name]=val},
  getAttribute(name){return attrs[name]},
  focus(){},isConnected:true,
  tabIndex:-1
 };
 const panel={innerHTML:'',dir:'rtl',setAttribute(){}};
 let modal=null;
 function makeModal(){
  const m={className:'',innerHTML:'',listeners:{},removed:false,
   addEventListener(name,fn){this.listeners[name]=fn},
   querySelector(s){return s==='.ntas-panel'?panel:s==='.ntas-close'?{focus(){}}:null},
   querySelectorAll(){return []},
   contains(){return true},
   remove(){this.removed=true;modal=null}};
  return m;
 }
 const currentUser=user;
 const state={school:'مدرسة رقم 1',region:'نواكشوط الغربية',district:'تفرغ زينة',teacher:'Teacher',year:'2026-2027'};
 const htmlClasses=new Set();
 const document={
  readyState:'complete',activeElement:profile,
  documentElement:{classList:{contains:c=>htmlClasses.has(c)}},
  body:{style:{overflow:''},append(node){modal=node}},
  querySelector(selector){
   if(selector==='main > header .profile')return profile;
   if(selector==='#changePasswordBtn')return {click(){actions.password++}};
   if(selector==='#logoutBtn')return {click(){actions.logout++}};
   if(selector==='#settingsBtn')return {click(){actions.school++}};
   return null;
  },
  createElement:makeModal,
  addEventListener(name,fn){events.set(name,fn)},
 };
 const sandbox=vm.createContext({window:{addEventListener(){}},document,localStorage:{getItem:()=>language},currentUser,state});
 vm.runInContext(source,sandbox);
 const clickHeader=()=>{
  events.get('click')({target:{closest:s=>s.includes('.profile')?profile:null},preventDefault(){}});
 };
 const action=name=>{
  assert.ok(modal,'dialog should remain open');
  const button={dataset:{accountAction:name}};
  modal.listeners.click({target:{closest:()=>button}});
 };
 return {profile,attrs,panel,clickHeader,action,actions,events,htmlClasses,getModal:()=>modal,document};
}
test('account avatar and name stay intact, become keyboard-accessible and open real account sheet',()=>{
 const x=setup({id:'owner-1',name:'Sid El Emine',email:'owner@example.test',role:'admin'});
 assert.equal(x.profile.tabIndex,0);
 assert.equal(x.attrs.role,'button');
 assert.equal(x.attrs['aria-haspopup'],'dialog');
 x.clickHeader();
 assert.match(x.panel.innerHTML,/Sid El Emine/);
 assert.match(x.panel.innerHTML,/owner@example\.test/);
 assert.match(x.panel.innerHTML,/الملف الشخصي/);
 assert.equal(x.attrs['aria-expanded'],'true');
 x.action('profile');
 assert.match(x.panel.innerHTML,/Sid El Emine/);
 assert.match(x.panel.innerHTML,/البريد الإلكتروني/);
 x.action('back');x.action('school');
 assert.match(x.panel.innerHTML,/مدرسة رقم 1/);
 assert.match(x.panel.innerHTML,/نواكشوط الغربية/);
 assert.match(x.panel.innerHTML,/تفرغ زينة/);
});
test('security, school and logout reuse existing account controls and confirm exit',()=>{
 const x=setup({id:'owner-2',name:'Admin',email:'admin@example.test',role:'admin'});
 x.clickHeader();x.action('security');x.action('password');
 assert.equal(x.actions.password,1);
 assert.equal(x.getModal(),null);
 x.clickHeader();x.action('school');x.action('edit-school');
 assert.equal(x.actions.school,1);
 x.clickHeader();x.action('logout');
 assert.equal(x.actions.logout,0,'logout must not run from menu selection alone');
 x.action('confirm-logout');
 assert.equal(x.actions.logout,1);
});
test('shared teachers can read school and profile but not edit school settings',()=>{
 const x=setup({id:'teacher-1',name:'Teacher',role:'teacher',permissions:['grades'],activeSharedGrant:'granted'});
 x.clickHeader();x.action('school');
 assert.doesNotMatch(x.panel.innerHTML,/data-account-action="edit-school"/);
 x.action('edit-school');
 assert.equal(x.actions.school,0);
});
test('professor pathway is never intercepted by teacher account entry',()=>{
 const x=setup({id:'prof-1',name:'Professor',role:'teacher'});
 x.htmlClasses.add('nataiji-professor-mode');x.clickHeader();
 assert.equal(x.getModal(),null);
});
test('unsafe account values are escaped and the teacher sheet never touches password or grade storage',()=>{
 const x=setup({id:'teacher-2',name:'<script>evil</script>',email:'evil@example.test',role:'teacher'});
 x.clickHeader();
 assert.doesNotMatch(x.panel.innerHTML,/<script>/);
 assert.match(x.panel.innerHTML,/&lt;script&gt;/);
 assert.doesNotMatch(source,/await save\(/);
 assert.doesNotMatch(source,/localStorage\.setItem\(/);
 assert.doesNotMatch(source,/passwordHash|sessionVersion/);
 assert.match(css,/@media print/);
 assert.match(css,/html:not\(\.nataiji-professor-mode\)/);
 assert.match(index,/teacher-account-sheet-v1\.js\?v=1/);
 assert.match(sw,/teacher-account-sheet-v1\.js\?v=1/);
});
