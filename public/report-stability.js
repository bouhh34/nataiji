(()=>{
'use strict';
function normalizeClassEvaluation(){
  const table=document.querySelector('#paperResults');
  if(!table?.tHead?.rows?.[0]||!table.tBodies?.[0])return;
  const head=table.tHead.rows[0];
  const cells=[...head.cells];
  const indexes=[];
  cells.forEach((c,i)=>{const t=c.textContent.trim();if(c.dataset.evalCol==='1'||t==='التقييم'||t==='Appréciation')indexes.push(i)});
  if(!indexes.length)return;
  const keep=indexes[0];
  for(let n=indexes.length-1;n>0;n--){const idx=indexes[n];head.deleteCell(idx);[...table.tBodies[0].rows].forEach(r=>{if(r.cells[idx])r.deleteCell(idx)})}
  if(head.cells[keep])head.cells[keep].dataset.evalCol='1';
  [...table.tBodies[0].rows].forEach(r=>{if(r.cells[keep])r.cells[keep].dataset.evalCell='1'});
}
let timer;const schedule=()=>{clearTimeout(timer);timer=setTimeout(normalizeClassEvaluation,0)};
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('beforeprint',normalizeClassEvaluation);
window.addEventListener('DOMContentLoaded',()=>setTimeout(normalizeClassEvaluation,300));
})();
