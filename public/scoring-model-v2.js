(()=>{
'use strict';

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const isFr=()=>localStorage.getItem('nataiji-lang')==='fr';
const escHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const subjectMax=s=>{const n=Number(s?.[3]);return Number.isFinite(n)&&n>0?n:20};
const PROFILE_VERSION=2;

/* Default scales taken from the school bulletin models supplied by the user.
   Each row is: Arabic name, French/Latin label, maximum mark. */
const CLASS_PROFILES={
  1:{totalMax:200,subjects:[
    ['التربية الإسلامية','Éducation islamique',40],
    ['اللغة العربية','Langue arabe',80],
    ['التربية المدنية','Éducation civique',15],
    ['الرياضيات','Mathématiques',40],
    ['التربية الفنية','Éducation artistique',15],
    ['الرياضة','Éducation physique',10]
  ]},
  2:{totalMax:200,subjects:[
    ['التربية الإسلامية','Éducation islamique',30],
    ['اللغة العربية','Langue arabe',50],
    ['الحساب','Calcul',40],
    ['التربية المدنية','Éducation civique',15],
    ['التربية الفنية','Éducation artistique',15],
    ['Français','Français',40],
    ['الرياضة','Éducation physique',10]
  ]},
  3:{totalMax:200,subjects:[
    ['التربية الإسلامية','Éducation islamique',30],
    ['اللغة العربية','Langue arabe',50],
    ['الرياضيات','Mathématiques',40],
    ['التربية المدنية','Éducation civique',10],
    ['التربية الفنية','Éducation artistique',10],
    ['التاريخ والجغرافيا','Histoire et géographie',10],
    ['Français','Français',30],
    ['العلوم','Sciences',10],
    ['الرياضة','Éducation physique',10]
  ]},
  4:{totalMax:200,subjects:[
    ['التربية الإسلامية','Éducation islamique',30],
    ['اللغة العربية','Langue arabe',50],
    ['الرياضيات','Mathématiques',40],
    ['التربية المدنية','Éducation civique',10],
    ['التربية الفنية','Éducation artistique',10],
    ['التاريخ والجغرافيا','Histoire et géographie',10],
    ['Français','Français',30],
    ['العلوم','Sciences',10],
    ['الرياضة','Éducation physique',10]
  ]},
  5:{totalMax:200,subjects:[
    ['التربية الإسلامية','Éducation islamique',30],
    ['اللغة العربية','Langue arabe',50],
    ['الرياضيات','Mathématiques',40],
    ['التربية المدنية والفنية','Éducation civique et artistique',20],
    ['التاريخ والجغرافيا','Histoire et géographie',20],
    ['Français','Français',30],
    ['العلوم الطبيعية','Sciences naturelles',10]
  ]},
  6:{totalMax:200,subjects:[
    ['التربية الإسلامية','Éducation islamique',30],
    ['اللغة العربية','Langue arabe',50],
    ['الرياضيات','Mathématiques',40],
    ['التربية المدنية والفنية','Éducation civique et artistique',20],
    ['التاريخ والجغرافيا','Histoire et géographie',20],
    ['Français','Français',30],
    ['العلوم الطبيعية','Sciences naturelles',10]
  ]}
};

const scoreKey=()=>String(state?.activeClassId||state?.classCode||state?.className||'default');
function activeClass(){return state?.classes?.find(c=>c.id===state.activeClassId)||null}
function detectLevel(){
  const c=activeClass();
  const raw=[c?.code,c?.name,state?.classCode,state?.className].filter(Boolean).join(' ');
  const af=raw.match(/(?:^|\s)([1-6])\s*AF\b/i);if(af)return Number(af[1]);
  const words=[['الأولى',1],['الاولى',1],['الثانية',2],['الثالثة',3],['الرابعة',4],['الخامسة',5],['السادسة',6],['première',1],['deuxième',2],['troisième',3],['quatrième',4],['cinquième',5],['sixième',6]];
  const low=raw.toLowerCase();for(const [w,n] of words)if(low.includes(w))return n;
  const m=raw.match(/(?:السنة|القسم|classe|année)\s*([1-6])/i);return m?Number(m[1]):0;
}
function ensureScoring(){
  if(!state||typeof state!=='object')return null;
  state.scoringByClass=state.scoringByClass&&typeof state.scoringByClass==='object'?state.scoringByClass:{};
  const k=scoreKey();
  if(!state.scoringByClass[k])state.scoringByClass[k]={totalMax:Number(state.totalMax)||200,profileVersion:0,profileLevel:0,customized:false};
  const cfg=state.scoringByClass[k];
  if(!Number.isFinite(Number(cfg.totalMax))||Number(cfg.totalMax)<=0)cfg.totalMax=200;
  if(typeof cfg.customized!=='boolean')cfg.customized=false;
  return cfg;
}
function overallMax(){const sum=(state?.subjects||[]).reduce((a,s)=>a+subjectMax(s),0),n=sum||Number(state?.totalMax)||200;const cfg=ensureScoring();if(cfg)cfg.totalMax=n;if(state)state.totalMax=n;return n}
function normName(v){return String(v||'').trim().toLowerCase().replace(/[ًٌٍَُِّْـ]/g,'').replace(/\s+/g,' ')}
function remapRows(rows,oldSubjects,newSubjects){
  const old=(oldSubjects||[]).map(s=>normName(s?.[0])),same=(oldSubjects||[]).length===newSubjects.length;
  return (rows||[]).map(row=>newSubjects.map((s,j)=>{let k=old.indexOf(normName(s[0]));if(k<0&&same)k=j;return k>=0?(row?.[k]??''):''}))
}
function syncClassData(){
  const d=state?.classData?.[state.activeClassId];if(!d)return;
  d.subjects=structuredClone(state.subjects||[]);
  d.marksByTerm=d.marksByTerm&&typeof d.marksByTerm==='object'?d.marksByTerm:{};
  d.marksByTerm[state.term]=structuredClone(state.marks||[]);
}
let autoSaveTimer;
function queueSave(){clearTimeout(autoSaveTimer);autoSaveTimer=setTimeout(()=>{try{save(true)}catch{}},220)}
function applyClassProfile(level,force=false){
  if(currentUser?.role==='teacher')return false;
  const profile=CLASS_PROFILES[level],cfg=ensureScoring();if(!profile||!cfg)return false;
  if(!force&&cfg.customized)return false;
  if(!force&&cfg.profileVersion===PROFILE_VERSION&&cfg.profileLevel===level)return false;
  const oldSubjects=structuredClone(state.subjects||[]),newSubjects=profile.subjects.map(([ar,frName,max])=>[ar,1,frName,max]);
  state.subjects=newSubjects;
  state.marks=remapRows(state.marks||[],oldSubjects,newSubjects);
  if(state.marksByTerm&&typeof state.marksByTerm==='object'){
    for(const term of Object.keys(state.marksByTerm))state.marksByTerm[term]=remapRows(state.marksByTerm[term],oldSubjects,newSubjects);
    state.marksByTerm[state.term]=structuredClone(state.marks);
  }
  cfg.totalMax=profile.totalMax;cfg.profileVersion=PROFILE_VERSION;cfg.profileLevel=level;cfg.customized=false;
  state.totalMax=profile.totalMax;
  syncClassData();queueSave();return true;
}
function ensureClassProfile(){
  const cfg=ensureScoring(),level=detectLevel();if(!cfg)return;
  if(currentUser?.role==='teacher'){
    (state.subjects||[]).forEach(s=>{if(!Number.isFinite(Number(s[3]))||Number(s[3])<=0)s[3]=20});
    const visibleTotal=(state.subjects||[]).reduce((a,s)=>a+subjectMax(s),0);state.totalMax=visibleTotal||200;cfg.totalMax=state.totalMax;return
  }
  state.totalMax=(state.subjects||[]).reduce((a,s)=>a+subjectMax(s),0)||Number(cfg.totalMax)||200;cfg.totalMax=state.totalMax;
  if(level&&!state.subjects.length&&!cfg.customized)applyClassProfile(level,false);
  (state.subjects||[]).forEach(s=>{if(!Number.isFinite(Number(s[3]))||Number(s[3])<=0)s[3]=20});
}
function rawSum(i){const row=state?.marks?.[i]||[];return row.reduce((a,v)=>v===''||v==null?a:a+(Number.isFinite(Number(v))?Number(v):0),0)}
function scoreAverage(sum){const max=overallMax();return max?sum*20/max:0}

/* Average rule: total obtained / configured grand total × 20.
   Example: 50 / 200 = 5 / 20. */
calc=function(i){const sum=rawSum(i);return{sum,avg:scoreAverage(sum),totalMax:overallMax()}};
ranks=function(){const av=(state?.pupils||[]).map((_,i)=>calc(i).avg);return av.map(v=>1+av.filter(x=>x>v).length)};
cleanMark=function(v,max=20){if(v==='')return '';const n=Number(v);if(!Number.isFinite(n))return '';const m=Number(max);return Math.max(0,Math.min(Number.isFinite(m)&&m>0?m:20,n))};

bindMarks=function(){
  qa('.mark').forEach(x=>{
    const j=+x.dataset.j,m=subjectMax(state.subjects?.[j]);x.max=String(m);x.min='0';x.step='0.1';
    x.oninput=e=>{const jj=+e.target.dataset.j,v=cleanMark(e.target.value,subjectMax(state.subjects?.[jj]));e.target.value=v;state.marks[+e.target.dataset.i][jj]=v;markDirty();renderDashboard()};
  });
};
renderMobileScores=function(){
  const j=Number(q('#subjectPicker')?.value)||0,sub=state.subjects?.[j],m=subjectMax(sub),host=q('#mobileScores');if(!host)return;
  host.innerHTML=`<div class="subject-title"><b>${esc(sub?.[0]||'')}</b><span>${isFr()?'Note sur':'الدرجة من'} ${m}</span></div>`+state.pupils.map((p,i)=>`<label class="score-row"><span><b>${i+1}. ${esc(p[1])}</b><small>${esc(p[0])}</small></span><input class="mobile-mark" inputmode="decimal" min="0" max="${m}" step="0.1" data-i="${i}" data-j="${j}" value="${state.marks[i]?.[j]??''}" placeholder="—"><em dir="ltr">/${m}</em></label>`).join('');
  qa('.mobile-mark').forEach(x=>x.oninput=e=>{const jj=+e.target.dataset.j,v=cleanMark(e.target.value,subjectMax(state.subjects?.[jj]));e.target.value=v;state.marks[+e.target.dataset.i][jj]=v;markDirty();renderDashboard()});
};

function patchGradeUi(){
  ensureClassProfile();
  const hr=q('#scoreHead tr');if(hr)state.subjects.forEach((s,j)=>{const c=hr.cells?.[j+2];if(c)c.innerHTML=`${esc(s[0])}<br><small dir="ltr">/${subjectMax(s)}</small>`});
  qa('#scores .mark').forEach(x=>{const j=+x.dataset.j,m=subjectMax(state.subjects?.[j]);x.max=String(m);x.title=`0 - ${m}`});
  const b=q('#subjectsBtn');if(b)b.innerHTML=isFr()?'<b>Matières et barèmes</b><span>Définir le maximum de chaque matière et le total général</span>':'<b>المواد والدرجات القصوى</b><span>تحديد درجة كل مادة والمجموع العام</span>';
}
function patchStudentReport(root,i){
  if(!root||!state?.pupils?.[i])return;const rows=qa('tbody tr',root.querySelector('.sheet')),n=state.subjects.length;
  const hc=root.querySelector('.sheet thead tr')?.cells;if(hc?.[1])hc[1].textContent=isFr()?'Note / Barème':'الدرجة / من';
  for(let j=0;j<n&&j<rows.length;j++){const c=rows[j]?.cells?.[1];if(!c)continue;const v=state.marks?.[i]?.[j],m=subjectMax(state.subjects[j]);c.innerHTML=`<span dir="ltr">${v===''||v==null?'—':esc(v)} / ${m}</span>`}
  const c=calc(i),total=overallMax();if(rows[n]?.cells?.[1])rows[n].cells[1].innerHTML=`<strong dir="ltr">${Number(c.sum.toFixed(2))} / ${total}</strong>`;if(rows[n+1]?.cells?.[1])rows[n+1].cells[1].innerHTML=`<strong dir="ltr">${c.avg.toFixed(1)} / 20</strong>`;
}
function patchClassReport(root){
  const table=root?.querySelector?.('table')||root;if(!table?.tHead)return;const head=table.tHead.rows?.[0];
  state.subjects.forEach((s,j)=>{const c=head?.cells?.[j+2];if(c){const name=c.textContent.replace(/\s*\/\s*\d+(?:\.\d+)?\s*$/,'').trim();c.innerHTML=`${escHtml(name)}<br><small dir="ltr">/${subjectMax(s)}</small>`}});
  qa('tbody tr',table).forEach((r,i)=>{state.subjects.forEach((s,j)=>{const c=r.cells?.[j+2],v=state.marks?.[i]?.[j];if(c)c.innerHTML=`<span dir="ltr">${v===''||v==null?'—':esc(v)} / ${subjectMax(s)}</span>`});const avgIndex=2+state.subjects.length;if(r.cells?.[avgIndex])r.cells[avgIndex].innerHTML=`<span dir="ltr">${calc(i).avg.toFixed(1)} / 20</span>`});
}
function patchReports(){
  const i=Math.max(0,q('#student')?.selectedIndex??0);patchStudentReport(q('#officialSheet'),i);
  qa('#printBatch .batch-sheet').forEach((x,j)=>patchStudentReport(x,j));
  const third=state?.term==='الفصل الثالث'||/الثالث|3e|3ème|3eme/i.test(String(state?.term||''));
  if(third&&typeof window.nataijiApplyAnnualReports==='function'){window.nataijiApplyAnnualReports();return}
  patchClassReport(q('#paperResults'));
  if(document.body.dataset.print==='portal'&&document.body.dataset.portalType==='class')patchClassReport(q('#printPortal .portal-paper'));
}

function openScoringSubjects(){
  if(currentUser?.role!=='admin')return;ensureClassProfile();const cfg=ensureScoring(),fr=isFr(),total=overallMax(),sumMax=state.subjects.reduce((a,s)=>a+subjectMax(s),0),level=detectLevel();
  const p=modal(fr?'Matières et barèmes':'المواد والدرجات القصوى',`
    <div class="score-total-box"><label>${fr?'Total général (barème)':'المجموع العام من'}<input id="scoreTotalMax" type="number" min="1" step="1" value="${total}"></label><small>${fr?'Valeur par défaut : 200. La moyenne sur 20 = total obtenu × 20 ÷ total général.':'القيمة الافتراضية: 200. المعدل من 20 = المجموع المحصل × 20 ÷ المجموع العام.'}</small></div>
    <div class="score-subject-head"><b>${fr?'Matière':'المادة'}</b><b>${fr?'Maximum':'الدرجة من'}</b><span></span></div>
    <div id="scoreSubjectRows">${state.subjects.map((s,i)=>`<div class="scoring-subject-row"><input data-score-name="${i}" value="${esc(s[0])}"><input data-score-max="${i}" type="number" min="0.1" step="0.1" value="${subjectMax(s)}"><button data-score-del="${i}">×</button></div>`).join('')}</div>
    <div class="score-max-summary">${fr?'Somme des maxima des matières':'مجموع درجات المواد'}: <strong id="scoreMaxSum">${sumMax}</strong></div>
    <p class="score-warning" id="scoreWarning"></p>
    <button id="scoreNewSubject">${fr?'+ Ajouter une matière':'+ مادة جديدة'}</button>
    ${level?`<button id="scoreResetProfile">${fr?'Restaurer le barème automatique de cette classe':'استرجاع المواد والدرجات التلقائية لهذه السنة'}</button>`:''}
    <button class="primary action">${fr?'Enregistrer':'حفظ'}</button><p class="message"></p>`);
  const refreshSum=()=>{const s=qa('[data-score-max]',p).reduce((a,x)=>a+(Number(x.value)||0),0),t=Number(q('#scoreTotalMax',p).value)||0;q('#scoreMaxSum',p).textContent=String(Number(s.toFixed(2)));const w=q('#scoreWarning',p);w.textContent=s!==t?(fr?`Attention : la somme des maxima (${Number(s.toFixed(2))}) diffère du total général (${t}). La moyenne sera calculée avec le total général.`:`تنبيه: مجموع درجات المواد (${Number(s.toFixed(2))}) لا يساوي المجموع العام (${t}). سيُحسب المعدل حسب المجموع العام.`):''};
  p.addEventListener('input',e=>{if(e.target.matches('[data-score-max],#scoreTotalMax'))refreshSum()});
  qa('[data-score-del]',p).forEach(b=>b.onclick=async()=>{if(state.subjects.length<=1)return;const i=+b.dataset.scoreDel;state.subjects.splice(i,1);state.marks.forEach(r=>r.splice(i,1));cfg.customized=true;syncClassData();await save(true);p.remove();openScoringSubjects()});
  q('#scoreNewSubject',p).onclick=async()=>{state.subjects.push(['مادة جديدة',1,'',20]);state.marks.forEach(r=>r.push(''));cfg.customized=true;syncClassData();await save(true);p.remove();openScoringSubjects()};
  const reset=q('#scoreResetProfile',p);if(reset)reset.onclick=async()=>{applyClassProfile(level,true);await save(true);p.remove();render();window.nataijiFinalizeReports?.();patchGradeUi();patchReports()};
  q('.action',p).onclick=async()=>{
    const next=state.subjects.map((s,i)=>{const name=q(`[data-score-name="${i}"]`,p).value.trim()||'مادة',m=Number(q(`[data-score-max="${i}"]`,p).value);return [name,Number(s[1])||1,s[2]||'',Number.isFinite(m)&&m>0?m:20]});
    for(let j=0;j<next.length;j++){const over=state.marks.findIndex(r=>r?.[j]!==''&&r?.[j]!=null&&Number(r[j])>next[j][3]);if(over>=0){q('.message',p).textContent=(fr?'A saved mark exceeds the new maximum for ':'توجد درجة محفوظة أكبر من الحد الجديد لمادة ')+next[j][0];return}}
    state.subjects=next;const t=Number(q('#scoreTotalMax',p).value);cfg.totalMax=Number.isFinite(t)&&t>0?t:200;cfg.customized=true;cfg.profileVersion=PROFILE_VERSION;cfg.profileLevel=level||cfg.profileLevel;state.totalMax=cfg.totalMax;syncClassData();
    const msg=q('.message',p);msg.textContent=fr?'Enregistrement…':'جارٍ الحفظ...';await save(true);render();window.nataijiFinalizeReports?.();patchGradeUi();patchReports();msg.textContent=fr?'✓ Enregistré':'✓ تم الحفظ';setTimeout(()=>p.remove(),450);
  };refreshSum();
}

openSubjects=openScoringSubjects;
const originalRender=render;render=function(){ensureClassProfile();originalRender();patchGradeUi();patchReports()};
const originalRenderReports=renderReports;renderReports=function(){ensureClassProfile();originalRenderReports();patchReports()};
const originalFinalize=window.nataijiFinalizeReports;window.nataijiFinalizeReports=function(){originalFinalize?.();patchGradeUi();patchReports()};

const normalizedPrimaryClasses=new Set();
async function normalizePrimaryCanonical(){
 if(currentUser?.role!=='admin'||currentUser?.activeSharedGrant||!state?.activeClassId)return;
 const level=detectLevel(),key=String(state.activeClassId);if(![1,2].includes(level)||normalizedPrimaryClasses.has(key))return;
 normalizedPrimaryClasses.add(key);
 try{const r=await api('/api/subjects/normalize-primary',{method:'POST',body:JSON.stringify({classId:key})});if(!r?.changed)return;const fresh=await api('/api/state?classId='+encodeURIComponent(key)+'&term='+encodeURIComponent(state.term||''));currentUser=fresh.user||currentUser;const next=normalizeState(fresh.state);for(const k of Object.keys(state))delete state[k];Object.assign(state,next);localStorage.setItem('nataiji-data',JSON.stringify(state));render();window.nataijiRefreshSelectors?.()}catch(e){console.error('primary subject normalization failed',e)}
}
function install(){ensureClassProfile();patchGradeUi();patchReports();normalizePrimaryCanonical();const b=q('#subjectsBtn');if(b)b.onclick=e=>{e?.preventDefault?.();openScoringSubjects()};const picker=q('#subjectPicker');if(picker&&!picker.dataset.scoringBound){picker.dataset.scoringBound='1';picker.addEventListener('change',()=>setTimeout(()=>{renderMobileScores();patchGradeUi()},0))}}

const css=document.createElement('style');css.textContent=`
.score-total-box{padding:12px;border:1px solid #d5e2eb;border-radius:10px;background:#f7fbfd;margin-bottom:14px}.score-total-box label{margin:0!important}.score-total-box small{display:block;margin-top:7px;color:#607789;line-height:1.5}.score-subject-head,.scoring-subject-row{display:grid;grid-template-columns:minmax(0,1fr) 110px 40px;gap:8px;align-items:center}.score-subject-head{font-size:12px;color:#647988;margin:4px 0}.scoring-subject-row{margin:7px 0}.scoring-subject-row input{width:100%!important;margin:0!important}.scoring-subject-row button{height:44px;border:0;background:#fee;color:#a22;border-radius:8px}.score-max-summary{margin:12px 0 4px;font-weight:800}.score-warning{min-height:20px;color:#a55b00;font-size:12px;line-height:1.45}.score-total-box input{font-size:18px;font-weight:800}#scoreNewSubject,#scoreResetProfile{width:100%;min-height:44px;margin-top:8px;border:1px solid #d3e0e9;background:#fff;border-radius:8px;color:#31536d;font-weight:800}@media(max-width:560px){.score-subject-head,.scoring-subject-row{grid-template-columns:minmax(0,1fr) 88px 38px}}
`;
document.head.appendChild(css);

new MutationObserver(()=>{const b=q('#subjectsBtn');if(b)b.onclick=e=>{e?.preventDefault?.();openScoringSubjects()}}).observe(document.documentElement,{childList:true,subtree:true});
// Class navigation already performs the canonical render after its server state is loaded.
 // Do not render 40ms after the native change event: that used the previous class state
 // and could repaint the selector with the old class while navigation was still in flight.
document.addEventListener('change',e=>{if(e.target.matches?.('#classTop'))setTimeout(()=>{patchGradeUi();patchReports()},250)},true);
window.addEventListener('beforeprint',()=>{patchGradeUi();patchReports()});
window.addEventListener('DOMContentLoaded',()=>setTimeout(install,900));
setTimeout(install,0);setTimeout(install,1400);
window.nataijiClassGradeProfiles=CLASS_PROFILES;
})();
