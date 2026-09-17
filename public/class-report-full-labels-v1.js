(()=>{
'use strict';
const q=(s,r=document)=>r.querySelector(s);
const fr=()=>localStorage.getItem('nataiji-lang')==='fr';
const SUBJECT_FR={
'التربية الإسلامية':'Éducation islamique','اللغة العربية':'Langue arabe','القراءة':'Lecture','التعبير':'Expression','الكتابة':'Écriture','الرياضيات':'Mathématiques','التربية المدنية':'Éducation civique','التربية الفنية':'Éducation artistique','الرياضة':'Éducation physique','التربية البدنية':'Éducation physique','التاريخ والجغرافيا':'Histoire et géographie','اللغة الفرنسية':'Langue française','Français':'Français','العلوم':'Sciences','العلوم الطبيعية':'Sciences naturelles'
};
function subjectFull(s){
  const raw=String(s?.[0]||'');
  if(!fr()) return raw;
  return String(s?.[2]||SUBJECT_FR[raw]||raw);
}
function markHeader(cell,label,isSubject=false){
  if(!cell)return;
  cell.classList.add('full-label-cell');
  if(isSubject)cell.classList.add('full-subject-label');
  cell.dataset.fullLabel=String(label||'');
  const len=String(label||'').replace(/\s+/g,'').length;
  cell.classList.toggle('full-label-vertical',isSubject && len>9);
}
function apply(){
  if(document.body.dataset.print!=='portal'||document.body.dataset.portalType!=='class')return;
  const table=q('#printPortal table');
  const row=table?.tHead?.rows?.[0];
  let s;
  try{s=typeof state==='undefined'?null:state}catch{s=null}
  if(!row||!s?.subjects?.length)return;
  const cells=[...row.cells];
  const start=2;
  s.subjects.forEach((sub,j)=>markHeader(cells[start+j],subjectFull(sub),true));
  const avg=cells[start+s.subjects.length];
  const rank=cells[start+s.subjects.length+1];
  const app=cells[start+s.subjects.length+2];
  markHeader(avg,fr()?'Moyenne':'المعدل');
  markHeader(rank,fr()?'Rang':'الرتبة');
  markHeader(app,fr()?'Appréciation':'الملاحظة');
}
const style=document.createElement('style');
style.id='nataiji-full-class-labels';
style.textContent=`
@media print{
 body[data-print="portal"][data-portal-type="class"] #printPortal th.full-label-cell{font-size:0!important;overflow:visible!important;text-align:center!important;vertical-align:middle!important;}
 body[data-print="portal"][data-portal-type="class"] #printPortal th.full-label-cell::after{content:attr(data-full-label);font-size:6.7pt!important;font-weight:900!important;line-height:1.08!important;color:#000!important;white-space:normal!important;word-break:normal!important;overflow-wrap:normal!important;hyphens:none!important;display:inline-block!important;max-width:100%!important;}
 body[data-print="portal"][data-portal-type="class"] #printPortal th.full-label-vertical{height:28mm!important;padding:.8mm .15mm!important;}
 body[data-print="portal"][data-portal-type="class"] #printPortal th.full-label-vertical::after{writing-mode:vertical-rl!important;text-orientation:mixed!important;white-space:nowrap!important;max-height:26mm!important;max-width:none!important;}
 body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-v4-density="roomy"] th.full-label-cell::after{font-size:7.1pt!important;}
 body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-v4-density="dense"] th.full-label-cell::after{font-size:6.2pt!important;}
}
`;
document.head.appendChild(style);
let timer=null;
function later(ms=0){clearTimeout(timer);timer=setTimeout(app,ms)}
new MutationObserver(()=>later(0)).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target.closest?.('.report-print,[data-print="class"]'))later(60)},true);
window.addEventListener('beforeprint',apply);
window.addEventListener('DOMContentLoaded',()=>later(250));
setTimeout(()=>later(0),0);
})();