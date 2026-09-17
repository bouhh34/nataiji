(()=>{
'use strict';
if(window.__nataijiAppStabilityV1)return;
window.__nataijiAppStabilityV1=true;
const UI_KEY='nataiji-ui-state-v1';
const DATA_KEY='nataiji-data';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
function readUi(){try{return JSON.parse(localStorage.getItem(UI_KEY)||'{}')||{}}catch{return{}}}
function writeUi(patch={}){const next={...readUi(),...patch};localStorage.setItem(UI_KEY,JSON.stringify(next));return next}
function persistData(){try{if(typeof state!=='undefined'&&state&&typeof state==='object')localStorage.setItem(DATA_KEY,JSON.stringify(state))}catch{}}
try{
  if(typeof normalizeState==='function'&&!window.__nataijiNormalizePatched){
    window.__nataijiNormalizePatched=true;
    const original=normalizeState;
    normalizeState=function(serverState){
      let local=null;try{local=JSON.parse(localStorage.getItem(DATA_KEY)||'null')}catch{}
      return original(local&&typeof local==='object'?local:serverState);
    };
  }
}catch{}
function currentView(){return q('.view:not(.hidden)')?.dataset?.page||'home'}
function currentReport(){return q('[data-report].active')?.dataset?.report||(!q('#classReport')?.classList.contains('hidden')?'class':(!q('#listReport')?.classList.contains('hidden')?'list':'student'))}
function saveUi(){const ui={view:currentView(),report:currentReport(),student:q('#student')?.value??'',subject:q('#subjectPicker')?.value??'',term:q('#term')?.value??'',scrollY:Math.max(0,window.scrollY||0)};writeUi(ui);persistData()}
function restoreUi(){const ui=readUi();try{if(ui.view&&typeof setView==='function')setView(ui.view)}catch{};try{if(ui.report&&typeof showReport==='function')showReport(ui.report)}catch{};const student=q('#student');if(student&&ui.student!==undefined&&[...student.options].some(o=>o.value===String(ui.student))){student.value=String(ui.student);try{renderReports()}catch{}}const subject=q('#subjectPicker');if(subject&&ui.subject!==undefined&&[...subject.options].some(o=>o.value===String(ui.subject))){subject.value=String(ui.subject);try{renderMobileScores()}catch{}}if(ui.term&&q('#term')&&[...q('#term').options].some(o=>o.value===String(ui.term)))q('#term').value=String(ui.term);if(Number.isFinite(Number(ui.scrollY)))setTimeout(()=>window.scrollTo({top:Number(ui.scrollY),behavior:'auto'}),0)}
function callNo(p,i){return String(p?.[5]??'').trim()||String(i+1)}
function syncAdminCallNumbers(){let s;try{s=typeof state==='undefined'?null:state}catch{s=null}if(!s)return;const head=q('.student-table thead tr');if(head?.cells?.[0])head.cells[0].textContent=localStorage.getItem('nataiji-lang')==='fr'?'N° d’appel':'رقم النداء';qa('#list tr').forEach((row,i)=>{if(row.cells?.[0]&&s.pupils?.[i])row.cells[0].textContent=callNo(s.pupils[i],i)})}
let timer=null;function settle(ms=0){clearTimeout(timer);timer=setTimeout(()=>{syncAdminCallNumbers();restoreUi()},ms)}
document.addEventListener('input',e=>{if(e.target.matches?.('.mark,.mobile-mark,input,select,textarea')){persistData();writeUi({student:q('#student')?.value??'',subject:q('#subjectPicker')?.value??'',term:q('#term')?.value??''})}},true);
document.addEventListener('change',e=>{saveUi();if(e.target.matches?.('#student,#subjectPicker,#term,#classTop,#yearTop'))settle(60)},true);
document.addEventListener('click',e=>{const v=e.target.closest?.('[data-view]'),r=e.target.closest?.('[data-report]');if(v)writeUi({view:v.dataset.view});if(r)writeUi({report:r.dataset.report});setTimeout(saveUi,80)},true);
window.addEventListener('pagehide',saveUi);window.addEventListener('beforeunload',saveUi);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveUi()});
new MutationObserver(()=>{clearTimeout(window.__nataijiStableTimer);window.__nataijiStableTimer=setTimeout(syncAdminCallNumbers,60)}).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('DOMContentLoaded',()=>{settle(120);settle(500);settle(1200)});setTimeout(()=>{persistData();settle(0)},0);
})();