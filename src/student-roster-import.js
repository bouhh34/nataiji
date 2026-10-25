// A single reviewed import row is also the source of its optional student identity.
// Guardian phone/consent are validated and saved atomically by the HTTP route.
export function importedPupilRows(input,existing){
 if(!Array.isArray(input)||!input.length||input.length>800)throw new Error('invalid_import');
 if(existing.length+input.length>800)throw new Error('class_capacity');
 const usedCalls=new Set(existing.map(p=>Number(p?.[5])).filter(n=>Number.isInteger(n)&&n>0));
 const usedNns=new Set(existing.map(p=>String(p?.[0]||'').trim()).filter(Boolean));
 let call=1;
 return input.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item))throw new Error('invalid_import');
  const name=String(item.name||'').trim(),nameFr=String(item.nameFr||'').trim(),
    nns=String(item.nns||'').trim(),sex=String(item.sex||'').trim(),
    dob=String(item.birthDate||'').trim();
  if(!name||!nameFr||name.length>160||nameFr.length>160||nns.length>80)throw new Error('invalid_import');
  if(nns&&usedNns.has(nns))throw new Error('invalid_import');
  if(nns)usedNns.add(nns);
  const mappedSex=/^(female|f|fille|أنثى)$/i.test(sex)?'أنثى':/^(male|m|gar[cç]on|ذكر)$/i.test(sex)?'ذكر':'';
  if(sex&&!mappedSex)throw new Error('invalid_import');
  if(dob&&(!/^\d{4}-\d{2}-\d{2}$/.test(dob)||Number.isNaN(Date.parse(dob))||new Date(dob).toISOString().slice(0,10)!==dob))throw new Error('invalid_import');
  while(usedCalls.has(call))call++;
  usedCalls.add(call);
  return[nns,name,mappedSex,dob,nameFr,call++,'',''];
 });
}
