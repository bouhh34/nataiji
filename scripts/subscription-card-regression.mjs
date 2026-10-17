import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const code=fs.readFileSync(new URL('../public/commercial-foundation-v1.js',import.meta.url),'utf8');
function mountFixture(){
  const timers=[],listeners={},observers=[],classes=new Set();
  let currentUser=null,language='ar';
  let modalCount=0;
  class Element {
    constructor(tag){this.tagName=tag;this.dataset={};this.attributes={};this.children=[];this.innerHTML='';this.handlers={};}
    addEventListener(type,fn){(this.handlers[type]??=[]).push(fn)}
    querySelector(selector){
      if(selector===':scope > b')return this.innerHTML.includes('<b>')?{}:null;
      if(selector===':scope > span')return this.innerHTML.includes('<span>')?{}:null;
      if(selector==='.x'||selector==='.plan-close')return {onclick:null};
      return null;
    }
  }
  const grid={
    nodes:[],
    querySelector(selector){
      if(selector==='#subscriptionBtn')return this.nodes.find(x=>x.id==='subscriptionBtn')??null;
      return null;
    },
    insertBefore(node){this.nodes.push(node)}
  };
  const page={querySelector:q=>q==='.settings-grid'?grid:null};
  const document={
    documentElement:{classList:{contains:name=>classes.has(name)}},
    head:{appendChild(){}},
    body:{appendChild(){modalCount++}},
    createElement:tag=>new Element(tag),
    querySelector:q=>q==='[data-page="more"]'?page:null,
    addEventListener:(event,fn)=>{(listeners[event]??=[]).push(fn)},
    hidden:false
  };
  const window={
    addEventListener:(event,fn)=>{(listeners['window:'+event]??=[]).push(fn)}
  };
  const context=vm.createContext({
    document,window,console,
    setTimeout:fn=>{timers.push(fn);return timers.length},
    MutationObserver:class {constructor(fn){this.callback=fn;observers.push(this)}observe(){}},
    localStorage:{getItem:()=>language},
    get currentUser(){return currentUser}
  });
  vm.runInContext(code,context);
  function drain(limit=20){let n=0;while(timers.length){const fn=timers.shift();fn();assert.ok(++n<limit,'unexpected rendering loop')}}
  function nav(){
    for(const fn of listeners.click??[])fn({target:{closest:selector=>selector.includes('data-view="more"')?{}:null}});
    drain();
  }
  return {
    grid,observers,context,drain,nav,
    login:()=>{currentUser={id:'teacher-demo'}},
    logout:()=>{currentUser=null},
    setLanguage:l=>language=l,
    getModalCount:()=>modalCount,
    getNavListenerCount:()=>listeners.click?.length||0
  };
}

test('plan appears after delayed authentication on opening More and stays unique',()=>{
  const f=mountFixture();
  f.drain();
  assert.equal(f.grid.nodes.length,0);
  f.login();
  f.nav();
  assert.equal(f.grid.nodes.length,1);
  const card=f.grid.nodes[0];
  assert.match(card.innerHTML,/الخطة والاشتراك/);
  assert.match(card.innerHTML,/مجاني/);
  for(let i=0;i<10;i++)f.nav();
  assert.equal(f.grid.nodes.length,1);
  assert.equal(card.handlers.click.length,1);
});

test('leading-edge schedule cannot be indefinitely postponed by DOM mutations',()=>{
  const f=mountFixture();
  f.login();
  for(let i=0;i<200;i++){
    for(const o of f.observers)o.callback([{addedNodes:[{nodeType:1,matches:q=>q.includes('subscriptionBtn'),querySelector:()=>null}],removedNodes:[]}]);
  }
  f.drain();
  assert.equal(f.grid.nodes.length,1);
});

test('same card updates AR/FR and opens plan without charging the user',()=>{
  const f=mountFixture();
  f.login();f.nav();
  const card=f.grid.nodes[0];
  f.setLanguage('fr');f.nav();
  assert.equal(f.grid.nodes[0],card);
  assert.match(card.innerHTML,/Offre et abonnement/);
  assert.match(card.innerHTML,/GRATUIT/);
  assert.equal(card.handlers.click.length,1);
  card.handlers.click[0]({preventDefault(){}});
  assert.equal(f.getModalCount(),1);
});
