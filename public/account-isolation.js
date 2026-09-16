(()=>{
'use strict';
let lastSessionUser=localStorage.getItem('nataiji-active-user');
const baseNormalize=normalizeState;
normalizeState=function(serverState){
  if(serverState&&typeof serverState==='object'){
    const incoming=serverState,seed=structuredClone(DEFAULT),merged={...seed,...incoming};
    merged.subjects=Array.isArray(incoming.subjects)?incoming.subjects:structuredClone(DEFAULT.subjects);
    merged.pupils=Array.isArray(incoming.pupils)?incoming.pupils:[];
    merged.marks=Array.isArray(incoming.marks)?incoming.marks:[];
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
