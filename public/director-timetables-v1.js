// Director per-class weekly timetable, shared by web and Android WebView.
(()=>{
'use strict';
const DAYS=[['mon','الإثنين','Lundi'],['tue','الثلاثاء','Mardi'],['wed','الأربعاء','Mercredi'],['thu','الخميس','Jeudi'],['fri','الجمعة','Vendredi'],['sat','السبت','Samedi']];
const PAD=n=>String(n).padStart(2,'0');
function start({frame,institution,user,t,esc,network,apiPost,icon,message}){
 const school=String(institution?.id||''),year=String(institution?.academic_year||'');
 const root=()=>document.querySelector('#nataijiDirectorRoot');
 const qs=s=>root()?.querySelector(s);
 const all=s=>[...root()?.querySelectorAll(s)||[]];
 const localKey='nataiji-director-timetable-v1:'+String(user?.id||'')+':'+school+':'+year;
 const cacheRead=()=>{try{const x=JSON.parse(localStorage.getItem(localKey)||'null');return x?.school===school&&x?.year===year&&Array.isArray(x.classes)&&Array.isArray(x.timetables)?x:null}catch{return null}};
 const cacheWrite=x=>{try{localStorage.setItem(localKey,JSON.stringify({school,year,classes:x.classes,timetables:x.timetables}))}catch{}};
 let classes=[],timetables=[],selected='',offline=false;
 const known=key=>classes.find(c=>c.classKey===key)||null;
 const saved=key=>timetables.find(c=>c.classKey===key)||null;
 const allowed=()=>String(window.currentUser?.id||user?.id)===String(user?.id);
 const error=e=>{
  const code=e?.code||e?.error;
  const m={
   timetable_version_conflict:t('عُدّل الجدول على جهاز آخر. أعد فتحه قبل الحفظ.','Cet emploi du temps a changé sur un autre appareil. Actualisez-le.'),
   class_schedule_overlap:t('توجد حصتان متداخلتان في القسم نفسه.','Deux cours du même groupe se chevauchent.'),
   teacher_schedule_conflict:t('الأستاذ مشغول بقسم آخر في نفس الموعد.','Cet enseignant est déjà affecté à une autre classe à cette heure.'),
   timetable_class_name_conflict:t('يوجد جدول لقسم آخر بالاسم نفسه.','Une autre classe utilise déjà ce nom.'),
   invalid_timetable_entry:t('تحقق من اليوم والساعات والمادة (4 ساعات كحد أقصى للحصة).','Vérifiez le jour, les heures et la matière (4 heures maximum).'),
   class_not_in_institution:t('هذا القسم غير مرتبط بمؤسستك.','Cette classe ne fait pas partie de votre établissement.')
  };
  return m[code]||t('تعذر حفظ الجدول. تحقق من الاتصال وحاول مجددًا.','Impossible d’enregistrer. Vérifiez la connexion et réessayez.');
 };
 function stateMessage(text,bad=false){const el=qs('#directorTimetableStatus');if(el){el.textContent=text;el.classList.toggle('bad',bad)}else message?.(text,bad)}
 function printTable(){
  const cl=known(selected);if(!cl)return;
  const lessons=(saved(selected)?.entries||[]),dayHead=DAYS.map(d=>'<th>'+esc(t(d[1],d[2]))+'</th>').join('');
  const times=[...new Set(lessons.map(x=>x.start+'–'+x.end))].sort((a,b)=>a.localeCompare(b));
  const html='<!doctype html><html lang="'+(t('ar','fr'))+'" dir="'+t('rtl','ltr')+'"><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#143c49}header{text-align:center;border-bottom:2px solid #116c64;padding-bottom:9px}h1{font-size:21px;margin:7px 0}p{font-size:12px;margin:5px}table{border-collapse:collapse;table-layout:fixed;width:100%;margin-top:16px}th,td{border:1px solid #a6bfba;padding:9px 6px;text-align:center;vertical-align:top;overflow-wrap:anywhere;font-size:12px}th{background:#e9f6f1}td:first-child{font-weight:bold;background:#f3f8f6;white-space:nowrap}small{font-size:10px;color:#647b79}</style></head><body><header><h1>'+esc(institution.name||'')+'</h1><p>'+t('الجدول الدراسي للقسم','Emploi du temps de la classe')+' : <b>'+esc(cl.className)+'</b> — '+esc(year)+'</p></header><table><thead><tr><th>'+t('التوقيت','Horaire')+'</th>'+dayHead+'</tr></thead><tbody>'+times.map(slot=>{
   const a=slot.split('–');return '<tr><td dir="ltr">'+esc(slot)+'</td>'+DAYS.map(([day])=>{const x=lessons.find(l=>l.day===day&&l.start===a[0]&&l.end===a[1]);return '<td>'+(x?'<b>'+esc(x.subject)+'</b>'+(x.teacher?'<p>'+esc(x.teacher)+'</p>':'')+(x.room?'<small>'+esc(x.room)+'</small>':''):'—')+'</td>'}).join('')+'</tr>'
  }).join('')+'</tbody></table></body></html>';
  if(!times.length){stateMessage(t('أضف حصة أولًا قبل الطباعة.','Ajoutez un cours avant impression.'),true);return}
  const pane=document.createElement('iframe');pane.title=t('طباعة الجدول','Imprimer l’emploi du temps');pane.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';document.body.appendChild(pane);
  const dispose=()=>setTimeout(()=>pane.remove(),1500);
  pane.onload=()=>{try{pane.contentWindow.onafterprint=dispose;pane.contentWindow.focus();pane.contentWindow.print();setTimeout(dispose,60000)}catch{dispose();stateMessage(t('تعذر فتح الطباعة على هذا الجهاز.','Impression indisponible.'),true)}};
  pane.srcdoc=html;
 }
 async function fetchData(){
  try{
   if(navigator.onLine===false)throw new Error('offline');
   const x=await network('/api/director/timetables');
   if(!x?.ok)throw new Error('invalid_response');
   classes=x.classes||[];timetables=x.timetables||[];offline=false;cacheWrite(x);
  }catch{
   const local=cacheRead();if(!local)throw new Error('no_cached_timetable');
   classes=local.classes;timetables=local.timetables;offline=true;
  }
 }
 function render(){
  const defaultClass=classes[0]?.classKey||'';
  if(!known(selected))selected=defaultClass;
  const cl=known(selected),items=saved(selected)?.entries||[];
  const view='<p class="director-intro">'+t('لكل قسم جدول مستقل، ويُحفظ حسب السنة الدراسية. يمكنك إضافة الأقسام أو اختيار أقسامك المسجلة.','Chaque classe a son propre emploi du temps, conservé par année scolaire.')+'</p>'+
   (offline?'<p class="director-offline-notice">'+t('أنت تعرض نسخة محفوظة دون اتصال. الحفظ يتطلب الاتصال.','Vous consultez une copie hors connexion. Connectez-vous pour enregistrer.')+'</p>':'')+
   '<section class="director-time-panel"><label class="director-time-class-label">'+t('القسم','Classe')+'<select id="directorTimeClass">'+classes.map(c=>'<option value="'+esc(c.classKey)+'"'+(c.classKey===selected?' selected':'')+'>'+esc(c.className)+'</option>').join('')+'</select></label>'+
   '<form id="directorTimeNewClass" class="director-time-new-class"><label>'+t('إضافة قسم غير موجود','Ajouter une classe manuellement')+'<input name="className" maxlength="120" placeholder="'+t('مثال: السنة الأولى 1','Ex. : 1AS A')+'" required></label><button type="submit">'+icon('plus',16)+t('إضافة قسم','Ajouter')+'</button></form></section>'+
   '<div class="director-time-toolbar"><div><b>'+esc(cl?.className||t('لا توجد أقسام بعد','Aucune classe'))+'</b><small>'+esc(year)+' · '+items.length+' '+t('حصة','cours')+'</small></div><div class="director-time-toolbar-actions"><button id="directorTimeAdd" type="button" class="director-primary" '+(!cl?'disabled':'')+'>'+icon('plus',17)+t('إضافة حصة','Ajouter un cours')+'</button><button type="button" id="directorTimePrint" '+(!cl?'disabled':'')+'>'+t('طباعة / PDF','Imprimer / PDF')+'</button></div></div>'+
   '<p id="directorTimetableStatus" role="status" class="director-time-status"></p>'+
   (cl?'<div class="director-time-days">'+DAYS.map(([day,ar,fr])=>{
    const ls=items.filter(x=>x.day===day).sort((a,b)=>a.start.localeCompare(b.start));
    return '<section class="director-time-day"><h3>'+t(ar,fr)+'</h3><div class="director-time-day-body">'+(ls.length?ls.map((entry)=>{
     const idx=items.indexOf(entry);
     return '<button type="button" class="director-time-lesson" data-timetable-edit="'+idx+'"><span class="director-time-clock" dir="ltr">'+esc(entry.start)+'–'+esc(entry.end)+'</span><b>'+esc(entry.subject)+'</b>'+(entry.teacher?'<small>'+esc(entry.teacher)+'</small>':'')+(entry.room?'<small>'+t('قاعة','Salle')+' '+esc(entry.room)+'</small>':'')+'</button>'
    }).join(''):'<p class="director-time-empty">'+t('لا توجد حصص','Aucun cours')+'</p>')+'</div></section>'
   }).join('')+'</div>':'<p class="director-empty">'+t('أضف قسمًا جديدًا أو أنشئ قسمًا في مساحة التدريس ثم عد هنا.','Ajoutez une classe ou créez-la depuis votre espace pédagogique.')+'</p>');
  frame(t('الجدول الدراسي للأقسام','Emplois du temps des classes'),view);
  qs('#directorTimeClass')?.addEventListener('change',event=>{selected=event.target.value;render()});
  qs('#directorTimeNewClass').onsubmit=async event=>{
   event.preventDefault();
   if(offline){stateMessage(t('اتصل بالإنترنت لإضافة قسم.','Connectez-vous pour ajouter une classe.'),true);return}
   const name=String(new FormData(event.currentTarget).get('className')||'').trim();
   if(!name)return;
   const newKey='manual:'+crypto.randomUUID(),button=qs('#directorTimeNewClass button');button.disabled=true;
   try{
    const out=await apiPost('/api/director/timetables/'+encodeURIComponent(newKey),{className:name,expectedVersion:0,entries:[]},'PUT');
    if(!out?.ok)throw new Error('unverified_save');
    await fetchData();selected=newKey;render()
   }catch(e){stateMessage(error(e),true);button.disabled=false}
  };
  qs('#directorTimeAdd')?.addEventListener('click',()=>editor(-1));
  qs('#directorTimePrint')?.addEventListener('click',printTable);
  all('[data-timetable-edit]').forEach(b=>b.onclick=()=>editor(Number(b.dataset.timetableEdit)));
 }
 function editor(index){
  const cl=known(selected);if(!cl)return;
  const original=saved(selected)?.entries||[],entry=index>=0?original[index]:null;
  if(offline||navigator.onLine===false){stateMessage(t('اتصل بالإنترنت لتعديل الجدول. يمكن الاطلاع والطباعة دون اتصال.','Connectez-vous pour modifier. Consultation et impression restent possibles.'),true);return}
  const html='<p class="director-intro">'+esc(cl.className)+' · '+esc(year)+'</p><form id="directorTimeLessonForm" class="director-form director-time-editor">'+
   '<label>'+t('اليوم','Jour')+'<select name="day" required>'+DAYS.map(d=>'<option value="'+d[0]+'"'+((entry?.day||'mon')===d[0]?' selected':'')+'>'+t(d[1],d[2])+'</option>').join('')+'</select></label>'+
   '<label>'+t('من الساعة','Début')+'<input type="time" name="start" value="'+esc(entry?.start||'08:00')+'" required></label>'+
   '<label>'+t('إلى الساعة','Fin')+'<input type="time" name="end" value="'+esc(entry?.end||'09:00')+'" required></label>'+
   '<label>'+t('المادة','Matière')+'<input name="subject" required maxlength="120" value="'+esc(entry?.subject||'')+'" placeholder="'+t('الرياضيات','Mathématiques')+'"></label>'+
   '<label>'+t('الأستاذ / المعلم','Enseignant')+'<input name="teacher" maxlength="120" value="'+esc(entry?.teacher||'')+'" placeholder="'+t('الاسم (اختياري)','Nom (facultatif)')+'"></label>'+
   '<label>'+t('القاعة','Salle')+'<input name="room" maxlength="80" value="'+esc(entry?.room||'')+'"></label>'+
   '<div class="director-time-editor-actions"><button type="submit" class="director-primary">'+t('حفظ الحصة','Enregistrer')+'</button><button type="button" id="directorTimeCancel">'+t('إلغاء','Annuler')+'</button>'+(entry?'<button type="button" id="directorTimeDelete">'+t('حذف الحصة','Supprimer')+'</button>':'')+'</div></form>';
  frame(entry?t('تعديل حصة','Modifier le cours'):t('إضافة حصة دراسية','Ajouter un cours'),html+'<p id="directorTimetableStatus" class="director-time-status" role="status"></p>');
  qs('#directorTimeCancel').onclick=render;
  async function save(next){
   const originalSaved=saved(selected),expected=originalSaved?.version||0,btn=qs('#directorTimeLessonForm button[type="submit"]');
   if(btn)btn.disabled=true;
   try{
    const result=await apiPost('/api/director/timetables/'+encodeURIComponent(selected),{className:cl.className,expectedVersion:expected,entries:next},'PUT');
    if(!result?.ok||!result.timetable)throw new Error('unverified_save');
    timetables=timetables.filter(s=>s.classKey!==selected).concat(result.timetable);
    cacheWrite({classes,timetables});offline=false;render();
   }catch(e){stateMessage(error(e),true);if(btn)btn.disabled=false}
  }
  qs('#directorTimeLessonForm').onsubmit=async event=>{
   event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));
   const next={day:data.day,start:data.start,end:data.end,subject:String(data.subject||'').trim(),teacher:String(data.teacher||'').trim(),room:String(data.room||'').trim()};
   const updated=original.slice();if(index<0)updated.push(next);else updated[index]=next;
   await save(updated)
  };
  const del=qs('#directorTimeDelete');
  if(del)del.onclick=async()=>{
   if(!confirm(t('حذف هذه الحصة من جدول القسم؟','Supprimer ce cours ?')))return;
   await save(original.filter((_,i)=>i!==index))
  };
 }
 frame(t('الجدول الدراسي للأقسام','Emplois du temps des classes'),'<div class="director-loading">'+t('تحميل الأقسام والجداول...','Chargement des classes et des emplois du temps...')+'</div>');
 fetchData().then(()=>{if(allowed())render()}).catch(()=>frame(t('الجدول الدراسي للأقسام','Emplois du temps des classes'),'<p class="director-intro">'+t('تعذر تحميل الجداول. اتصل بالإنترنت وحاول من جديد.','Impossible de charger les emplois du temps. Reconnectez-vous.')+'</p><button type="button" id="directorTimeRetry">'+t('إعادة المحاولة','Réessayer')+'</button>')).then(()=>{const b=qs('#directorTimeRetry');if(b)b.onclick=()=>start({frame,institution,user,t,esc,network,apiPost,icon,message})});
}
window.NataijiDirectorTimetables={open:start};
})();