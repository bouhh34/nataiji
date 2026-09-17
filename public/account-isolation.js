(()=>{
'use strict';
let lastSessionUser=localStorage.getItem('nataiji-active-user');
const baseNormalize=normalizeState;
const clone=x=>structuredClone(x);
const local=()=>{try{return JSON.parse(localStorage.getItem('nataiji-data')||'null')}catch{return null}};
const richerPupil=(server,localP)=>{const A=Array.isArray(server)?server:[],B=Array.isArray(localP)?localP:[],out=[];for(let i=0;i<Math.max(A.length,B.length,7);i++)out[i]=(B[i]!==undefined&&B[i]!==null&&B[i]!=='')?B[i]:(A[i]??'');return out};
const mergePupils=(server,localRows)=>{const a=Array.isArray(server)?server:[],b=Array.isArray(localRows)?localRows:[],byNns=new Map(b.map(p=>[String(p?.[0]??''),p]));const seen=new Set();const out=a.map(p=>{const k=String(p?.[0]??'');seen.add(k);return richerPupil(p,byNns.get(k))});for(const p of b){const k=String(p?.[0]??'');if(k&&!seen.has(k))out.push(clone(p))}return out};
const preferLocal=(merged,L,key)=>{if(L&&Object.prototype.hasOwnProperty.call(L,key)&&L[key]!==undefined&&L[key]!==null&&L[key]!=='')merged[key]=clone(L[key])};
normalizeState=function(serverState){
  if(serverState&&typeof serverState==='object'){
    const incoming=serverState,L=local(),seed=clone(DEFAULT),merged={...seed,...incoming};
    const sameUser=!currentUser?.id||!lastSessionUser||lastSessionUser===currentUser.id;
    const activeId=incoming.activeClassId||L?.activeClassId;
    const active=incoming.classData&&activeId?incoming.classData[activeId]:null;
    const localActive=sameUser&&L?.classData&&activeId?L.classData[activeId]:null;
    const topPupils=Array.isArray(incoming.pupils)?incoming.pupils:[];
    const classPupils=Array.isArray(active?.pupils)?active.pupils:[];
    const localPupils=sameUser?(Array.isArray(localActive?.pupils)?localActive.pupils:(Array.isArray(L?.pupils)?L.pupils:[])):[];
    merged.pupils=mergePupils(topPupils.length?topPupils:classPupils,localPupils);
    const topSubjects=Array.isArray(incoming.subjects)?incoming.subjects:[];
    const classSubjects=Array.isArray(active?.subjects)?active.subjects:[];
    const localSubjects=sameUser?(Array.isArray(localActive?.subjects)?localActive.subjects:(Array.isArray(L?.subjects)?L.subjects:[])):[];
    merged.subjects=localSubjects.length?clone(localSubjects):(topSubjects.length?topSubjects:clone(classSubjects.length?classSubjects:DEFAULT.subjects));
    merged.marks=Array.isArray(incoming.marks)?incoming.marks:(Array.isArray(active?.marksByTerm?.[incoming.term])?clone(active.marksByTerm[incoming.term]):[]);
    if(sameUser&&L){['school','schoolFr','region','regionFr','inspection','inspectionFr','className','classNameFr','year'].forEach(k=>preferLocal(merged,L,k));}
    if(activeId){merged.classData=merged.classData&&typeof merged.classData==='object'?merged.classData:{};const d=merged.classData[activeId]||(merged.classData[activeId]={});d.pupils=clone(merged.pupils);d.subjects=clone(merged.subjects);if(sameUser&&localActive?.marksByTerm)d.marksByTerm={...(d.marksByTerm||{}),...clone(localActive.marksByTerm)}}
    localStorage.setItem('nataiji-data',JSON.stringify(merged));
    return merged;
  }
  return baseNormalize(serverState);
};
const baseStart=startApp;
startApp=async function(...args){
  const id=currentUser?.id||'';
  if(id&&lastSessionUser&&lastSessionUser!==id)localStorage.removeItem('nataiji-data');
  if(id){localStorage.setItem('nataiji-active-user',id);lastSessionUser=id}
  const result=await baseStart(...args);
  if(id){localStorage.setItem('nataiji-data',JSON.stringify(state));try{await save(true)}catch{}}
  return result;
};
})();
