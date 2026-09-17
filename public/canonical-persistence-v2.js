(()=>{
'use strict';
if(window.__nataijiCanonicalPersistenceV2)return;window.__nataijiCanonicalPersistenceV2=true;
const clone=x=>structuredClone(x);
const classTranslations={
'السنة الأولى ابتدائية':'1ère année fondamentale','السنة الأولى إبتدائية':'1ère année fondamentale','السنة الأولى ابتدائي':'1ère année fondamentale',
'السنة الثانية ابتدائية':'2ème année fondamentale','السنة الثانية إبتدائية':'2ème année fondamentale','السنة الثانية ابتدائي':'2ème année fondamentale',
'السنة الثالثة ابتدائية':'3ème année fondamentale','السنة الثالثة إبتدائية':'3ème année fondamentale','السنة الثالثة ابتدائي':'3ème année fondamentale',
'السنة الرابعة ابتدائية':'4ème année fondamentale','السنة الرابعة إبتدائية':'4ème année fondamentale','السنة الرابعة ابتدائي':'4ème année fondamentale',
'السنة الخامسة ابتدائية':'5ème année fondamentale','السنة الخامسة إبتدائية':'5ème année fondamentale','السنة الخامسة ابتدائي':'5ème année fondamentale',
'السنة السادسة ابتدائية':'6ème année fondamentale','السنة السادسة إبتدائية':'6ème année fondamentale','السنة السادسة ابتدائي':'6ème année fondamentale'
};
function translateClass(v){let out=String(v||'').trim();for(const [ar,fr] of Object.entries(classTranslations).sort((a,b)=>b[0].length-a[0].length)){if(out.includes(ar))return out.replace(ar,fr)}return ''}
function canonicalize(){if(typeof state==='undefined'||!state)return;state.pupils=Array.isArray(state.pupils)?state.pupils.map((p,i)=>{const r=Array.isArray(p)?[...p]:[];while(r.length<7)r.push('');r[0]=String(r[0]??'').trim();r[1]=String(r[1]??'').trim();r[4]=String(r[4]??'').trim();const n=Number(r[5]);r[5]=Number.isInteger(n)&&n>0?n:i+1;return r}):[];
if(!state.classNameFr||/Alsna|Abtdai|Ibtidai/i.test(state.classNameFr)){const fr=translateClass(state.className);if(fr)state.classNameFr=fr}
if(state.activeClassId&&state.classData){const d=state.classData[state.activeClassId]||(state.classData[state.activeClassId]={});d.pupils=clone(state.pupils);d.subjects=clone(state.subjects||[]);d.marksByTerm=d.marksByTerm&&typeof d.marksByTerm==='object'?d.marksByTerm:{};if(state.term)d.marksByTerm[state.term]=clone(state.marks||[])}
const c=(state.classes||[]).find(x=>x.id===state.activeClassId);if(c){c.name=state.className||c.name;c.nameFr=state.classNameFr||translateClass(c.name)||c.nameFr||''}
}
const baseSave=window.save||save;
save=async function(...args){canonicalize();localStorage.setItem('nataiji-data',JSON.stringify(state));const result=await baseSave.apply(this,args);canonicalize();localStorage.setItem('nataiji-data',JSON.stringify(state));return result};
const baseStart=window.startApp||startApp;
startApp=async function(...args){const result=await baseStart.apply(this,args);canonicalize();localStorage.setItem('nataiji-data',JSON.stringify(state));return result};
window.nataijiTranslateClass=translateClass;
})();