/* Shared, non-destructive Arabic/French input helpers for both school and professor routes. */
((scope)=>{
 'use strict';
 const normLatin=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const countWords={واحد:'1',واحدة:'1',اثنان:'2',اثنين:'2',اثنتان:'2',اثنتين:'2',اثنانِ:'2',ثلاثة:'3',ثلاث:'3',اربعة:'4',أربعة:'4',أربع:'4',خمسة:'5',خمس:'5',ستة:'6',ست:'6',سبعة:'7',سبع:'7',ثمانية:'8',ثمان:'8',تسعة:'9',تسع:'9',عشرة:'10',عشر:'10'};
 const decimalDigits=text=>String(text||'').replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-0x6f0));
 function schoolToFr(value,transliterate){
  const raw=String(value||'').trim(),convert=typeof transliterate==='function'?transliterate:x=>x;
  if(!raw)return'';
  const match=raw.match(/^(المدرسة|مدرسة|الإعدادية|الاعدادية|إعدادية|اعدادية|الثانوية|ثانوية)(?=\s|$)/u);
  if(!match)return convert(raw);
  const prefix=/مدرسة/.test(match[1])?'École':/عدادية/.test(match[1])?'Collège':'Lycée';
  const rest=raw.slice(match[0].length).trim();
  if(!rest)return prefix;
  const no=rest.match(/^(?:(?:رقم|النمرة|نمرة|نمره)\s+)?([\d٠-٩۰-۹]+|[\u0621-\u064A]+)(?:\s+(.+))?$/u);
  if(no&&(/^[\d٠-٩۰-۹]+$/.test(no[1])||countWords[no[1]])){
   const numeric=countWords[no[1]]||decimalDigits(no[1]);
   const remainder=no[2]?convert(no[2]):'';
   return prefix+' n° '+numeric+(remainder?' '+remainder:'');
  }
  return prefix+' '+convert(rest);
 }
 function bindPair({ar,fr,toFr,toAr,regenerateLabel='إعادة التوليد من العربية / Régénérer depuis l’arabe'}){
  if(!ar||!fr)return;
  const forward=typeof toFr==='function'?toFr:v=>v;
  const reverse=typeof toAr==='function'?toAr:v=>v;
  let arManual=!!ar.value.trim();
  let frManual=!!fr.value.trim()&&fr.value.trim()!==String(forward(ar.value)||'').trim();
  if(ar.value.trim()&&!fr.value.trim())fr.value=forward(ar.value);
  else if(fr.value.trim()&&!ar.value.trim())ar.value=reverse(fr.value);
  ar.addEventListener('input',()=>{
   arManual=!!ar.value.trim();
   if(!frManual)fr.value=forward(ar.value);
  });
  fr.addEventListener('input',()=>{
   frManual=!!fr.value.trim();
   if(!frManual&&ar.value.trim())fr.value=forward(ar.value);
   else if(!arManual)ar.value=reverse(fr.value);
  });
  const button=fr.ownerDocument.createElement('button');
  button.type='button';button.className='nataiji-bi-regenerate';
  button.style.cssText='display:block;margin:5px 0;padding:5px 9px;border:1px solid #ccd6df;border-radius:8px;background:#fff;color:#255674;font-size:12px;cursor:pointer;max-width:100%;white-space:normal';
  button.textContent=regenerateLabel;
  button.addEventListener('click',()=>{frManual=false;fr.value=forward(ar.value);fr.dispatchEvent(new Event('change',{bubbles:true}))});
  fr.parentNode?.appendChild(button);
  return{regenerate:()=>button.click()};
 }
 function levenshtein(a,b){
  const prev=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){let before=prev[0];prev[0]=i;for(let j=1;j<=b.length;j++){const old=prev[j];prev[j]=Math.min(prev[j]+1,prev[j-1]+1,before+(a[i-1]===b[j-1]?0:1));before=old}}
  return prev[b.length];
 }
 function namePairMismatch(ar,fr,toFr){
  if(!String(ar||'').trim()||!String(fr||'').trim()||typeof toFr!=='function')return false;
  const expected=normLatin(toFr(ar)).split(' ').filter(Boolean),actual=normLatin(fr).split(' ').filter(Boolean);
  if(!expected.length||!actual.length)return false;
  if(Math.abs(expected.length-actual.length)>=2)return true;
  if(expected.length!==actual.length)return false; // compound Arabic names may form one French word
  return expected.some((word,i)=>{
   const other=actual[i];if(word.length<3||other.length<3)return false;
   return 1-levenshtein(word,other)/Math.max(word.length,other.length)<0.40;
  });
 }
 scope.nataijiBilingualUtils={schoolToFr,bindPair,namePairMismatch};
})(typeof window!=='undefined'?window:globalThis);
