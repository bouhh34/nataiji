(()=>{
'use strict';
if(window.__nataijiAppStabilityV1)return;
window.__nataijiAppStabilityV1=true;
const UI_KEY='nataiji-ui-state-v1';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
function readUi(){try{return JSON.parse(localStorage.getItem(UI_KEY)||'{}')||{}}catch{return{}}}
function writeUi(patch={}){const next={...readUi(),...patch};localStorage.setItem(UI_KEY,JSON.stringify(next));return next}
const initialUi=readUi();
if(initialUi.view){document.documentElement.dataset.nataijiRestoreView=initialUi.view;const guard=document.createElement('style');guard.id='nataiji-refresh-guard';guard.textContent=`html[data-nataiji-restore-view] body{visibility:hidden!important}html.nataiji-restored body{visibility:visible!important}`;document.head.appendChild(guard)}
function currentView(){return q('.view:not(.hidden)')?.dataset?.page||'home'}
function currentReport(){return q('[data-report].active')?.dataset?.report||(!q('#classReport')?.classList.contains('hidden')?'class':(!q('#listReport')?.classList.contains('hidden')?'list':'student'))}
function saveUi(){writeUi({view:currentView(),report:currentReport(),student:q('#student')?.value??'',subject:q('#subjectPicker')?.value??'',term:q('#term')?.value??'',classTop:q('#classTop')?.value??'',yearTop:q('#yearTop')?.value??'',scrollY:Math.max(0,window.scrollY||0)})}
function restoreSelect(sel,value,after){const el=q(sel);if(!el||value===undefined||value==='')return;if([...el.options].some(o=>o.value===String(value))){el.value=String(value);try{after?.()}catch{}}}
function restoreUi(){const ui=readUi();try{if(ui.view&&typeof setView==='function')setView(ui.view)}catch{}try{if(ui.report&&typeof showReport==='function')showReport(ui.report)}catch{}restoreSelect('#classTop',ui.classTop,()=>q('#classTop')?.dispatchEvent(new Event('change',{bubbles:true})));restoreSelect('#yearTop',ui.yearTop);restoreSelect('#student',ui.student,()=>{try{renderReports()}catch{}});restoreSelect('#subjectPicker',ui.subject,()=>{try{renderMobileScores()}catch{}});restoreSelect('#term',ui.term);if(Number.isFinite(Number(ui.scrollY)))requestAnimationFrame(()=>window.scrollTo(0,Number(ui.scrollY)));document.documentElement.classList.add('nataiji-restored');document.documentElement.removeAttribute('data-nataiji-restore-view')}
function callNo(p,i){return String(p?.[5]??'').trim()||String(i+1)}
function syncAdminCallNumbers(){let s;try{s=typeof state==='undefined'?null:state}catch{s=null}if(!s)return;const head=q('.student-table thead tr');if(head?.cells?.[0])head.cells[0].textContent=localStorage.getItem('nataiji-lang')==='fr'?'N° d’appel':'رقم النداء';qa('#list tr').forEach((row,i)=>{if(row.cells?.[0]&&s.pupils?.[i])row.cells[0].textContent=callNo(s.pupils[i],i)})}
let timer=null;function settle(ms=0){clearTimeout(timer);timer=setTimeout(()=>{syncAdminCallNumbers();restoreUi()},ms)}
document.addEventListener('input',e=>{if(e.target.matches?.('.mark,.mobile-mark,input,select,textarea'))writeUi({student:q('#student')?.value??'',subject:q('#subjectPicker')?.value??'',term:q('#term')?.value??'',classTop:q('#classTop')?.value??'',yearTop:q('#yearTop')?.value??''})},true);
document.addEventListener('change',e=>{saveUi();if(e.target.matches?.('#student,#subjectPicker,#term,#classTop,#yearTop'))settle(40)},true);
document.addEventListener('click',e=>{const v=e.target.closest?.('[data-view]'),r=e.target.closest?.('[data-report]');if(v)writeUi({view:v.dataset.view});if(r)writeUi({report:r.dataset.report});setTimeout(saveUi,50)},true);
window.addEventListener('pagehide',saveUi);window.addEventListener('beforeunload',saveUi);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveUi()});
new MutationObserver(()=>{clearTimeout(window.__nataijiStableTimer);window.__nataijiStableTimer=setTimeout(syncAdminCallNumbers,60)}).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('DOMContentLoaded',()=>{settle(0);settle(100);settle(350);setTimeout(()=>document.documentElement.classList.add('nataiji-restored'),450)});setTimeout(()=>settle(0),0);
})();