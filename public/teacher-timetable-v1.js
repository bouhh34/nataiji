/* Official primary-school timetable templates, transcribed from the supplied four-page schedule.
   A teacher's changes are stored separately in the existing authenticated state. */
(() => {
  'use strict';
  const DAYS=['الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
  const raw={"1":[["القرآن الكريم:30","القراءة:45","التربية على المواطنة:20","الصحة:15","القراءة:40","الحديث الشريف:30","الهندسة:20","الحساب:25"],["الحساب:25","العبادات:30","المهارات الحياتية:20","الكتابة:45","الهندسة:20","الكتابة:30","الأعمال اليدوية والرسم:30","التعبير:25"],["التربية البدنية:35","القراءة:35","الحساب:20","الأخلاق:30","القراءة:35","قواعد السلامة:15","القياس:20","التعبير:35"],["القرآن الكريم:30","الكتابة:40","الحساب:20","العقيدة:30","التعبير:40","السلوك المدني:20","البيئة:15","القياس:30"],["القياس:20","القراءة:40","الكتابة:35","الحساب:20","التعبير:35","التقنيات:30","الهندسة:20","التربية البدنية:25"]],"2":[["القرآن الكريم:30","التربية على المواطنة:20","القراءة:30","الحساب:40","القراءة:30","الحديث الشريف:30","الهندسة:30","الصحة:15","Compréhension de l’écrit:30","Compréhension de l’oral:40","Production de l’écrit:50"],["الحساب:40","العبادات:30","الأعمال اليدوية والرسم:30","الكتابة:20","الكتابة:20","الهندسة:20","المهارات الحياتية:20","التعبير:45","Compréhension de l’écrit:30","Compréhension de l’oral:40","Production de l’écrit:50"],["التربية البدنية:30","القراءة:30","الحساب:30","الأخلاق:30","القراءة:30","قواعد السلامة:15","القياس:25","التعبير:35"],["القرآن الكريم:30","الكتابة:30","الحساب:30","العقيدة:30","البيئة:15","الكتابة:25","التقنيات:30","القياس:35","Compréhension de l’oral:30","Compréhension de l’oral:50","Production de l’écrit:40"],["التربية البدنية:30","القراءة:35","الحساب:25","الكتابة:30","الكتابة:20","الهندسة:25","التعبير:40","السلوك المدني:20"]],"3":[["القرآن:30","الحساب:30","المهارات الحياتية:30","القياس:30","العقيدة:30","السلوك المدني:30","القراءة والفهم:45","Compréhension de l’oral:30","Compréhension de l’écrit:30","Production de l’oral:30","Production de l’écrit:30"],["السيرة:30","الحساب:30","البيئة:30","الهندسة:30","الأخلاق:30","تقنيات الإعلام والاتصال:30","التاريخ والجغرافيا:45","Compréhension de l’oral:30","Compréhension de l’écrit:30","Production de l’oral:30","Production de l’écrit:30"],["الرياضة:30","الإملاء والخط:30","الهندسة:30","التعبير:30","الحساب:30","النحو والصرف:30","القراءة والفهم:45","النحو والصرف:30","التجريب:30","القياس:30","الرياضة:30"],["القرآن:30","التعبير:30","الإملاء والخط:30","الحساب:30","الغذاء والصحة:30","الرسم والأعمال:30","النحو والصرف:45","Compréhension de l’oral:30","Production de l’oral:30","Compréhension de l’écrit:30","Compréhension de l’oral:30"],["الحديث الشريف:30","التربية على المواطنة:30","التعبير:30","الحساب:30","العبادات:30","الهندسة:30","القراءة والفهم:45"]],"4":[["القرآن:30","الحساب:30","المهارات الحياتية:30","القياس:30","العقيدة:30","السلوك المدني:30","القراءة والفهم:45","Compréhension de l’oral:30","Compréhension de l’écrit:30","Production de l’oral:30","Production de l’écrit:30"],["السيرة:30","الحساب:30","البيئة:30","الهندسة:30","الأخلاق:30","تقنيات الإعلام والاتصال:30","التاريخ والجغرافيا:45","Compréhension de l’oral:30","Compréhension de l’écrit:30","Production de l’oral:30","Production de l’écrit:30"],["الرياضة:30","الإملاء والخط:30","الهندسة:30","التعبير:30","الحساب:30","النحو والصرف:30","القراءة والفهم:45","النحو والصرف:30","التجريب:30","القياس:30","الرياضة:30"],["القرآن:30","التعبير:30","الإملاء والخط:30","الحساب:30","الغذاء والصحة:30","الرسم والأعمال:30","النحو والصرف:45","Compréhension de l’oral:30","Production de l’oral:30","Compréhension de l’écrit:30","Compréhension de l’oral:30"],["الحديث الشريف:30","التربية على المواطنة:30","التعبير:30","الحساب:30","العبادات:30","الهندسة:30","القراءة والفهم:45"]],"5":[["التربية البدنية:30","القراءة والفهم:45","الحساب:45","العبادات:30","التربية على المواطنة:30","البيئة / التجريب:45","الحديث الشريف:30","قواعد النحو والصرف:45","الهندسة:45"],["Compréhension de l’écrit:45","Production de l’écrit:45","Compréhension de l’oral:30","الجغرافيا:30","العقيدة / الأخلاق:30","القراءة والفهم:45","القياس:45","الإملاء والخط العربي:45","التعبير:30"],["الحساب:45","التعبير:45","القرآن الكريم:30","السيرة النبوية:30","السلوك المدني / المهارات الحياتية:30","قواعد النحو والصرف:45","التاريخ:45","الهندسة:45","التربية البدنية:30"],["القراءة والفهم:45","التعبير:45","القرآن الكريم:30","تقنيات الإعلام والاتصال:30","القياس:30","الحساب:45","Compréhension de l’écrit:45","Production de l’écrit:45","Compréhension de l’oral:30"],["Compréhension de l’écrit:45","Production de l’écrit:45","Production de l’oral:30","الرسم / الأعمال اليدوية:30","الإملاء والخط العربي:30","الصحة والتغذية:45"]],"6":[["التربية البدنية:30","القراءة والفهم:45","الحساب:45","العبادات:30","التربية على المواطنة:30","البيئة / التجريب:45","الحديث الشريف:30","قواعد النحو والصرف:45","الهندسة:45"],["Compréhension de l’écrit:45","Production de l’écrit:45","Compréhension de l’oral:30","الجغرافيا:30","العقيدة / الأخلاق:30","القراءة والفهم:45","القياس:45","الإملاء والخط العربي:45","التعبير:30"],["الحساب:45","التعبير:45","القرآن الكريم:30","السيرة النبوية:30","السلوك المدني / المهارات الحياتية:30","قواعد النحو والصرف:45","التاريخ:45","الهندسة:45","التربية البدنية:30"],["القراءة والفهم:45","التعبير:45","القرآن الكريم:30","تقنيات الإعلام والاتصال:30","القياس:30","الحساب:45","Compréhension de l’écrit:45","Production de l’écrit:45","Compréhension de l’oral:30"],["Compréhension de l’écrit:45","Production de l’écrit:45","Production de l’oral:30","الرسم / الأعمال اليدوية:30","الإملاء والخط العربي:30","الصحة والتغذية:45"]]};
  const templates=Object.fromEntries(Object.entries(raw).map(([grade,days])=>[grade,days.map(day=>day.map(cell=>{const i=cell.lastIndexOf(':');return {subject:cell.slice(0,i),minutes:Number(cell.slice(i+1))}}))]));
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
  const clone=v=>JSON.parse(JSON.stringify(v));
  let grade='1',working=null,changed=false,selectedDay=0;
  const currentClass=()=>String(state?.activeClassId||document.querySelector('#classTop')?.value||state?.classCode||'default');
  const key=()=>currentClass();
  function guessGrade(){const cls=selectorClasses().find(c=>String(c.id)===currentClass());const name=String(cls?.name||state.className||'');const m=name.match(/(?:^|\D)([1-6])\s*(?:AF|AP|ème|e|السنة|ابتدائية)?(?:\D|$)/i);return m?.[1]||'1'}
  function saved(){return state?.teacherTimetables?.[key()]||null}
  function load(){const record=saved();grade=String(record?.grade||guessGrade());working=clone(record?.days||templates[grade]);changed=false;draw()}
  function draw(){
    const root=document.getElementById('teacherTimetable');if(!root)return;

    root.innerHTML=`<div class="section-head"><h2>استعمال الزمن | Emploi du temps</h2></div>
      <div class="tt-actions"><label>السنة <select id="ttGrade">${[1,2,3,4,5,6].map(n=>`<option value="${n}" ${grade===String(n)?'selected':''}>${n}</option>`).join('')}</select></label>
      <button type="button" id="ttOfficial">استعادة الجدول الرسمي</button>
      <button type="button" id="ttSave">حفظ التخصيص</button>
      <button type="button" id="ttPrint">طباعة / PDF</button></div>
      <p class="tt-note">القسم: ${safe(document.querySelector('#classTop')?.selectedOptions?.[0]?.textContent||state.className||'القسم الحالي')} — ${safe(state.year||'')} · الاستراحة 15 دقيقة بعد الحصة السادسة (السنوات 1–4)، وبعد الخامسة (السنوات 5–6).</p>
      <div class="tt-day-picker"><label for="ttDay">اليوم</label><select id="ttDay">${DAYS.map((d,i)=>`<option value="${i}" ${selectedDay===i?'selected':''}>${d}</option>`).join('')}</select></div>
      <div class="tt-scroll"><table class="tt-table"><thead><tr><th>الحصة</th>${DAYS.map((d,i)=>`<th data-tt-day="${i}">${d}</th>`).join('')}</tr></thead><tbody>
      ${Array.from({length:Math.max(...working.map(d=>d.length))},(_,i)=>`<tr><th>${i+1}${i===(Number(grade)>=5?5:6)?'<small>بعد الاستراحة</small>':''}</th>${working.map((day,d)=>{const c=day[i];return `<td data-tt-day="${d}">${c?`<input aria-label="المادة ${DAYS[d]} ${i+1}" data-day="${d}" data-slot="${i}" data-field="subject" value="${safe(c.subject)}"><label>دقائق <input type="number" min="1" max="180" data-day="${d}" data-slot="${i}" data-field="minutes" value="${c.minutes}"></label>`:'—'}</td>`}).join('')}</tr>`).join('')}
      </tbody></table></div><p id="ttStatus" role="status">${changed?'تغييرات غير محفوظة':''}</p>`;
    root.dataset.selectedDay=String(selectedDay);
    root.querySelector('#ttDay').onchange=e=>{selectedDay=Number(e.target.value);root.dataset.selectedDay=String(selectedDay)};
    root.querySelector('#ttGrade').onchange=e=>{if(changed&&!confirm('سيتم تجاهل التغييرات غير المحفوظة. متابعة؟')){e.target.value=grade;return}grade=e.target.value;working=clone(templates[grade]);changed=true;draw()};
    root.querySelector('#ttOfficial').onclick=()=>{if(confirm('استعادة الجدول الرسمي لهذه السنة؟ لن تتغير النسخة المحفوظة حتى تضغط حفظ.')){working=clone(templates[grade]);changed=true;draw()}};
    root.querySelector('#ttSave').onclick=async()=>{const b=root.querySelector('#ttSave');b.disabled=true;try{state.teacherTimetables={...(state.teacherTimetables||{}),[key()]:{grade,days:clone(working)}};await save(true);changed=false;root.querySelector('#ttStatus').textContent='تم حفظ الجدول';}catch(e){root.querySelector('#ttStatus').textContent='تعذر الحفظ: تحقق من الاتصال ثم حاول مجددًا'}finally{b.disabled=false}};
    root.querySelector('#ttPrint').onclick=()=>printTimetable(root);
    root.querySelectorAll('[data-field]').forEach(el=>el.oninput=()=>{const d=Number(el.dataset.day),i=Number(el.dataset.slot);working[d][i][el.dataset.field]=el.dataset.field==='minutes'?Math.max(1,Math.min(180,Number(el.value)||1)):el.value;changed=true;root.querySelector('#ttStatus').textContent='تغييرات غير محفوظة'});
  }
  function timetableDocument(root){
    const note=root.querySelector('.tt-note')?.textContent||'';
    const rows=Array.from({length:Math.max(...working.map(d=>d.length))},(_,i)=>`<tr><th>${i+1}</th>${working.map(day=>{const c=day[i];return `<td>${c?`<div dir="auto">${safe(c.subject)}</div><small>${safe(c.minutes)} دقيقة / min</small>`:'—'}</td>`}).join('')}</tr>`).join('');
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>استعمال الزمن</title><style>
      @page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Tahoma,sans-serif}
      h1{text-align:center;font-size:16pt;margin:0 0 2mm}p{font-size:9pt;margin:0 0 3mm;line-height:1.4}
      table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10pt}th,td{border:1px solid #84949d;padding:1.2mm;text-align:center;vertical-align:middle;overflow-wrap:anywhere;line-height:1.2}thead th{background:#eaf3f3;height:8mm}th:first-child{width:9%}tbody tr{height:12mm;break-inside:avoid}td small{display:block;font-size:8pt;margin-top:1mm}thead{display:table-header-group}table{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    </style></head><body><h1>استعمال الزمن | Emploi du temps</h1><p>${safe(note)}</p><table><thead><tr><th>الحصة</th>${DAYS.map(d=>`<th>${safe(d)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
  }
  function printTimetable(root){
    const html=timetableDocument(root);
    if(window.nataijiPrintDocument&&window.Capacitor?.isNativePlatform?.()){
      void window.nataijiPrintDocument({html,title:'استعمال الزمن | Emploi du temps',landscape:true});return;
    }
    const frame=document.createElement('iframe');frame.style.cssText='position:fixed;width:1px;height:1px;bottom:0;left:0;border:0';frame.title='طباعة استعمال الزمن';
    frame.onload=async()=>{await frame.contentDocument.fonts?.ready;frame.contentWindow.addEventListener('afterprint',()=>frame.remove(),{once:true});frame.contentWindow.focus();frame.contentWindow.print()};
    frame.srcdoc=html;document.body.appendChild(frame);
  }
  function init(){
    const nav=document.querySelector('#sideNav'),main=document.querySelector('main');if(!nav||!main||document.getElementById('teacherTimetable'))return;
    const btn=document.createElement('button');btn.dataset.view='timetable';btn.textContent='▦ استعمال الزمن';nav.appendChild(btn);
    const grid=document.querySelector('[data-page="more"] .settings-grid');
    const moreBtn=document.createElement('button');moreBtn.type='button';moreBtn.id='teacherTimetableMoreBtn';moreBtn.className='menu-card';moreBtn.innerHTML='<b>استعمال الزمن / Emploi du temps</b><span>الجدول الرسمي وتخصيص حصص القسم • طباعة PDF</span>';
    if(grid)grid.prepend(moreBtn);
    const section=document.createElement('section');section.className='view hidden';section.dataset.page='timetable';section.id='teacherTimetable';main.appendChild(section);
    const openTimetable=()=>{setView('timetable');load()};
    btn.addEventListener('click',openTimetable);
    moreBtn.addEventListener('click',openTimetable);
    document.querySelector('#classTop')?.addEventListener('change',()=>{if(!section.classList.contains('hidden'))load()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();