const DEFAULT={teacher:'',school:'',schoolFr:'',region:'',regionFr:'',inspection:'',inspectionFr:'',year:'',term:'',className:'',classNameFr:'',classCode:'',subjects:[],pupils:[],marks:[],terms:[],marksByTerm:{},classes:[],activeClassId:'',classData:{},onboardingComplete:null};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=structuredClone(DEFAULT),currentUser=null,storageMode='memory',syncBusy=false;

async function api(url,options={}){const method=String(options.method||'GET').toUpperCase();const r=await fetch(url,{credentials:'same-origin',cache:method==='GET'?'no-store':'no-cache',headers:{'Content-Type':'application/json','Cache-Control':'no-cache',...(options.headers||{})},...options});let data={};try{data=await r.json()}catch{}if(!r.ok){const e=new Error(data.error||'request_failed');e.code=data.error||'request_failed';e.status=r.status;throw e}return data}
function localState(){try{return JSON.parse(localStorage.getItem('nataiji-data'))}catch{return null}}
function localStateDataCount(s){
 if(!s||typeof s!=='object')return 0;let n=0;
 if(Array.isArray(s.classes))n+=s.classes.length*10;
 if(Array.isArray(s.pupils))n+=s.pupils.length*5;
 if(Array.isArray(s.subjects))n+=s.subjects.length*3;
 const cd=s.classData&&typeof s.classData==='object'?s.classData:{};
 for(const d of Object.values(cd)){n+=(Array.isArray(d?.pupils)?d.pupils.length:0)*5;n+=(Array.isArray(d?.subjects)?d.subjects.length:0)*3;for(const matrix of Object.values(d?.marksByTerm||{}))for(const row of Array.isArray(matrix)?matrix:[])for(const v of Array.isArray(row)?row:[])if(v!==''&&v!=null)n++}
 return n
}
function recoveryStorageKey(id){return'nataiji-recovery-snapshot-v1:'+(id||'unknown')}
function normalizeState(serverState){if(serverState&&typeof serverState==='object'){const incoming=structuredClone(serverState),merged={...structuredClone(DEFAULT),...incoming};merged.subjects=Array.isArray(incoming.subjects)?incoming.subjects:[];merged.pupils=Array.isArray(incoming.pupils)?incoming.pupils:[];merged.marks=Array.isArray(incoming.marks)?incoming.marks:[];return merged}const local=localState();return local&&typeof local==='object'?{...structuredClone(DEFAULT),...local}:structuredClone(DEFAULT)}
let saveTail=Promise.resolve(),saveSerial=0;async function save(silent=false){if(!currentUser)throw new Error('not_authenticated');const serial=++saveSerial,snapshot=structuredClone(state);const run=async()=>{syncBusy=true;try{const r=await api('/api/state',{method:'PUT',body:JSON.stringify({state:snapshot})});const check=await api('/api/state');if(!r?.revision||!check?.state||check.state.saveRevision!==r.revision)throw Object.assign(new Error('save_not_verified'),{code:'save_not_verified'});if(serial===saveSerial){const fresh=normalizeState(check.state);for(const k of Object.keys(state))delete state[k];Object.assign(state,fresh);localStorage.setItem('nataiji-data',JSON.stringify(state));if($('#saveState')){$('#saveState').textContent='✓ محفوظ فعليًا على الخادم';$('#saveState').classList.remove('dirty')}}return true}catch(e){if($('#saveState')){$('#saveState').textContent='فشل الحفظ الحقيقي — أعد المحاولة';$('#saveState').classList.add('dirty')}if(e.status===401)await showAuth();throw e}finally{syncBusy=false;if(!silent)renderDashboard()}};const job=saveTail.then(run,run);saveTail=job.catch(()=>{});return job}

function calc(i){const row=state.marks[i]||[],w=state.subjects.map(x=>Number(x[1])||1),weighted=row.reduce((a,n,j)=>a+(n===''||n==null?0:Number(n)||0)*w[j],0),used=w.reduce((a,b,j)=>a+(row[j]===''||row[j]==null?0:b),0);const valid=row.filter(n=>n!==''&&n!=null).map(Number).filter(Number.isFinite);return{sum:valid.reduce((a,b)=>a+b,0),avg:used?weighted/used:0}}
function ranks(){const av=state.pupils.map((_,i)=>calc(i).avg);return av.map(v=>1+av.filter(x=>x>v).length)}
function setView(name){$$('.view').forEach(v=>v.classList.toggle('hidden',v.dataset.page!==name));$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));scrollTo({top:0,behavior:'smooth'});if(name==='reports')renderReports()}
function applyPermissions(){const admin=currentUser?.role==='admin',canPupils=admin||currentUser?.permissions?.includes('pupils');['#subjectsBtn','#inviteBtn','#settingsBtn'].forEach(s=>{const el=$(s);if(el)el.style.display=admin?'':'none'});if($('#addStudent'))$('#addStudent').style.display=canPupils?'':'none';if($('#importBtn'))$('#importBtn').style.display=canPupils?'':'none';const small=$('#teacherName small');if(small)small.textContent=admin?'مدير / صلاحيات كاملة':'معلم / إدخال النتائج'}
function selectorClasses(){const rows=(Array.isArray(state.classes)?state.classes:[]).filter(x=>x&&x.id);if(rows.length)return rows;const id=String(state.activeClassId||currentUser?.preferredClassId||currentUser?.classIds?.[0]||'');if(id&&(String(state.className||state.classCode||'').trim()||(state.pupils||[]).length||(state.subjects||[]).length))return[{id,name:String(state.className||state.classCode||'القسم الحالي'),nameFr:String(state.classNameFr||''),code:String(state.classCode||'')}];return[]}
function selectorTerms(){let rows=[...new Set((Array.isArray(state.terms)?state.terms:[]).map(x=>String(x||'').trim()).filter(Boolean))];if(!rows.length&&state.marksByTerm&&typeof state.marksByTerm==='object')rows=[...new Set(Object.keys(state.marksByTerm).map(x=>String(x||'').trim()).filter(Boolean))];const current=String(state.term||'').trim();if(current&&!rows.includes(current))rows.unshift(current);return rows}
function sameSelectValues(el,values){const current=[...el.options].map(o=>String(o.value));return current.length===values.length&&current.every((v,i)=>v===String(values[i]))}
function renderCoreSelectors(){
 const y=$('#yearTop');
 if(y){y.dir='ltr';if(y.options.length!==1||String(y.value)!==String(state.year)){y.innerHTML=`<option value="${esc(state.year)}">${esc(state.year)}</option>`}}
 const tt=$('#term'),terms=selectorTerms();
 if(tt){
  const pendingTerm=String(window.__nataijiPendingTerm||'');const active=terms.includes(pendingTerm)?pendingTerm:(terms.includes(String(state.term||''))?String(state.term):terms[0]||'');
  const values=terms.length?terms:[''];
  if(!sameSelectValues(tt,values))tt.innerHTML=terms.length?terms.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join(''):'<option value="">أضف فصلًا دراسيًا</option>';
  if(active&&tt.value!==active)tt.value=active;
  if(active&&!state.term)state.term=active;
  tt.disabled=!terms.length
 }
 const ct=$('#classTop');
 if(ct&&!window.nataijiWorkspaceSelectorReady){
  const classes=selectorClasses(),pendingClass=String(window.__nataijiPendingClassId||''),active=classes.some(x=>String(x.id)===pendingClass)?pendingClass:(classes.some(x=>x.id===state.activeClassId)?state.activeClassId:(classes[0]?.id||'')),values=classes.length?classes.map(x=>x.id):[''];
  if(!sameSelectValues(ct,values))ct.innerHTML=classes.length?classes.map(x=>`<option value="${esc(x.id)}">${esc(x.name||x.code||'القسم الحالي')}</option>`).join(''):'<option value="">أضف قسمًا من الإعدادات</option>';
  if(active&&ct.value!==active)ct.value=active;
  ct.disabled=!classes.length
 }
}
window.nataijiRenderCoreSelectors=renderCoreSelectors;
function render(){state.marks=state.pupils.map((_,i)=>state.subjects.map((_,j)=>state.marks?.[i]?.[j]??''));const displayName=currentUser?.name||state.teacher;$('#teacherName').childNodes[0].nodeValue=displayName;$('#welcomeName').textContent=displayName;renderCoreSelectors();$('#subjectPicker').innerHTML=state.subjects.map((s,i)=>`<option value="${i}">${esc(s[0])}</option>`).join('');$('#scoreHead').innerHTML=`<tr><th>#</th><th>اسم التلميذ</th>${state.subjects.map(s=>`<th>${esc(s[0])}<br><small>/20</small></th>`).join('')}</tr>`;$('#scores').innerHTML=state.pupils.map((p,i)=>`<tr><td>${i+1}</td><td class="sticky-name">${esc(p[1])}</td>${state.subjects.map((_,j)=>`<td><input class="mark" inputmode="decimal" data-i="${i}" data-j="${j}" value="${state.marks[i][j]}"></td>`).join('')}</tr>`).join('');$('#list').innerHTML=state.pupils.map((p,i)=>`<tr><td>${i+1}</td><td>${esc(p[0])}</td><td>${esc(p[1])}</td><td>${esc(p[2])}</td><td>${esc(p[3])}</td></tr>`).join('');$('#student').innerHTML=state.pupils.map((p,i)=>`<option value="${i}">${esc(p[1])}</option>`).join('');bindMarks();renderMobileScores();renderDashboard();renderReports();applyPermissions()}
function markDirty(){if($('#saveState')){$('#saveState').textContent='توجد تغييرات غير محفوظة';$('#saveState').classList.add('dirty')}}
function cleanMark(v){if(v==='')return '';v=Number(v);if(!Number.isFinite(v))return '';return Math.max(0,Math.min(20,v))}
function bindMarks(){$$('.mark').forEach(x=>x.oninput=e=>{const v=cleanMark(e.target.value);e.target.value=v;state.marks[+e.target.dataset.i][+e.target.dataset.j]=v;markDirty();renderDashboard()})}
function renderMobileScores(){const j=Number($('#subjectPicker').value)||0;$('#mobileScores').innerHTML=`<div class="subject-title"><b>${esc(state.subjects[j]?.[0])}</b><span>الدرجة من 20</span></div>`+state.pupils.map((p,i)=>`<label class="score-row"><span><b>${i+1}. ${esc(p[1])}</b><small>${esc(p[0])}</small></span><input class="mobile-mark" inputmode="decimal" data-i="${i}" data-j="${j}" value="${state.marks[i]?.[j]??''}" placeholder="—"><em>/20</em></label>`).join('');$$('.mobile-mark').forEach(x=>x.oninput=e=>{const v=cleanMark(e.target.value);e.target.value=v;state.marks[+e.target.dataset.i][+e.target.dataset.j]=v;markDirty();renderDashboard()})}
function renderDashboard(){
 const total=state.pupils.length*state.subjects.length,
       filled=state.marks.flat().filter(x=>x!==''&&x!=null).length,
       complete=total>0&&filled===total,
       avgEl=$('#statAverage'),needsEl=$('#statNeeds'),
       isFr=localStorage.getItem('nataiji-lang')==='fr',
       hasValue=v=>v!==''&&v!=null,
       isAbsent=v=>/^(غائب|absent|a)$/i.test(String(v??'').trim()),
       maxFor=(s)=>{const n=Number(s?.[3]);return Number.isFinite(n)&&n>0?n:20},
       partialAvgs=state.pupils.map((_,i)=>{
         const row=state.marks?.[i]||[];let sum=0,max=0,count=0;
         state.subjects.forEach((sub,j)=>{
           const v=row[j];if(!hasValue(v))return;
           const m=maxFor(sub);max+=m;count++;
           const n=isAbsent(v)?0:Number(v);
           sum+=Number.isFinite(n)?Math.max(0,Math.min(m,n)):0
         });
         return count&&max?sum*20/max:null
       }).filter(v=>v!=null&&Number.isFinite(v)),
       finalAvgs=complete?state.pupils.map((_,i)=>Number(calc(i)?.avg)).filter(Number.isFinite):partialAvgs,
       provisional=!complete&&filled>0&&partialAvgs.length>0;
 $('#statStudents').textContent=state.pupils.length;
 $('#statComplete').textContent=(total?Math.round(filled/total*100):0)+'%';
 avgEl.textContent=finalAvgs.length?(finalAvgs.reduce((a,b)=>a+b,0)/finalAvgs.length).toFixed(1)+'/20':'—';
 needsEl.textContent=finalAvgs.length?finalAvgs.filter(x=>x<10).length:'—';
 [avgEl,needsEl].forEach(el=>{
   if(!el)return;
   const article=el.closest('article');if(!article)return;
   let note=article.querySelector('.stat-pending');
   if(provisional){
     if(!note){note=document.createElement('small');note.className='stat-pending';article.appendChild(note)}
     note.textContent=isFr?'Provisoire selon les notes saisies':'مؤقت حسب الدرجات المدخلة';
   }else if(!filled&&total>0){
     if(!note){note=document.createElement('small');note.className='stat-pending';article.appendChild(note)}
     note.textContent=isFr?'S’affiche après la saisie des premières notes':'يظهر بعد إدخال أولى الدرجات';
   }else if(note)note.remove();
 });
 $('#subjectProgress').innerHTML=state.subjects.map((s,j)=>{const n=state.marks.filter(r=>r[j]!==''&&r[j]!=null).length,p=state.pupils.length?Math.round(n/state.pupils.length*100):0,raw=`${s?.[0]||''} ${s?.[2]||''}`,iconKey=window.nataijiSubjectIconKey?.(raw)||'generic',iconMarkup=window.nataijiSubjectIconMarkup?.(iconKey)||'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4.5h9a3 3 0 0 1 3 3v12H9a3 3 0 0 1-3-3v-12Z"/><path d="M9 8h6M9 11h6"/></svg>',label=isFr?(window.nataijiSubjectFrLabel?.(s,s?.[0])||s?.[2]||s?.[0]):s?.[0];return `<div><span><span class="subject-premium-icon" data-icon="${esc(iconKey)}" aria-hidden="true">${iconMarkup}</span><b class="subject-progress-name" dir="${isFr?'ltr':'rtl'}">${esc(label)}</b><small>${n}/${state.pupils.length}</small></span><i><b style="width:${p}%"></b></i><strong>${p}%</strong></div>`}).join('')
}
function renderReports(){const pupils=Array.isArray(state.pupils)?state.pupils:[],subjects=Array.isArray(state.subjects)?state.subjects:[],marks=Array.isArray(state.marks)?state.marks:[];if(!pupils.length){const sheet=$('#sheet');if(sheet)sheet.innerHTML='';const paper=$('#paperResults');if(paper)paper.innerHTML='';const list=$('#paperList');if(list)list.innerHTML='';return false}const selected=Math.max(0,Math.min(pupils.length-1,Number($('#student')?.value)||0)),p=pupils[selected],c=calc(selected),rank=ranks()[selected],row=Array.isArray(marks[selected])?marks[selected]:subjects.map(()=>'');$('#sheet').innerHTML=subjects.map((s,j)=>`<tr><td>${esc(s?.[0]||'')}</td><td>${row[j]??''}</td><td></td></tr>`).join('')+`<tr><td>المجموع</td><td>${c.sum}</td><td></td></tr><tr><td>المعدل</td><td>${c.avg.toFixed(1)}</td><td></td></tr><tr><td>الرتبة</td><td>${rank??'—'}</td><td></td></tr>`;$('#sheetNns').textContent=p?.[0]||'';$('#sheetName').textContent=p?.[1]||'';$('#sheetSchool').textContent=state.school||'—';$('#sheetRegion').textContent=state.region||'—';$('#sheetInspection').textContent=state.inspection||'—';$('#sheetYear').textContent=state.year||'';$('#sheetTerm').textContent=state.term||'';$('#paperList').innerHTML=pupils.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x?.[0]||'')}</td><td>${esc(x?.[1]||'')}</td><td>${esc(x?.[2]||'')}</td><td>${esc(x?.[3]||'')}</td></tr>`).join('');$('#classReportTitle').textContent=`امتحان ${state.term||''} ${state.className||''}`;const rs=ranks();$('#paperResults').innerHTML=`<thead><tr><th>#</th><th>التلميذ</th>${subjects.map(s=>`<th>${esc(s?.[0]||'')}</th>`).join('')}<th>المعدل</th><th>الرتبة</th></tr></thead><tbody>${pupils.map((x,i)=>{const r=Array.isArray(marks[i])?marks[i]:subjects.map(()=>'');return `<tr><td>${i+1}</td><td>${esc(x?.[1]||'')}</td>${subjects.map((_,j)=>`<td>${r[j]??''}</td>`).join('')}<td>${calc(i).avg.toFixed(1)}</td><td>${rs[i]??'—'}</td></tr>`}).join('')}</tbody>`;return true}
function modal(title,body){const p=document.createElement('div');p.className='modal';p.innerHTML=`<div class="modal-card"><div class="modal-head"><h2>${title}</h2><button class="x">×</button></div>${body}</div>`;document.body.appendChild(p);p.querySelector('.x').onclick=()=>p.remove();p.onclick=e=>{if(e.target===p)p.remove()};return p}
async function addStudent(){if(currentUser?.role!=='admin'&&!currentUser?.permissions?.includes('pupils'))return;const p=modal('إضافة تلميذ','<label>NNS<input id="an"></label><label>اسم التلميذ<input id="aa"></label><label>الجنس<select id="ag"><option>ذكر</option><option>أنثى</option></select></label><label>تاريخ الميلاد<input id="ad" type="date"></label><button class="primary action">إضافة التلميذ</button><p class="message"></p>');p.querySelector('.action').onclick=async()=>{const n=$('#an').value.trim(),a=$('#aa').value.trim();if(!n||!a)return p.querySelector('.message').textContent='أدخل الرقم المدرسي والاسم';if(state.pupils.some(x=>x[0]===n))return p.querySelector('.message').textContent='الرقم المدرسي موجود مسبقًا';state.pupils.push([n,a,$('#ag').value,$('#ad').value]);state.marks.push(state.subjects.map(()=>''));await save(true);render();p.remove()}}
function openSettings(){if(currentUser?.role!=='admin')return;const p=modal('إعدادات المدرسة',`<label>اسم المعلم في الكشف<input id="st" value="${esc(state.teacher)}"></label><label>اسم المدرسة<input id="ss" value="${esc(state.school)}"></label><label>الإدارة الجهوية<input id="sr" value="${esc(state.region)}"></label><label>المفتشية<input id="si" value="${esc(state.inspection)}"></label><label>السنة الدراسية<input id="sy" value="${esc(state.year)}"></label><label>اسم القسم<input id="sc" value="${esc(state.className)}"></label><button class="primary action">حفظ</button><p class="message"></p>`);p.querySelector('.action').onclick=async()=>{state.teacher=$('#st').value.trim()||state.teacher;state.school=$('#ss').value.trim();state.region=$('#sr').value.trim();state.inspection=$('#si').value.trim();state.year=$('#sy').value.trim()||state.year;state.className=$('#sc').value.trim()||state.className;await save(true);render();p.querySelector('.message').textContent='تم الحفظ على الخادم'}}
function openSubjects(){if(currentUser?.role!=='admin')return;const p=modal('المواد والمعاملات',`<div id="subjectEdit">${state.subjects.map((s,i)=>`<div class="subject-edit"><input data-name="${i}" value="${esc(s[0])}"><input type="number" min="0.1" step="0.1" data-weight="${i}" value="${s[1]}"><button data-del="${i}">×</button></div>`).join('')}</div><button id="newSubject">+ مادة جديدة</button><button class="primary action">حفظ المواد</button><p class="message"></p>`);const durable=async subjects=>{const classId=state.activeClassId,r=await api('/api/subjects',{method:'PUT',body:JSON.stringify({classId,subjects})});if(!r?.ok)throw new Error('subjects_save_failed');const verify=await api('/api/subjects?classId='+encodeURIComponent(classId));if(!verify?.ok)throw new Error('subjects_verify_failed');state.subjects=structuredClone(verify.subjects||[]);if(state.classData?.[classId])state.classData[classId].subjects=structuredClone(state.subjects);localStorage.setItem('nataiji-data',JSON.stringify(state));return true};p.querySelector('#newSubject').onclick=async()=>{const next=structuredClone(state.subjects);next.push(['مادة جديدة',1,'']);try{await durable(next);p.remove();render();openSubjects()}catch{p.querySelector('.message').textContent='تعذر تثبيت المادة الجديدة'}};p.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(state.subjects.length<=1)return;const next=structuredClone(state.subjects),i=+b.dataset.del;next.splice(i,1);try{await durable(next);state.marks.forEach(r=>r.splice(i,1));p.remove();render();openSubjects()}catch{p.querySelector('.message').textContent='تعذر تثبيت حذف المادة'}});p.querySelector('.action').onclick=async()=>{const next=structuredClone(state.subjects);p.querySelectorAll('[data-name]').forEach(x=>next[+x.dataset.name][0]=x.value.trim()||'مادة');p.querySelectorAll('[data-weight]').forEach(x=>next[+x.dataset.weight][1]=Math.max(.1,Number(x.value)||1));try{await durable(next);render();p.querySelector('.message').textContent='✓ تم حفظ المواد وتثبيتها'}catch{p.querySelector('.message').textContent='تعذر تثبيت المواد على الخادم'}}}
function zeroResultPupil(i){
 const c=calc(i),terms=Array.isArray(state.terms)?state.terms.filter(Boolean):[],third=terms[2]||'الفصل الثالث',isThird=state.term===third||/الثالث|3e|3ème|3eme|third/i.test(String(state.term||''));
 if(!isThird)return Number(c?.sum)===0&&Number(c?.avg)===0;
 // In the third trimester the individual bulletin is an annual bulletin.
 // A pupil who has any positive result in T1/T2/T3 must keep their bulletin,
 // even when the current (T3) row is empty/absent/zero.
 const keys=[terms[0]||'الفصل الأول',terms[1]||'الفصل الثاني',third];
 const hasAnnualResult=keys.some(key=>{
  const row=(key===state.term?state.marks:state.marksByTerm?.[key])?.[i]||[];
  return row.some(v=>{if(v===''||v==null||/^(غائب|غائبة|absent|absente|a)$/i.test(String(v).trim()))return false;const n=Number(v);return Number.isFinite(n)&&n>0})
 });
 return !hasAnnualResult
}
window.nataijiZeroResultPupil=zeroResultPupil;
function printOnly(type){
 const isFr=localStorage.getItem('nataiji-lang')==='fr';
 if(!Array.isArray(state.pupils)||!state.pupils.length){modal(isFr?'Aucun élève':'لا يوجد تلاميذ',`<p>${isFr?'Choisissez une classe contenant des élèves avant d’imprimer.':'اختر قسمًا يحتوي على تلاميذ قبل الطباعة.'}</p>`);return false}
 try{renderReports();window.nataijiRefreshOfficialReports?.();window.nataijiFinalizeReports?.()}catch(e){console.error('report preflight failed',e)}
 if(type==='student'){
  const i=Math.max(0,Math.min(state.pupils.length-1,Number($('#student')?.value)||0));
  if(zeroResultPupil(i)){modal(isFr?'Élève absent':'تلميذ غائب',`<p>${isFr?'Aucun relevé individuel n’est généré pour un élève dont le total et la moyenne sont nuls. Il reste présent dans la liste avec le statut « Absent ».':'لا يُنشأ كشف فردي للتلميذ الذي مجموعه ومعدله صفر. يبقى اسمه في اللائحة وتظهر حالته «غائب».'}</p>`);return false}
  const sheet=$('#officialSheet');if(!sheet||!String(sheet.textContent||'').trim()){modal(isFr?'Rapport indisponible':'تعذر تجهيز الكشف','<p>'+ (isFr?'Le relevé n’est pas encore prêt. Rechargez la classe puis réessayez.':'الكشف غير جاهز بعد. أعد تحميل القسم ثم حاول مرة أخرى.') +'</p>');return false}
 }
 document.body.dataset.print=type;requestAnimationFrame(()=>requestAnimationFrame(()=>window.print()));return true
}
function importCsv(file){const r=new FileReader();r.onload=async()=>{const lines=String(r.result).replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean),rows=lines.map(x=>x.split(/[;,]/).map(v=>v.trim()));if(rows[0]&&/NNS|الرقم/.test(rows[0].join(' ')))rows.shift();const valid=rows.filter(x=>x.length>=2&&x[0]&&x[1]);if(!valid.length)return modal('الاستيراد','<p>لم أجد صفوفًا صالحة. الأعمدة المطلوبة: NNS، الاسم، الجنس، تاريخ الميلاد.</p>');state.pupils=valid.map(x=>[x[0],x[1],x[2]||'',x[3]||'']);state.marks=state.pupils.map(()=>state.subjects.map(()=>''));await save(true);render();modal('تم الاستيراد',`<p>تم استيراد ${valid.length} تلميذًا وحفظهم على الخادم.</p>`)};r.readAsText(file,'UTF-8')}
function showReport(type){$$('[data-report]').forEach(b=>b.classList.toggle('active',b.dataset.report===type));$('#studentReport').classList.toggle('hidden',type!=='student');$('#classReport').classList.toggle('hidden',type!=='class');$('#listReport').classList.toggle('hidden',type!=='list')}

function authError(code){return({bad_credentials:'البريد الإلكتروني أو كلمة المرور غير صحيحة',invalid_input:'تحقق من جميع الحقول. كلمة المرور 8 أحرف على الأقل',invalid_invite:'رمز الدعوة غير صحيح أو انتهت صلاحيته',email_exists:'هذا البريد مستخدم مسبقًا',already_initialized:'تم إنشاء الحساب الرئيسي مسبقًا'}[code]||'تعذر إتمام العملية. حاول مرة أخرى')}
function authMarkup(initialized){const setup=!initialized;const form=setup?`<form class="auth-form" id="authForm"><label>اسم المعلم<input name="name" autocomplete="name" required></label><label>البريد الإلكتروني<input name="email" type="email" autocomplete="email" required></label><label>كلمة المرور<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><button class="auth-submit">إنشاء الحساب وبدء الاستخدام</button><p class="auth-error"></p></form>`:`<form class="auth-form" id="authForm"><label>البريد الإلكتروني<input name="email" type="email" autocomplete="email" required></label><label>كلمة المرور<input name="password" type="password" autocomplete="current-password" required></label><button class="auth-submit">تسجيل الدخول</button><p class="auth-error"></p></form>`;return `<div class="auth-box"><div class="auth-brand"><div class="mark">◆</div><h1>نتائجي</h1><p>${setup?'إعداد الحساب لأول مرة':'نظام النتائج المدرسية'}</p></div>${form}<div class="auth-storage"><span class="server-badge ${storageMode==='redis'?'':'local'}">${storageMode==='redis'?'متصل بخادم البيانات':'تعذر الاتصال بخادم البيانات — أعد المحاولة'}</span></div></div>`}
async function showAuth(forceMode='login'){let status;try{status=await api('/api/auth/status')}catch{status={initialized:true,user:null,storage:'memory'}}storageMode=status.storage||'memory';if(status.user&&(!forceMode||forceMode==='resume')){currentUser=status.user;return startApp()}currentUser=null;let gate=$('.auth-gate');if(!gate){gate=document.createElement('div');gate.className='auth-gate';document.body.appendChild(gate)}gate.innerHTML=authMarkup(status.initialized);const form=gate.querySelector('#authForm');form.onsubmit=async e=>{e.preventDefault();const btn=form.querySelector('.auth-submit'),err=form.querySelector('.auth-error'),fd=Object.fromEntries(new FormData(form));btn.disabled=true;err.textContent='';try{const endpoint=status.initialized?'/api/auth/login':'/api/auth/register',res=await api(endpoint,{method:'POST',body:JSON.stringify(fd)});currentUser=res.user;gate.remove();await startApp()}catch(ex){err.textContent=authError(ex.code)}finally{btn.disabled=false}}}
async function startApp(){
 let remote=null,recoveredLocal=false,recoveryFailure=false;
 const beforeRemote=localState(),beforeScore=localStateDataCount(beforeRemote),activeLocalUser=localStorage.getItem('nataiji-active-user');
 try{const r=await api('/api/state');currentUser=r.user||currentUser;remote=r.state}catch(e){if(e.status===401)return showAuth();throw e}
 const sameAccount=!activeLocalUser||activeLocalUser===currentUser?.id,recoveryKey=recoveryStorageKey(currentUser?.id),storedRecovery=(()=>{try{return JSON.parse(localStorage.getItem(recoveryKey))}catch{return null}})(),candidate=localStateDataCount(storedRecovery)>beforeScore?storedRecovery:beforeRemote,candidateScore=localStateDataCount(candidate),remoteScore=localStateDataCount(remote);
 if(sameAccount&&candidateScore>0){
  try{localStorage.setItem(recoveryKey,JSON.stringify(candidate))}catch{}
  if(currentUser?.role==='admin'&&remoteScore===0){
   try{
    const rr=await api('/api/recovery/local-state',{method:'POST',body:JSON.stringify({state:candidate})});
    if(rr?.ok){const fresh=await api('/api/state');remote=fresh.state;currentUser=fresh.user||currentUser;recoveredLocal=true}
   }catch(e){if(!['recovery_target_not_empty','recovery_snapshot_empty'].includes(e.code))recoveryFailure=true}
  }
 }
 state=normalizeState(remote);if(currentUser?.role==='admin'&&!remote?.subjects){state.teacher=currentUser.name||state.teacher}
 try{const sr=await api('/api/subjects?classId='+encodeURIComponent(state.activeClassId||''));if(sr?.ok){state.subjects=structuredClone(sr.subjects||[]);if(state.classData?.[state.activeClassId])state.classData[state.activeClassId].subjects=structuredClone(state.subjects)}}catch{}
 localStorage.setItem('nataiji-data',JSON.stringify(state));render();setView('home');
 if(recoveredLocal)setTimeout(()=>modal('تم استرجاع البيانات',`<p><b>تم العثور على نسخة محلية محفوظة على هذا الجهاز واسترجاعها إلى الخادم بنجاح.</b></p><p>تحقق من الأقسام والتلاميذ والدرجات قبل إجراء أي تعديل جديد.</p>`),120);
 else if(recoveryFailure)setTimeout(()=>modal('نسخة استرجاع محفوظة',`<p>وجدت نسخة محلية قديمة وحفظتها على الجهاز، لكن لم أستطع استعادتها تلقائيًا إلى الخادم.</p><p>لا تمسح بيانات التطبيق أو المتصفح.</p>`),120)
}

$$('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$$('[data-go]').forEach(b=>b.onclick=()=>setView(b.dataset.go));
$('#subjectPicker').onchange=renderMobileScores;
// Capture save targets before queueing: navigation must never redirect a grade.
let markCellSaveTail=Promise.resolve();
const pendingGradeSaves=new Map(),failedGradeSaves=new Map();
const gradeText=(ar,fr)=>document.documentElement.lang==='fr'?fr:ar;
const gradeAccount=()=>JSON.stringify([currentUser?.id,currentUser?.schoolId,currentUser?.activeSharedGrant]);
let manualGradeSaveActive=false;
const gradeContext=()=>({account:gradeAccount(),classId:state.activeClassId,term:state.term});
const gradeKey=c=>JSON.stringify([c.account,c.classId,c.term]);
const sameGradeContext=c=>gradeKey(c)===gradeKey(gradeContext());
function markSaveStatus(text,dirty=false){const el=$('#saveState');if(!el)return;el.textContent=text;el.classList.toggle('dirty',dirty)}
function queueGradeSave(context,operation,onSaved){
 const key=gradeKey(context);
 pendingGradeSaves.set(key,(pendingGradeSaves.get(key)||0)+1);
 if(sameGradeContext(context))markSaveStatus(gradeText('جارٍ حفظ النتائج…','Enregistrement des notes…'),true);
 const run=async()=>{
  try{
   if(context.account!==gradeAccount())throw new Error('save_account_changed');
   const result=await operation();
   if(!result?.ok)throw new Error('marks_save_failed');
   onSaved?.(result);
   return true;
  }catch(error){failedGradeSaves.set(key,true);return false}
  finally{
   const remaining=(pendingGradeSaves.get(key)||1)-1;
   if(remaining)pendingGradeSaves.set(key,remaining);else pendingGradeSaves.delete(key);
   if(sameGradeContext(context)){
    // A later successful full save clears stale per-cell failures. While a
    // full retry is still queued, do not flash the old failure banner.
    const hasFailure=failedGradeSaves.has(key);
    if(remaining)markSaveStatus(gradeText('جارٍ حفظ النتائج…','Enregistrement des notes…'),true);
    else if(hasFailure)markSaveStatus(gradeText('تعذر حفظ بعض النتائج — أعد المحاولة بزر حفظ النتائج','Certaines notes ne sont pas enregistrées. Réessayez avec Enregistrer.'),true);
    else markSaveStatus(gradeText('تم حفظ النتائج على الخادم','Notes enregistrées sur le serveur'),false);
   }
  }
 };
 const job=markCellSaveTail.then(run,run);markCellSaveTail=job.catch(()=>{});return job;
}
function persistMarkCell(input){
 const i=Number(input?.dataset?.i),j=Number(input?.dataset?.j);
 if(!Number.isInteger(i)||!Number.isInteger(j)||input.disabled)return;
 const pupil=state.pupils?.[i],subject=state.subjects?.[j],pupilKey=String(pupil?.[7]||pupil?.[0]||''),subjectId=String(subject?.[4]||'');
 if(!pupilKey||!subjectId)return;
 const max=Number(subject?.[3])>0?Number(subject[3]):20,raw=String(input.value??'').trim(),check=typeof window.nataijiValidateGradeValue==='function'?window.nataijiValidateGradeValue(raw,max):{ok:true,value:raw};
 if(check.ok===false){window.nataijiShowGradeValidationError?.(input,check);markSaveStatus(gradeText('صحح الدرجة غير الصالحة قبل الحفظ','Corrigez la note avant d’enregistrer'),true);return}
 // This listener runs in capture phase, before the input's change handler.
 const value=check.value,context=gradeContext(),payload={classId:context.classId,term:context.term,pupilKey,subjectId,value};
 if(!state.marks[i])state.marks[i]=[];
 state.marks[i][j]=value;
 state.marksByTerm=state.marksByTerm||{};
 state.marksByTerm[context.term]=structuredClone(state.marks);
 const data=state.classData?.[context.classId];
 if(data){data.marksByTerm=data.marksByTerm||{};data.marksByTerm[context.term]=structuredClone(state.marks)}
 return queueGradeSave(context,()=>api('/api/mark',{method:'PUT',body:JSON.stringify(payload)}),()=>{
  if(sameGradeContext(context))localStorage.setItem('nataiji-data',JSON.stringify(state));
 });
}
document.addEventListener('change',e=>{if(!manualGradeSaveActive&&e.target?.matches?.('.mark,.mobile-mark'))persistMarkCell(e.target)},true);
window.addEventListener('beforeunload',e=>{
 if(pendingGradeSaves.size||failedGradeSaves.size){e.preventDefault();e.returnValue=''}
});

$('#saveGrades').onclick=async()=>{
 if(syncBusy)return;
 const button=$('#saveGrades'),old=button.textContent,context=gradeContext(),key=gradeKey(context);
 button.disabled=true;button.textContent=gradeText('جارٍ التحقق…','Vérification…');
 try{
  // Grades are persisted by the per-cell autosave endpoint. The manual button
  // must not resend the whole matrix because teacher/subject scopes can differ
  // from the full server matrix. It only flushes pending autosaves and confirms
  // that no cell save failed.
  const focused=document.activeElement;
  if(focused?.matches?.('.mark,.mobile-mark')){
   focused.dispatchEvent(new Event('change',{bubbles:true}));
   focused.blur();
  }
  await markCellSaveTail.catch(()=>{});
  while((pendingGradeSaves.get(key)||0)>0)await new Promise(r=>setTimeout(r,40));
  if(!sameGradeContext(context))return;
  if(failedGradeSaves.has(key))throw new Error('cell_save_failed');
  localStorage.setItem('nataiji-data',JSON.stringify(state));
  markSaveStatus(gradeText('تم حفظ النتائج على الخادم','Notes enregistrées sur le serveur'),false);
 }catch(error){
  if(sameGradeContext(context))markSaveStatus(gradeText('تعذر حفظ بعض النتائج — أعد تعديل الدرجة التي لم تُحفظ','Certaines notes ne sont pas enregistrées. Modifiez à nouveau la note concernée.'),true);
 }finally{button.textContent=old;button.disabled=false}
};
$('#student').onchange=renderReports;const showResultBtn=$('#showResult');if(showResultBtn)showResultBtn.onclick=renderReports;$('#addStudent').onclick=addStudent;$('#settingsBtn').onclick=openSettings;$('#subjectsBtn').onclick=openSubjects;
$('#logoutBtn').onclick=async()=>{try{await api('/api/auth/logout',{method:'POST',body:'{}'})}catch{}currentUser=null;await showAuth('login')};
$('#printResult').onclick=()=>printOnly('student');$('#printList').onclick=()=>{setView('reports');showReport('list');setTimeout(()=>printOnly('list'),50)};
$('#importBtn').onclick=()=>$('#importFile').click();$('#importFile').onchange=e=>{if(e.target.files[0])importCsv(e.target.files[0])};
$$('[data-report]').forEach(b=>b.onclick=()=>showReport(b.dataset.report));$$('.report-print').forEach(b=>b.onclick=()=>printOnly(b.dataset.print));
window.addEventListener('afterprint',()=>delete document.body.dataset.print);
window.__nataijiBootPromise=showAuth('resume');
