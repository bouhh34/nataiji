export function importedPupilRows(input,existing){
 if(!Array.isArray(input)||!input.length||input.length>800)throw new Error('invalid_import');
 if(existing.length+input.length>800)throw new Error('class_capacity');
 const used=new Set(existing.map(p=>Number(p?.[5])).filter(n=>Number.isInteger(n)&&n>0));
 let call=1;
 return input.map(row=>{
  const name=String(row?.name||'').trim(),nameFr=String(row?.nameFr||'').trim();
  if(!name||!nameFr||name.length>160||nameFr.length>160)throw new Error('invalid_import');
  while(used.has(call))call++;used.add(call);
  return['',name,'','',nameFr,call++,'',''];
 });
}
