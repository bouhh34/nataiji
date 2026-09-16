(()=>{
'use strict';

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const isFr=()=>localStorage.getItem('nataiji-lang')==='fr';
const subjectMax=s=>{const n=Number(s?.[3]);return Number.isFinite(n)&&n>0?n:20};
const scoreKey=()=>String(state?.activeClassId||state?.classCode||state?.className||'default');
function overallMax(){
  const by=state?.scoringByClass||{};
  const n=Number(by[scoreKey()]?.totalMax ?? state?.totalMax);
  return Number.isFinite(n)&&n>0?n:200;
}
function ensureScoring(){
  if(!state||typeof state!=='object')return;
  state.scoringByClass=state.scoringByClass&&typeof state.scoringByClass==='object'?state.scoringByClass:{};
  const k=scoreKey();
  if(!state.scoringByClass[k])state.scoringByClass[k]={totalMax:Number(state.totalMax)||200};
  if(!Number.isFinite(Number(state.scoringByClass[k].totalMax))||Number(state.scoringByClass[k].totalMax)<=0)state.scoringByClass[k].totalMax=200;
}
function rawSum(i){
  const row=state?.marks?.[i]||[];
  return row.reduce((a,v)=>v===''||v==null?a:a+(Number.isFinite(Number(v))?Number(v):0),0);
}
function scoreAverage(sum){const max=overallMax();return max?sum*20/max:0}

/* Official rule requested by the school: the average is derived from the total.
   Example: total 50/200 => average 5/20. */
calc=function(i){const sum=rawSum(i);return{sum,avg:scoreAverage(sum)}};

cleanMark=function(v,max=20){
  if(v==='')return '';
  const n=Number(v);if(!Number.isFinite(n))return '';
  const m=Number(max);return Math.max(0,Math.min(Number.isFinite(m)&&m>0?m:20,n));
};

bindMarks=function(){
  qa('.mark').forEach(x=>{
    const j=+x.dataset.j,m=subjectMax(state.subjects?.[j]);
    x.max=String(m);x.min='0';x.step='0.1';
    x.oninput=e=>{
      const jj=+e.target.dataset.j,v=cleanMark(e.target.value,subjectMax(state.subjects?.[jj]));
      e.target.value=v;state.marks[+e.target.dataset.i][jj]=v;markDirty();renderDashboard();
    };
  });
};

renderMobileScores=function(){
  const j=Number(q('#subjectPicker')?.value)||0,sub=state.subjects?.[j],m=subjectMax(sub);
  const host=q('#mobileScores');if(!host)return;
  host.innerHTML=`<div class="subject-title"><b>${esc(sub?.[0]||'')}</b><span>${isFr()?'Note sur':'الدرجة من'} ${m}</span></div>`+
    state.pupils.map((p,i)=>`<label class="score-row"><span><b>${i+1}. ${esc(p[1])}</b><small>${esc(p[0])}</small></span><input class="mobile-mark" inputmode="decimal" min="0" max="${m}" step="0.1" data-i="${i}" data-j="${j}" value="${state.marks[i]?.[j]??''}" placeholder="—"><em dir="ltr">/${m}</em></label>`).join('');
  qa('.mobile-mark').forEach(x=>x.oninput=e=>{
    const jj=+e.target.dataset.j,v=cleanMark(e.target.value,subjectMax(state.subjects?.[jj]));
    e.target.value=v;state.marks[+e.target.dataset.i][jj]=v;markDirty();renderDashboard();
  });
};

function patchGradeUi(){
  ensureScoring();
  const hr=q('#scoreHead tr');
  if(hr){
    state.subjects.forEach((s,j)=>{const c=hr.cells?.[j+2];if(c)c.innerHTML=`${esc(s[0])}<br><small dir="ltr">/${subjectMax(s)}</small>`});
  }
  qa('#scores .mark').forEach(x=>{const j=+x.dataset.j,m=subjectMax(state.subjects?.[j]);x.max=String(m);x.title=`0 - ${m}`});
  const b=q('#subjectsBtn');
  if(b){b.innerHTML=isFr()?'<b>▥ Matières et barèmes</b><span>Définir le maximum de chaque matière et le total général</span>':'<b>▥ المواد والدرجات القصوى</b><span>تحديد درجة كل مادة والمجموع العام</span>'}
}

function patchStudentReport(root,i){
  if(!root||!state?.pupils?.[i])return;
  const rows=qa('tbody tr',root.querySelector('.sheet'));
  const n=state.subjects.length;
  for(let j=0;j<n&&j<rows.length;j++){
    const c=rows[j]?.cells?.[1];if(!c)continue;
    const v=state.marks?.[i]?.[j],m=subjectMax(state.subjects[j]);
    c.innerHTML=`<span dir="ltr">${v===''||v==null?'—':esc(v)} / ${m}</span>`;
  }
  const c=calc(i),total=overallMax();
  if(rows[n]?.cells?.[1])rows[n].cells[1].innerHTML=`<strong dir="ltr">${Number(c.sum.toFixed(2))} / ${total}</strong>`;
  if(rows[n+1]?.cells?.[1])rows[n+1].cells[1].innerHTML=`<strong dir="ltr">${c.avg.toFixed(1)} / 20</strong>`;
}

function patchClassReport(root){
  const table=root?.querySelector?.('table')||root;if(!table?.tHead)return;
  const head=table.tHead.rows?.[0];
  state.subjects.forEach((s,j)=>{const c=head?.cells?.[j+2];if(c){const name=c.textContent.replace(/\s*\/\s*\d+(?:\.\d+)?\s*$/,'').trim();c.innerHTML=`${name}<br><small dir="ltr">/${subjectMax(s)}</small>`}});
  qa('tbody tr',table).forEach((r,i)=>{
    state.subjects.forEach((s,j)=>{const c=r.cells?.[j+2],v=state.marks?.[i]?.[j];if(c)c.innerHTML=`<span dir="ltr">${v===''||v==null?'—':esc(v)} / ${subjectMax(s)}</span>`});
    const avgIndex=2+state.subjects.length;if(r.cells?.[avgIndex])r.cells[avgIndex].innerHTML=`<span dir="ltr">${calc(i).avg.toFixed(1)} / 20</span>`;
  });
}

function patchReports(){
  const i=Math.max(0,q('#student')?.selectedIndex??0);
  patchStudentReport(q('#officialSheet'),i);
  qa('#printBatch .batch-sheet').forEach((x,j)=>patchStudentReport(x,j));
  patchClassReport(q('#paperResults'));
  if(document.body.dataset.print==='portal'&&document.body.dataset.portalType==='class')patchClassReport(q('#printPortal .portal-paper'));
}

function openScoringSubjects(){
  if(currentUser?.role!=='admin')return;
  ensureScoring();
  const fr=isFr(),total=overallMax(),sumMax=state.subjects.reduce((a,s)=>a+subjectMax(s),0);
  const p=modal(fr?'Matières et barèmes':'المواد والدرجات القصوى',`
    <div class="score-total-box">
      <label>${fr?'Total général (barème)':'المجموع العام من'}<input id="scoreTotalMax" type="number" min="1" step="1" value="${total}"></label>
      <small>${fr?'Valeur par défaut : 200. La moyenne sur 20 = total obtenu × 20 ÷ total général.':'القيمة الافتراضية: 200. المعدل من 20 = المجموع المحصل × 20 ÷ المجموع العام.'}</small>
    </div>
    <div class="score-subject-head"><b>${fr?'Matière':'المادة'}</b><b>${fr?'Maximum':'الدرجة من'}</b><span></span></div>
    <div id="scoreSubjectRows">${state.subjects.map((s,i)=>`<div class="scoring-subject-row"><input data-score-name="${i}" value="${esc(s[0])}"><input data-score-max="${i}" type="number" min="0.1" step="0.1" value="${subjectMax(s)}"><button data-score-del="${i}">×</button></div>`).join('')}</div>
    <div class="score-max-summary">${fr?'Somme des maxima des matières':'مجموع درجات المواد'}: <strong id="scoreMaxSum">${sumMax}</strong></div>
    <p class="score-warning" id="scoreWarning"></p>
    <button id="scoreNewSubject">${fr?'+ Ajouter une matière':'+ مادة جديدة'}</button>
    <button class="primary action">${fr?'Enregistrer':'حفظ'}</button>
    <p class="message"></p>`);
  const refreshSum=()=>{
    const s=qa('[data-score-max]',p).reduce((a,x)=>a+(Number(x.value)||0),0),t=Number(q('#scoreTotalMax',p).value)||0;
    q('#scoreMaxSum',p).textContent=String(Number(s.toFixed(2)));
    const w=q('#scoreWarning',p);w.textContent=s!==t?(fr?`Attention : la somme des maxima (${Number(s.toFixed(2))}) diffère du total général (${t}). La moyenne sera calculée avec le total général.`:`تنبيه: مجموع درجات المواد (${Number(s.toFixed(2))}) لا يساوي المجموع العام (${t}). سيُحسب المعدل حسب المجموع العام.`):'';
  };
  p.addEventListener('input',e=>{if(e.target.matches('[data-score-max],#scoreTotalMax'))refreshSum()});
  qa('[data-score-del]',p).forEach(b=>b.onclick=async()=>{if(state.subjects.length<=1)return;const i=+b.dataset.scoreDel;state.subjects.splice(i,1);state.marks.forEach(r=>r.splice(i,1));await save(true);p.remove();openScoringSubjects()});
  q('#scoreNewSubject',p).onclick=async()=>{state.subjects.push(['مادة جديدة',1,'',20]);state.marks.forEach(r=>r.push(''));await save(true);p.remove();openScoringSubjects()};
  q('.action',p).onclick=async()=>{
    qa('[data-score-name]',p).forEach(x=>state.subjects[+x.dataset.scoreName][0]=x.value.trim()||'مادة');
    qa('[data-score-max]',p).forEach(x=>{const i=+x.dataset.scoreMax,m=Number(x.value);state.subjects[i][3]=Number.isFinite(m)&&m>0?m:20});
    const t=Number(q('#scoreTotalMax',p).value);state.scoringByClass[scoreKey()]={totalMax:Number.isFinite(t)&&t>0?t:200};state.totalMax=state.scoringByClass[scoreKey()].totalMax;
    const msg=q('.message',p);msg.textContent=fr?'Enregistrement…':'جارٍ الحفظ...';await save(true);render();window.nataijiFinalizeReports?.();patchGradeUi();patchReports();msg.textContent=fr?'✓ Enregistré':'✓ تم الحفظ';setTimeout(()=>p.remove(),450);
  };
  refreshSum();
}

openSubjects=openScoringSubjects;

const originalRender=render;
render=function(){originalRender();patchGradeUi();patchReports()};
const originalRenderReports=renderReports;
renderReports=function(){originalRenderReports();patchReports()};
const originalFinalize=window.nataijiFinalizeReports;
window.nataijiFinalizeReports=function(){originalFinalize?.();patchGradeUi();patchReports()};

function install(){
  ensureScoring();patchGradeUi();patchReports();
  const b=q('#subjectsBtn');if(b)b.onclick=e=>{e?.preventDefault?.();openScoringSubjects()};
}

const css=document.createElement('style');css.textContent=`
.score-total-box{padding:12px;border:1px solid #d5e2eb;border-radius:10px;background:#f7fbfd;margin-bottom:14px}.score-total-box label{margin:0!important}.score-total-box small{display:block;margin-top:7px;color:#607789;line-height:1.5}.score-subject-head,.scoring-subject-row{display:grid;grid-template-columns:minmax(0,1fr) 110px 40px;gap:8px;align-items:center}.score-subject-head{font-size:12px;color:#647988;margin:4px 0}.scoring-subject-row{margin:7px 0}.scoring-subject-row input{width:100%!important;margin:0!important}.scoring-subject-row button{height:44px;border:0;background:#fee;color:#a22;border-radius:8px}.score-max-summary{margin:12px 0 4px;font-weight:800}.score-warning{min-height:20px;color:#a55b00;font-size:12px;line-height:1.45}.score-total-box input{font-size:18px;font-weight:800}@media(max-width:560px){.score-subject-head,.scoring-subject-row{grid-template-columns:minmax(0,1fr) 88px 38px}}
`;
document.head.appendChild(css);

new MutationObserver(()=>{if(q('#subjectsBtn')){const b=q('#subjectsBtn');if(b.onclick!==openScoringSubjects)b.onclick=e=>{e?.preventDefault?.();openScoringSubjects()}}}).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('beforeprint',()=>{patchGradeUi();patchReports()});
window.addEventListener('DOMContentLoaded',()=>setTimeout(install,900));
setTimeout(install,0);setTimeout(install,1400);
})();
