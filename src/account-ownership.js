export function ownedSchoolIdsForDeletion(user){
 const baseRole=String(user?.baseRole||user?.role||'');
 if(!['owner','admin'].includes(baseRole))return[];
 const explicit=Array.isArray(user?.ownedSchoolIds)?user.ownedSchoolIds.map(String).filter(Boolean):[];
 if(explicit.length)return[...new Set(explicit)];
 const fallback=String(user?.schoolId||'').trim();
 return fallback?[fallback]:[];
}
