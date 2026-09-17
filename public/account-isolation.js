(()=>{
'use strict';
if(window.__nataijiAccountIsolation)return;
window.__nataijiAccountIsolation=true;
let lastSessionUser=localStorage.getItem('nataiji-active-user');
const baseStart=startApp;
startApp=async function(...args){
  const id=currentUser?.id||'';
  if(id&&lastSessionUser&&lastSessionUser!==id){localStorage.removeItem('nataiji-data');localStorage.removeItem('nataiji-ui-state-v1')}
  if(id){localStorage.setItem('nataiji-active-user',id);lastSessionUser=id}
  return await baseStart(...args);
};
})();