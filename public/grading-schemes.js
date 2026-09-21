(()=>{
'use strict';

/* Official/default grade scales by primary class. Users may override them per class. */
const PROFILES={
  1:{total:200,subjects:[
    ['التربية الإسلامية','Éducation islamique',40],
    ['القراءة','Lecture',40],
    ['التعبير','Expression',20],
    ['الكتابة','Écriture',20],
    ['التربية المدنية','Éducation civique',15],
    ['الرياضيات','Mathématiques',40],
    ['التربية الفنية','Éducation artistique',15],
    ['الرياضة','Éducation physique',10]
  ]},
  2:{total:200,subjects:[
    ['التربية الإسلامية','Éducation islamique',30],
    ['اللغة العربية','Langue arabe',50],
    ['الحساب','Calcul',40],
    ['التربية المدنية','Éducation civique',15],
    ['التربية الفنية','Éducation artistique',15],
    ['Langage','Langage',20],
    ['Lecture','Lecture',10],
    ['Ecriture','Écriture',10],
    ['الرياضة','Éducation physique',10]
  ]},
  3:{total:200,subjects:[
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
  4:{total:200,subjects:[
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
  5:{total:200,subjects:[
    ['التربية الإسلامية','Éducation islamique',30],
    ['اللغة العربية','Langue arabe',50],
    ['الرياضيات','Mathématiques',40],
    ['التربية المدنية والفنية','Éducation civique et artistique',20],
    ['التاريخ والجغرافيا','Histoire et géographie',20],
    ['Français','Français',30],
    ['العلوم الطبيعية','Sciences naturelles',10]
  ]},
  6:{total:200,subjects:[
    ['التربية الإسلامية','Éducation islamique',30],
    ['اللغة العربية','Langue arabe',50],
    ['الرياضيات','Mathématiques',40],
    ['التربية المدنية والفنية','Éducation civique et artistique',20],
    ['التاريخ والجغرافيا','Histoire et géographie',20],
    ['Français','Français',30],
    ['العلوم الطبيعية','Sciences naturelles',10]
  ]}
};
const VERSION=1;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const clone=x=>structuredClone(x);
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fr=()=>localStorage.getItem('nataiji-lang')==='fr';
function S(){try{return state}catch{return null}}
function U(){try{return currentUser}catch{return null}}
function activeClass(){const s=S();return s?.classes?.find(c=>c.id===s.activeClassId)||null}
function classKey(){const s=S();return String(s?.activeClassId||'class-1')}
function levelOf(){const s=S();if(!s)return 0;const c=activeClass();const raw=[c?.code,c?.name,s.classCode,s.className].filter(Boolean).join(' ');
  const af=raw.match(/(?:^|\s)([1-6])\s*AF\b/i);if(af)return Number(af[1]);
  const ar=[['الأولى',1],['الاولى',1],['الأول',1],['الاول',1],['الثانية',2],['الثاني',2],['الثالثة',3],['الثالث',3],['الرابعة',4],['الرابع',4],['الخامسة',5],['الخامس',5],['السادسة',6],['السادس',6]];for(const [k,n] of ar)if(raw.includes(k))return n;
  const n=raw.match(/(?:السنة|القسم|classe|année)\s*([1-6])/i);return n?Number(n[1]):0;
}
function config(){const s=S();if(!s)return null;s.gradingConfigs=s.gradingConfigs&&typeof s.gradingConfigs==='object'?s.gradingConfigs:{};const k=classKey();return s.gradingConfigs[k]||(s.gradingConfigs[k]={totalMax:Number(s.totalMax)||200,version:0,level:0,customized:false})}
function maxOf(j){const s=S();const v=Number(s?.subjects?.[j]?.[3]);return Number.isFinite(v)&&v>0?v:20}
function totalMax(){const c=config();const v=Number(c?.totalMax);return Number.isFinite(v)&&v>0?v:200}
function normalizedName(v){return String(v||'').trim().toLowerCase().replace(/[ًٌٍَُِّْـ]/g,'').replace(/\s+/g,' ')}
function remapRows(rows,oldSubjects,newSubjects){const old=(oldSubjects||[]).map(x=>normalizedName(x?.[0]));const sameLength=old.length===newSubjects.length;return (rows||[]).map(row=>newSubjects.map((sub,j)=>{let i=old.indexOf(normalizedName(sub[0]));if(i<0&&sameLength)i=j;return i>=0?(row?.[i]??''):''}))}
function persistClassData(oldSubjects){const s=S();if(!s)return;const d=s.classData?.[s.activeClassId];if(!d)return;d.subjects=clone(s.subjects||[]);d.marksByTerm=d.marksByTerm&&typeof d.marksByTerm==='object'?d.marksByTerm:{};d.marksByTerm[s.term]=clone(s.marks||[])}
let saveTimer;
function queueSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{save(true)}catch{}},250)}
function applyProfile(level,force=false){const s=S(),p=PROFILES[level],c=config();if(!s||!p||!c)return false;if(!force&&c.customized)return false;if(!force&&c.version===VERSION&&c.level===level)return false;
  const oldSubjects=clone(s.subjects||[]),oldMarks=clone(s.marks||[]),newSubjects=p.subjects.map(([ar,f,max])=>[ar,1,f,max]);
  s.subjects=newSubjects;s.marks=remapRows(oldMarks,oldSubjects,newSubjects);s.totalMax=p.total;c.totalMax=p.total;c.version=VERSION;c.level=level;c.customized=false;
  if(s.marksByTerm&&typeof s.marksByTerm==='object'){Object.keys(s.marksByTerm).forEach(t=>{s.marksByTerm[t]=remapRows(s.marksByTerm[t],oldSubjects,newSubjects)});s.marksByTerm[s.term]=clone(s.marks)}
  persistClassData(oldSubjects);queueSave();return true
}
function ensureProfile(){const s=S();if(!s)return;const c=config(),level=levelOf();if(c){s.totalMax=Number(c.totalMax)||200}if(level&&(!c.customized)&&(c.version!==VERSION||c.level!==level))applyProfile(level,false);for(let j=0;j<(s.subjects||[]).length;j++){if(!Number.isFinite(Number(s.subjects[j][3]))||Number(s.subjects[j][3])<=0)s.subjects[j][3]=20}}

/* Overall average is always derived from the configured grand total: sum / total × 20. */
try{calc=function(i){const s=S(),row=s?.marks?.[i]||[];const values=row.filter(v=>v!==''&&v!=null).map(Number).filter(Number.isFinite);const sum=values.reduce((a,b)=>a+b,0),den=totalMax();return{sum,avg:den?sum*20/den:0,totalMax:den}}}catch{}
try{ranks=function(){const s=S();const av=(s?.pupils||[]).map((_,i)=>calc(i).avg);return av.map(v=>1+av.filter(x=>x>v).length)}}catch{}
function normalizeMark(v,j){if(v==='')return '';const n=Number(v);if(!Number.isFinite(n))return '';return Math.max(0,Math.min(maxOf(j),n))}
try{cleanMark=function(v,j=0){return normalizeMark(v,j)}}catch{}
try{bindMarks=function(){qa('.mark').forEach(x=>{const j=Number(x.dataset.j)||0;x.max=String(maxOf(j));x.min='0';x.oninput=e=>{const jj=Number(e.target.dataset.j)||0,v=normalizeMark(e.target.value,jj);e.target.value=v;S().marks[Number(e.target.dataset.i)][jj]=v;try{markDirty()}catch{}try{renderDashboard()}catch{};schedulePatch()}})}}catch{}
try{renderMobileScores=function(){const s=S(),j=Number(q('#subjectPicker')?.value)||0,max=maxOf(j),host=q('#mobileScores');if(!s||!host)return;host.innerHTML=`<div class="subject-title"><b>${h(s.subjects[j]?.[0]||'')}</b><span>${fr()?'Note sur':'الدرجة من'} ${max}</span></div>`+(s.pupils||[]).map((p,i)=>`<label class="score-row"><span><b>${i+1}. ${h(p[1])}</b><small>${h(p[0])}</small></span><input class="mobile-mark" inputmode="decimal" min="0" max="${max}" data-i="${i}" data-j="${j}" value="${s.marks?.[i]?.[j]??''}" placeholder="—"><em>/${max}</em></label>`).join('');qa('.mobile-mark',host).forEach(x=>x.oninput=e=>{const jj=Number(e.target.dataset.j)||0,v=normalizeMark(e.target.value,jj);e.target.value=v;s.marks[Number(e.target.dataset.i)][jj]=v;try{markDirty()}catch{};try{renderDashboard()}catch{};schedulePatch()})}}catch{}

function patchEntryUi(){const s=S();if(!s)return;qa('#scoreHead th').slice(2).forEach((th,j)=>{const sub=s.subjects?.[j];if(!sub)return;th.innerHTML=`${h(sub[0])}<br><small>/${maxOf(j)}</small>`});qa('.mark').forEach(x=>{const j=Number(x.dataset.j)||0;x.max=String(maxOf(j));x.title=(fr()?'Maximum: ':'الدرجة القصوى: ')+maxOf(j)});const b=q('#subjectsBtn');if(b){const strong=q('b',b),span=q('span',b);if(strong)strong.textContent=fr()?'Matières et barèmes':'المواد والدرجات القصوى';if(span)span.textContent=fr()?'Modifier les matières, leurs barèmes et le total général':'تعديل المواد والدرجة القصوى لكل مادة والمجموع العام'}}
function fmt(n){return Number.isInteger(Number(n))?String(Number(n)):Number(n).toFixed(1)}
function patchStudent(root=q('#officialSheet')){const s=S();if(!s||!root)return;const body=q('.sheet tbody',root);if(!body)return;const rows=[...body.rows],n=s.subjects?.length||0;if(rows.length<n+3)return;const hc=root.querySelector('.sheet thead tr')?.cells;if(hc?.[1])hc[1].textContent=fr()?'Note / Barème':'الدرجة / من';for(let j=0;j<n;j++){const cell=rows[j]?.cells?.[1];if(!cell)continue;const mark=s.marks?.[Math.max(0,q('#student')?.selectedIndex??0)]?.[j];cell.innerHTML=`<span class="grade-earned">${mark===''||mark==null?'—':h(mark)}</span><small class="grade-max"> / ${maxOf(j)}</small>`}const i=Math.max(0,q('#student')?.selectedIndex??0),c=calc(i);if(rows[n]?.cells?.[1])rows[n].cells[1].innerHTML=`<b>${fmt(c.sum)} / ${fmt(totalMax())}</b>`;if(rows[n+1]?.cells?.[1])rows[n+1].cells[1].innerHTML=`<b>${c.avg.toFixed(1)} / 20</b>`}
function patchClass(){const s=S(),table=q('#paperResults');if(!s||!table?.tHead)return;const hs=[...table.tHead.rows[0].cells];(s.subjects||[]).forEach((sub,j)=>{const th=hs[j+2];if(th)th.innerHTML=`${h(th.textContent.split('/')[0].trim())}<br><small>/${maxOf(j)}</small>`})}
function patchPrintCopies(){const s=S();if(!s)return;qa('#printBatch .batch-sheet').forEach((root,idx)=>{const body=q('.sheet tbody',root);if(!body)return;const rows=[...body.rows],n=s.subjects.length;if(rows.length<n+3)return;const pageIndex=[...root.parentElement.children].indexOf(root),pages=[...q('#printBatch')?.children||[]],before=pages.slice(0,pages.indexOf(root.parentElement)).reduce((a,p)=>a+p.children.length,0),studentIndex=before+pageIndex,c=calc(studentIndex);for(let j=0;j<n;j++){const cell=rows[j]?.cells?.[1],mark=s.marks?.[studentIndex]?.[j];if(cell)cell.innerHTML=`<span class="grade-earned">${mark===''||mark==null?'—':h(mark)}</span><small class="grade-max"> / ${maxOf(j)}</small>`}if(rows[n]?.cells?.[1])rows[n].cells[1].innerHTML=`<b>${fmt(c.sum)} / ${fmt(totalMax())}</b>`;if(rows[n+1]?.cells?.[1])rows[n+1].cells[1].innerHTML=`<b>${c.avg.toFixed(1)} / 20</b>`})}
let patchTimer;
function patchAll(){ensureProfile();patchEntryUi();patchStudent();patchClass();patchPrintCopies()}
function schedulePatch(ms=100){clearTimeout(patchTimer);patchTimer=setTimeout(patchAll,ms)}

/* Wrap the existing renderer so every class receives its defaults before UI generation. */
try{const baseRender=render;render=function(){ensureProfile();baseRender();patchEntryUi();schedulePatch(120)}}catch{}
try{const baseReports=renderReports;renderReports=function(){ensureProfile();baseReports();schedulePatch(120)}}catch{}

function openScaleSettings(){const s=S();if(!s||U()?.role!=='admin')return;ensureProfile();const level=levelOf(),c=config();const title=fr()?'Matières et barèmes':'المواد والدرجات القصوى';const rows=(s.subjects||[]).map((sub,i)=>`<div class="grading-row"><input data-g-name="${i}" value="${h(sub[0])}"><input data-g-max="${i}" type="number" min="0.1" step="0.1" value="${maxOf(i)}"><button type="button" data-g-del="${i}">×</button></div>`).join('');
  const p=modal(title,`<p class="grading-help">${fr()?'Le total général est 200 par défaut. La moyenne sur 20 = total obtenu ÷ total général × 20.':'المجموع العام الافتراضي هو 200. المعدل من 20 = المجموع المحصل ÷ المجموع العام × 20.'}</p><label>${fr()?'Total général du bulletin':'المجموع العام للكشف'}<input id="grading-total" type="number" min="1" step="1" value="${totalMax()}"></label><div class="grading-head"><b>${fr()?'Matière':'المادة'}</b><b>${fr()?'Barème':'من'}</b><span></span></div><div id="grading-rows">${rows}</div><button type="button" id="grading-add">${fr()?'+ Ajouter une matière':'+ إضافة مادة'}</button>${level?`<button type="button" id="grading-reset">${fr()?'Restaurer le barème automatique de cette classe':'استرجاع الدرجات التلقائية لهذه السنة'}</button>`:''}<button class="primary action">${fr()?'Enregistrer':'حفظ'}</button><p class="message"></p>`);
  q('#grading-add',p).onclick=()=>{s.subjects.push([fr()?'Nouvelle matière':'مادة جديدة',1,'',20]);s.marks=(s.marks||[]).map(r=>[...r,'']);c.customized=true;p.remove();openScaleSettings()};
  qa('[data-g-del]',p).forEach(b=>b.onclick=()=>{if(s.subjects.length<=1)return;const i=Number(b.dataset.gDel);s.subjects.splice(i,1);s.marks=(s.marks||[]).map(r=>r.filter((_,j)=>j!==i));c.customized=true;p.remove();openScaleSettings()});
  const reset=q('#grading-reset',p);if(reset)reset.onclick=async()=>{applyProfile(level,true);await save(true);p.remove();render()};
  q('.action',p).onclick=async()=>{const msg=q('.message',p),newTotal=Number(q('#grading-total',p).value);if(!Number.isFinite(newTotal)||newTotal<=0){msg.textContent=fr()?'Enter a valid total.':'أدخل مجموعًا صحيحًا أكبر من صفر.';return}const next=(s.subjects||[]).map((sub,i)=>{const name=q(`[data-g-name="${i}"]`,p)?.value.trim()||sub[0]||'مادة',mx=Number(q(`[data-g-max="${i}"]`,p)?.value);return [name,Number(sub[1])||1,sub[2]||'',mx]});if(next.some(x=>!Number.isFinite(x[3])||x[3]<=0)){msg.textContent=fr()?'Every subject must have a valid maximum.':'يجب تحديد درجة قصوى صحيحة لكل مادة.';return}for(let j=0;j<next.length;j++){const over=(s.marks||[]).findIndex(r=>r?.[j]!==''&&r?.[j]!=null&&Number(r[j])>next[j][3]);if(over>=0){msg.textContent=(fr()?'A saved mark exceeds the new maximum for ':'توجد درجة محفوظة أكبر من الحد الجديد لمادة ')+next[j][0];return}}s.subjects=next;s.totalMax=newTotal;c.totalMax=newTotal;c.customized=true;c.version=VERSION;c.level=level||c.level;persistClassData();msg.textContent=fr()?'Saving…':'جارٍ الحفظ...';await save(true);render();msg.textContent=fr()?'✓ Saved':'✓ تم الحفظ';setTimeout(()=>p.remove(),450)}
}
function bindSubjectsButton(){const old=q('#subjectsBtn');if(!old||old.dataset.gradingScale==='1')return;const b=old.cloneNode(true);b.dataset.gradingScale='1';old.replaceWith(b);b.onclick=e=>{e.preventDefault();openScaleSettings()};patchEntryUi()}
function bindPicker(){const picker=q('#subjectPicker');if(picker&&picker.dataset.gradingScale!=='1'){picker.dataset.gradingScale='1';picker.addEventListener('change',()=>setTimeout(()=>{try{renderMobileScores()}catch{};patchEntryUi()},0))}}

const style=document.createElement('style');style.id='grading-schemes-style';style.textContent=`.grading-help{background:#eef6fb;border-radius:9px;padding:10px;color:#416079;line-height:1.6}.grading-head,.grading-row{display:grid;grid-template-columns:minmax(0,1fr) 90px 40px;gap:8px;align-items:center;margin:7px 0}.grading-head{font-size:12px;color:#718493;padding:0 3px}.grading-row input{width:100%!important;margin:0!important}.grading-row button,#grading-add,#grading-reset{height:44px;border:1px solid #d3e0e9;background:#fff;border-radius:8px;color:#31536d;font-weight:700}#grading-add,#grading-reset{width:100%;margin-top:8px}.grading-row button{color:#a22;background:#fff5f5}.grade-max{font-size:.82em;font-weight:700;color:inherit;white-space:nowrap}@media print{.grade-max{font-size:.88em!important}}`;
document.head.appendChild(style);

window.nataijiGradingProfiles=PROFILES;
window.nataijiGradingTotal=totalMax;
window.addEventListener('beforeprint',()=>{patchAll();setTimeout(patchPrintCopies,0)});
window.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{ensureProfile();bindSubjectsButton();bindPicker();try{render()}catch{};schedulePatch(180)},450));
document.addEventListener('click',e=>{if(e.target.closest?.('#subjectsBtn,#showResult,#printResult,.report-print,[data-report],#langSwitch'))schedulePatch(140)},true);
document.addEventListener('change',e=>{if(e.target.matches?.('#classTop,#term,#student,#subjectPicker')){setTimeout(()=>{ensureProfile();bindSubjectsButton();bindPicker();schedulePatch(140)},30)}},true);
new MutationObserver(()=>schedulePatch(180)).observe(document.documentElement,{childList:true,subtree:true});
})();
