(()=>{
'use strict';
if(window.__nataijiClassReportLabelsV2)return;
window.__nataijiClassReportLabelsV2=true;
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const fr=()=>localStorage.getItem('nataiji-lang')==='fr';
const SUBJECT_FR={
'التربية الإسلامية':'Éducation islamique','اللغة العربية':'Langue arabe','القراءة':'Lecture','التعبير':'Expression','الكتابة':'Écriture','الرياضيات':'Mathématiques','التربية المدنية':'Éducation civique','التربية الفنية':'Éducation artistique','الرياضة':'Éducation physique','التربية البدنية':'Éducation physique','التاريخ والجغرافيا':'Histoire et géographie','اللغة الفرنسية':'Langue française','Français':'Français','العلوم':'Sciences','العلوم الطبيعية':'Sciences naturelles'
};
function subjectFull(s){
  const raw=String(s?.[0]||'');
  if(!fr())return raw;
  return String(s?.[2]||SUBJECT_FR[raw]||raw);
}
function markHeader(cell,label,isSubject=false){
  if(!cell)return;
  cell.classList.add('full-label-cell');
  if(isSubject)cell.classList.add('full-subject-label');
  cell.dataset.fullLabel=String(label||'').trim();
  const len=String(label||'').replace(/\s+/g,'').length;
  cell.classList.toggle('full-label-vertical',isSubject&&len>9);
}
function hideGeneralStats(portal){
  const labels=['الإحصائيات العامة','الإحصائيات العامة للقسم','إحصائيات عامة','Statistiques générales','Statistiques générales de la classe'];
  qa('h1,h2,h3,h4,h5,h6,p,div,span,strong,b',portal).forEach(el=>{
    const text=String(el.textContent||'').replace(/\s+/g,' ').trim();
    if(!labels.includes(text))return;
    const wrapper=el.closest('.general-stats,.statistics,.stats-summary,.class-stats,.summary-stats');
    if(wrapper){wrapper.classList.add('nataiji-hide-class-stats');return;}
    el.classList.add('nataiji-hide-class-stats');
    let next=el.nextElementSibling;
    if(next&&(next.matches('table,.table-scroll,.stats,.statistics')||next.querySelector?.('table')))next.classList.add('nataiji-hide-class-stats');
  });
}
function fitNameColumn(table){
  const head=table?.tHead?.rows?.[0];
  if(!head)return;
  const cells=[...head.cells];
  let idx=cells.findIndex(c=>/اسم|التلميذ|élève|nom/i.test(String(c.textContent||'')+' '+String(c.dataset.fullLabel||'')));
  if(idx<0&&cells.length>1)idx=1;
  if(idx<0)return;
  cells[idx].classList.add('nataiji-name-head');
  [...(table.tBodies?.[0]?.rows||[])].forEach(r=>r.cells?.[idx]?.classList.add('nataiji-name-cell'));
}
function apply(){
  if(document.body.dataset.print!=='portal'||document.body.dataset.portalType!=='class')return;
  const portal=q('#printPortal');
  const table=q('#printPortal table');
  const row=table?.tHead?.rows?.[0];
  let s;
  try{s=typeof state==='undefined'?null:state}catch{s=null}
  if(row&&s?.subjects?.length){
    const cells=[...row.cells];
    const start=2;
    s.subjects.forEach((sub,j)=>markHeader(cells[start+j],subjectFull(sub),true));
    markHeader(cells[start+s.subjects.length],fr()?'Moyenne':'المعدل');
    markHeader(cells[start+s.subjects.length+1],fr()?'Rang':'الرتبة');
    markHeader(cells[start+s.subjects.length+2],fr()?'Appréciation':'الملاحظة');
  }
  fitNameColumn(table);
  if(portal)hideGeneralStats(portal);
}
const old=q('#nataiji-full-class-labels');if(old)old.remove();
const style=document.createElement('style');
style.id='nataiji-full-class-labels';
style.textContent=`
@media print{
 body[data-print="portal"][data-portal-type="class"] #printPortal .nataiji-hide-class-stats{display:none!important;}
 body[data-print="portal"][data-portal-type="class"] #printPortal th.full-label-cell{font-size:0!important;overflow:visible!important;text-align:center!important;vertical-align:middle!important;}
 body[data-print="portal"][data-portal-type="class"] #printPortal th.full-label-cell>*{display:none!important;}
 body[data-print="portal"][data-portal-type="class"] #printPortal th.full-label-cell::before{content:none!important;display:none!important;}
 body[data-print="portal"][data-portal-type="class"] #printPortal th.full-label-cell::after{content:attr(data-full-label)!important;font-size:6.7pt!important;font-weight:900!important;line-height:1.08!important;color:#000!important;white-space:normal!important;word-break:normal!important;overflow-wrap:normal!important;hyphens:none!important;display:inline-block!important;max-width:100%!important;}
 body[data-print="portal"][data-portal-type="class"] #printPortal th.full-label-vertical{height:28mm!important;padding:.8mm .15mm!important;}
 body[data-print="portal"][data-portal-type="class"] #printPortal th.full-label-vertical::after{writing-mode:vertical-rl!important;text-orientation:mixed!important;white-space:nowrap!important;max-height:26mm!important;max-width:none!important;}
 body[data-print="portal"][data-portal-type="class"] #printPortal th.nataiji-name-head{width:29mm!important;min-width:29mm!important;max-width:29mm!important;font-size:7pt!important;white-space:normal!important;writing-mode:horizontal-tb!important;}
 body[data-print="portal"][data-portal-type="class"] #printPortal td.nataiji-name-cell{width:29mm!important;min-width:29mm!important;max-width:29mm!important;font-size:7pt!important;font-weight:800!important;line-height:1.18!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;padding:1.2mm .8mm!important;}
 body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-v4-density="roomy"] th.full-label-cell::after{font-size:7.1pt!important;}
 body[data-print="portal"][data-portal-type="class"] #printPortal .portal-paper[data-v4-density="dense"] th.full-label-cell::after{font-size:6.2pt!important;}
}
`;
document.head.appendChild(style);
let timer=null;
function later(ms=0){clearTimeout(timer);timer=setTimeout(apply,ms)}
new MutationObserver(()=>later(20)).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target.closest?.('.report-print,[data-print="class"],[data-report="class"]'))later(50)},true);
document.addEventListener('change',()=>later(30),true);
window.addEventListener('beforeprint',apply);
window.addEventListener('DOMContentLoaded',()=>later(150));
setTimeout(()=>later(0),0);
})();