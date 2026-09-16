(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DEF={enabled:true,scale:20,bands:[{min:0,max:9,label:'راسب'},{min:9,max:10,label:'ناجح'},{min:10,max:12,label:'مقبول'},{min:12,max:14,label:'جيد'},{min:14,max:17,label:'جيد جداً'},{min:17,max:20,label:'ممتاز'}]};
const FR={'راسب':'Insuffisant','ضعيف':'Insuffisant','ناجح':'Admis','مقبول':'Passable','جيد':'Bien','جيد جدا':'Très bien','جيد جداً':'Très bien','ممتاز':'Excellent'};
let cfg=structuredClone(DEF),busy=false;
const lang=()=>localStorage.getItem('nataiji-lang')||'ar';
async function api(method,body){let r=await fetch('/api/state',{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(!r.ok)throw 0;return r.json()}
async function load(){try{let d=await api('GET'),s=d.state||d||{};cfg={...DEF,...(s.evaluation||{}),bands:Array.isArray(s.evaluation?.bands)?s.evaluation.bands:DEF.bands}}catch{}}
async function saveCfg(){let d=await api('GET'),s=d.state||d||{};s.evaluation=cfg;await api('PUT',{state:s})}
function bandLabel(b){if(!b)return'';if(lang()!=='fr')return b.label||'';return b.labelFr||FR[String(b.label||'').trim()]||b.label||''}
function remark(avg){if(!cfg.enabled)return '';let v=Number(avg);if(!Number.isFinite(v))return '';const b=cfg.bands.find((x,i)=>v>=Number(x.min)&&(i===cfg.bands.length-1?v<=Number(x.max):v<Number(x.max)));return bandLabel(b)}
function isAverage(v){return['المعدل','معدل الفصل الثالث','المعدل العام','Moyenne','Moyenne du 3e trimestre','Moyenne Générale','Moyenne générale'].includes(String(v||'').trim())}
function finalTerm(){try{return state?.term==='الفصل الثالث'}catch{return false}}
function selectedStudent(){const s=$('#student');return Math.max(0,s?.selectedIndex??0)}
function evaluationAverage(i,avgRow){
  if(finalTerm()&&typeof window.nataijiAnnualAverage==='function'){
    const v=window.nataijiAnnualAverage(i);if(v!=null&&Number.isFinite(Number(v)))return Number(v);
  }
  const v=parseFloat(avgRow?.cells?.[1]?.textContent);return Number.isFinite(v)?v:null;
}
function applyStudent(){
  const body=$('#sheet');if(!body)return;
  [...body.querySelectorAll('tr[data-evaluation-row="1"]')].forEach(x=>x.remove());
  const rows=[...body.querySelectorAll('tr')];if(!rows.length)return;
  const avgRow=rows.find(r=>isAverage(r.cells?.[0]?.textContent));
  const avg=evaluationAverage(selectedStudent(),avgRow),value=avg==null?'':remark(avg);
  rows.forEach(tr=>{const c=tr.cells?.[2];if(!c)return;c.textContent='';c.removeAttribute('rowspan');c.classList.remove('student-evaluation-cell')});
  const first=rows[0]?.cells?.[2];if(!first||!value)return;
  first.rowSpan=rows.length;first.classList.add('student-evaluation-cell');first.innerHTML=`<span data-dynamic-lang="1">${esc(value)}</span>`;
  for(let i=1;i<rows.length;i++){const c=rows[i].cells?.[2];if(c)c.remove()}
}
function applyClass(){
  const table=$('#paperResults');if(!table||!table.tHead||!table.tBodies[0])return;
  const head=table.tHead.rows[0];
  let evalIndex=[...head.cells].findIndex(c=>c.dataset.evalCol==='1'||/^(التقييم|الملاحظة|Appréciation)$/i.test(c.textContent.trim()));
  if(evalIndex<0){const th=document.createElement('th');th.dataset.evalCol='1';head.appendChild(th);evalIndex=head.cells.length-1}
  head.cells[evalIndex].dataset.evalCol='1';head.cells[evalIndex].textContent=lang()==='fr'?'Appréciation':'الملاحظة';
  const headers=[...head.cells].map(c=>c.textContent.trim()),avgIndex=headers.findIndex(isAverage);
  [...table.tBodies[0].rows].forEach((r,i)=>{
    let cell=[...r.cells].find(c=>c.dataset.evalCell==='1');
    if(!cell&&r.cells[evalIndex])cell=r.cells[evalIndex];
    if(!cell){cell=r.insertCell(-1)}cell.dataset.evalCell='1';
    let avg=null;
    if(finalTerm()&&typeof window.nataijiAnnualAverage==='function'){const v=window.nataijiAnnualAverage(i);if(v!=null&&Number.isFinite(Number(v)))avg=Number(v)}
    if(avg==null&&avgIndex>=0){const v=parseFloat(r.cells[avgIndex]?.textContent);if(Number.isFinite(v))avg=v}
    cell.textContent=avg==null?'':remark(avg)
  })
}
function apply(){if(busy)return;busy=true;try{applyStudent();applyClass()}finally{busy=false}}
window.nataijiRemark=remark;window.nataijiApplyEvaluation=apply;
function settings(){let g=$('.settings-grid');if(!g||$('#evaluationBtn'))return;let b=document.createElement('button');b.id='evaluationBtn';b.className='menu-card';b.innerHTML='<b>★ تقييم وملاحظات التلاميذ</b><span>تعديل سلم التقييم والملاحظة التي تظهر في كشف الدرجات</span>';let anchor=$('#printHeaderBtn')||$('#logoutBtn');g.insertBefore(b,anchor);b.onclick=open}
function open(){
  let p=document.createElement('div');p.className='modal evaluation-modal';
  p.innerHTML=`<div class="modal-card"><div class="modal-head"><h2>إعدادات تقييم التلاميذ</h2><button class="x">×</button></div><label class="eval-toggle"><span>تفعيل التقييم التلقائي</span><input id="evOn" type="checkbox" ${cfg.enabled?'checked':''}></label><p class="eval-note">يظهر تقييم واحد فقط لكل تلميذ اعتمادًا على المعدل. وفي الفصل الثالث يعتمد تلقائيًا على المعدل العام السنوي.</p><div id="evBands">${cfg.bands.map((b,i)=>`<div class="eval-row"><input type="number" step="0.1" min="0" max="20" data-min="${i}" value="${b.min}"><span>إلى</span><input type="number" step="0.1" min="0" max="20" data-max="${i}" value="${b.max}"><input data-label="${i}" value="${esc(b.label)}"></div>`).join('')}</div><button class="primary action">حفظ التغييرات</button><p class="message"></p></div>`;
  document.body.appendChild(p);p.querySelector('.x').onclick=()=>p.remove();
  p.querySelector('.action').onclick=async()=>{cfg.enabled=$('#evOn').checked;cfg.bands=cfg.bands.map((old,i)=>({min:Number(p.querySelector(`[data-min="${i}"]`).value),max:Number(p.querySelector(`[data-max="${i}"]`).value),label:p.querySelector(`[data-label="${i}"]`).value.trim(),labelFr:old.labelFr||FR[p.querySelector(`[data-label="${i}"]`).value.trim()]||''})).sort((a,b)=>a.min-b.min);let m=p.querySelector('.message');if(cfg.bands.some((b,i)=>b.min<0||b.max>20||b.max<=b.min||(i&&b.min<cfg.bands[i-1].max))){m.textContent='راجع الحدود: يجب أن تكون مرتبة وغير متداخلة بين 0 و20';return}m.textContent='جارٍ الحفظ...';try{await saveCfg();m.textContent='✓ تم حفظ سلم التقييم';apply();setTimeout(()=>p.remove(),500)}catch{m.textContent='تعذر الحفظ'}}
}
let css=document.createElement('style');css.textContent=`.evaluation-modal .modal-card{max-width:560px}.eval-toggle{display:flex!important;flex-direction:row!important;align-items:center;justify-content:space-between;font-weight:700}.eval-toggle input{width:22px!important;height:22px!important}.eval-note{font-size:13px;color:#607284}.eval-row{display:grid;grid-template-columns:80px 28px 80px 1fr;gap:7px;align-items:center;margin:8px 0}.eval-row input{min-width:0}.eval-row span{text-align:center}.student-evaluation-cell{position:relative!important;text-align:center!important;vertical-align:middle!important;padding:0!important}.student-evaluation-cell span{display:inline-block;font-weight:800;font-size:1.12em;letter-spacing:.02em;white-space:nowrap;transform:rotate(-90deg)}@media(max-width:560px){.eval-row{grid-template-columns:64px 24px 64px 1fr;gap:5px}.eval-row input{padding:9px 5px!important;font-size:12px!important}}@media print{.student-evaluation-cell{vertical-align:middle!important;text-align:center!important}.student-evaluation-cell span{font-size:10pt!important;font-weight:800!important;transform:rotate(-90deg)!important}}`;document.head.appendChild(css);
window.addEventListener('DOMContentLoaded',async()=>{await load();settings();const schedule=()=>setTimeout(apply,0);let show=$('#showResult');if(show)show.addEventListener('click',schedule);let stu=$('#student');if(stu)stu.addEventListener('change',schedule);const s=$('#sheet'),c=$('#paperResults');if(s)new MutationObserver(schedule).observe(s,{childList:true,subtree:true});if(c)new MutationObserver(schedule).observe(c,{childList:true,subtree:true});document.addEventListener('click',e=>{if(e.target.closest?.('#langSwitch'))setTimeout(apply,80)},true);setTimeout(()=>{settings();apply()},600)});
})();
