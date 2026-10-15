(()=>{
'use strict';
if(window.__nataijiRosterActions)return;window.__nataijiRosterActions=true;
const tr=(ar,fr)=>localStorage.getItem('nataiji-lang')==='fr'?fr:ar;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const canEdit=()=>typeof currentUser!=='undefined'&&!!currentUser&&(currentUser.role==='admin'||currentUser.permissions?.includes('pupils'));
const eligible=()=>typeof state!=='undefined'&&Array.isArray(state.pupils)&&canEdit();
const current=()=>String(state.activeClassId||'');
const keys=()=>state.pupils.map(p=>String(p?.[7]||p?.[0]||''));
function duplicates(){
 const used=new Set();let n=0;
 for(const p of state.pupils||[]){
  const x=Number(p?.[5]);if(!Number.isInteger(x)||x<1)continue;
  if(used.has(x))n++;else used.add(x)
 }
 return n
}
function onLine(){if(navigator.onLine===false){alert(tr('اتصل بالإنترنت لتنفيذ نقل التلاميذ أو تصحيح أرقام النداء. إدخال الدرجات دون اتصال لا يتأثر.','Connectez-vous pour copier les élèves ou corriger leurs numéros. La saisie hors ligne des notes reste disponible.'));return false}return true}
async function reload(classId,accountId){
 if(String(currentUser?.id)!==accountId||current()!==classId)return;
 if(typeof window.nataijiSelectClass==='function')await window.nataijiSelectClass(classId);
}
function schoolClasses(){
 return (state.classes||[]).filter(c=>c?.id&&String(c.id)!==current());
}
function copyModal(){
 if(!eligible()||!onLine())return;
 const classes=schoolClasses();
 if(!classes.length){alert(tr('أضف القسم الجديد أولًا من «الفصول الدراسية والأقسام». لن يتم حذف أي تلميذ أو نتيجة.','Créez d’abord la classe cible. Aucun élève ni note ne sera supprimé.'));return}
 const p=modal(tr('نسخ التلاميذ إلى قسم آخر','Copier les élèves vers une autre classe'),`
  <p>${tr('انسخ الأسماء فقط، مع إبقاء التلاميذ ونتائجهم في القسم الأصلي. اختر القسم الجديد والتلاميذ.','Copie des identités uniquement : les élèves et leurs notes restent dans la classe source. Choisissez la destination et les élèves.')}</p>
  <label>${tr('القسم الجديد','Classe cible')}<select id="rosterDest">${classes.map(c=>`<option value="${esc(c.id)}">${esc(c.name||c.code||c.id)}</option>`).join('')}</select></label>
  <label class="roster-all"><input id="rosterAll" type="checkbox" checked> ${tr('اختيار الجميع','Tout sélectionner')}</label>
  <div class="roster-check-list">${(state.pupils||[]).map((x,i)=>`<label><input type="checkbox" data-pupil-key="${esc(x?.[7]||x?.[0]||'')}" checked> <span>${esc(x?.[1]||'—')}</span></label>`).join('')}</div>
  <button type="button" class="primary" id="rosterCopyConfirm">${tr('نسخ الأسماء','Copier les élèves')}</button>
  <p class="message" role="status"></p>`);
 const classId=current(),accountId=String(currentUser.id);
 const all=p.querySelector('#rosterAll'),checks=[...p.querySelectorAll('[data-pupil-key]')];
 all.onchange=()=>checks.forEach(c=>{c.checked=all.checked});
 p.querySelector('#rosterCopyConfirm').onclick=async e=>{
  const selected=checks.filter(c=>c.checked).map(c=>c.dataset.pupilKey),dest=p.querySelector('#rosterDest').value,msg=p.querySelector('.message');
  if(!selected.length||selected.some(x=>!x)||new Set(selected).size!==selected.length){msg.textContent=tr('حدد تلاميذ صالحين للنقل.','Choisissez des élèves valides.');return}
  if(!confirm(tr('سيتم نسخ '+selected.length+' تلميذًا دون درجات إلى القسم الجديد. لن يُحذف شيء من القسم الحالي. هل تؤكد؟','Copier '+selected.length+' élève(s) sans notes vers la nouvelle classe ? Rien ne sera supprimé.')))return;
  if(!onLine())return;
  e.currentTarget.disabled=true;msg.textContent=tr('جارٍ النسخ…','Copie en cours…');
  try{
   const result=await api('/api/pupils/copy',{method:'POST',body:JSON.stringify({sourceClassId:classId,targetClassId:dest,pupilKeys:selected})});
   msg.textContent=tr('✓ نُسخ '+result.copied+'، وتم تجاوز '+result.skipped+' موجودين سابقًا. بقيت النتائج القديمة محفوظة.','✓ '+result.copied+' copiés, '+result.skipped+' déjà présents. Les anciennes notes sont intactes.');
   await reload(classId,accountId).catch(()=>{});
  }catch(error){msg.textContent=tr('لم يكتمل النسخ. حاول مجددًا بعد التحقق من اتصالك.','La copie a échoué. Vérifiez votre connexion et réessayez.');e.currentTarget.disabled=false}
 };
}
async function repair(){
 if(!eligible()||!onLine())return;
 const count=duplicates();if(!count)return;
 if(!confirm(tr('هناك '+count+' رقم نداء مكرر. سنصحح الأرقام المكررة أو غير الصالحة فقط، دون تغيير الأسماء أو النتائج. هل توافق؟','Il y a '+count+' numéro(s) répété(s). Corriger uniquement les numéros incorrects, sans toucher aux noms ou notes ?')))return;
 const classId=current(),accountId=String(currentUser.id);
 const btn=document.querySelector('#rosterRepairCalls');if(btn)btn.disabled=true;
 try{
  const data=await api('/api/pupils/repair-calls',{method:'POST',body:JSON.stringify({classId})});
  await reload(classId,accountId);
  alert(tr('✓ تم تصحيح '+data.corrected+' رقم نداء، دون تغيير النتائج.','✓ '+data.corrected+' numéro(s) corrigé(s), sans modifier les notes.'));
 }catch{alert(tr('تعذّر تصحيح الترقيم. لم نغيّر أي نتيجة.','Échec de la correction. Aucune note n’a été modifiée.'));if(btn)btn.disabled=false}
}
function bind(){
 const header=document.querySelector('[data-page="students"] .section-head');
 if(!header||!eligible())return;
 let wrap=header.querySelector('#rosterActionTools');
 if(!wrap){wrap=document.createElement('div');wrap.id='rosterActionTools';wrap.className='roster-action-tools';header.appendChild(wrap)}
 if(!wrap.querySelector('#rosterCopyBtn')){
  const b=document.createElement('button');b.type='button';b.id='rosterCopyBtn';b.textContent=tr('نقل / ترحيل الأسماء','Copier / transférer les élèves');b.onclick=copyModal;wrap.appendChild(b)
 }
 const copy=wrap.querySelector('#rosterCopyBtn');const hideCopy=!state.pupils.length||!schoolClasses().length;if(copy.hidden!==hideCopy)copy.hidden=hideCopy;
 const copyLabel=tr('نقل / ترحيل الأسماء','Copier / transférer les élèves');if(copy.textContent!==copyLabel)copy.textContent=copyLabel;
 let repairButton=wrap.querySelector('#rosterRepairCalls');
 if(duplicates()){
  if(!repairButton){repairButton=document.createElement('button');repairButton.type='button';repairButton.id='rosterRepairCalls';repairButton.onclick=repair;wrap.appendChild(repairButton)}
  const repairLabel=tr('تصحيح رقم النداء','Corriger les N° d’appel')+' ('+duplicates()+')';if(repairButton.textContent!==repairLabel)repairButton.textContent=repairLabel;
 }else repairButton?.remove()
}
const css=document.createElement('style');css.textContent=`
.roster-action-tools{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
.roster-action-tools button{border:1px solid #badbd1;border-radius:12px;background:#f0faf6;color:#096f5e;padding:9px 12px;font-size:13px;font-weight:700}
.roster-check-list{display:grid;gap:7px;max-height:35vh;overflow-y:auto;border:1px solid #dbe6ed;padding:10px;border-radius:12px;margin:12px 0}
.roster-check-list label{display:flex;gap:9px;align-items:center}
.roster-all{display:flex;gap:9px;align-items:center;margin-top:12px}
.roster-action-tools button[hidden]{display:none}
`;document.head.appendChild(css);
let timer=null;
new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(bind,100)}).observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('DOMContentLoaded',()=>setTimeout(bind,100));
})();
