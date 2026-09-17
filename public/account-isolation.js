(()=>{
'use strict';
let lastSessionUser=localStorage.getItem('nataiji-active-user');
const baseNormalize=normalizeState;
const clone=x=>structuredClone(x);
const richerPupil=(a,b)=>{const A=Array.isArray(a)?a:[],B=Array.isArray(b)?b:[];const out=[];for(let i=0;i<Math.max(A.length,B.length,7);i++)out[i]=(B[i]!==undefined&&B[i]!==null&&B[i]!=='')?B[i]:(A[i]??'');return out};
const mergePupils=(primary,secondary)=>{const a=Array.isArray(primary)?primary:[],b=Array.isArray(secondary)?secondary:[],byNns=new Map(b.map(p=>[String(p?.[0]??''),p]));return a.map(p=>richerPupil(p,byNns.get(String(p?.[0]??''))));};
normalizeState=function(serverState){
  if(serverState&&typeof serverState==='object'){
    const incoming=serverState,seed=clone(DEFAULT),merged={...seed,...incoming};
    const activeId=incoming.activeClassId;
    const active=incoming.classData&&activeId?incoming.classData[activeId]:null;
    const topPupils=Array.isArray(incoming.pupils)?incoming.pupils:[];
    const classPupils=Array.isArray(active?.pupils)?active.pupils:[];
    merged.pupils=mergePupils(topPupils,classPupils);
    if(!merged.pupils.length)merged.pupils=clone(classPupils);
    const topSubjects=Array.isArray(incoming.subjects)?incoming.subjects:[];
    const classSubjects=Array.isArray(active?.subjects)?active.subjects:[];
    merged.subjects=topSubjects.length?topSubjects:clone(classSubjects.length?classSubjects:DEFAULT.subjects);
    merged.marks=Array.isArray(incoming.marks)?incoming.marks:(Array.isArray(active?.marksByTerm?.[incoming.term])?clone(active.marksByTerm[incoming.term]):[]);
    if(activeId){
      merged.classData=merged.classData&&typeof merged.classData==='object'?merged.classData:{};
      const d=merged.classData[activeId]||(merged.classData[activeId]={});
      d.pupils=clone(merged.pupils);
      d.subjects=clone(merged.subjects);
    }
    return merged;
  }
  return baseNormalize(serverState);
};
const baseStart=startApp;
startApp=async function(...args){
  const id=currentUser?.id||'';
  if(id&&lastSessionUser!==id){
    localStorage.removeItem('nataiji-data');
    localStorage.setItem('nataiji-active-user',id);
  }
  if(id)lastSessionUser=id;
  return baseStart(...args);
};
})();
