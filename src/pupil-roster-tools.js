// Classroom roster operations never alter stored marks or the source roster.
export function normPupilName(value){
 return String(value||'').trim().normalize('NFKC').replace(/\s+/g,' ').toLocaleLowerCase();
}
export function nextFreeCall(used){
 let n=1;while(used.has(n))n++;return n;
}
export function repairCalls(rows){
 const used=new Set(),changes=[],needs=[];
 for(const row of rows){
  const n=Number(row?.data?.[5]);
  if(Number.isInteger(n)&&n>=1&&n<=9999&&!used.has(n))used.add(n);
  else needs.push(row);
 }
 for(const row of needs){
  const call=nextFreeCall(used);if(call>9999)throw Error('roster_capacity');
  used.add(call);changes.push({key:String(row.nns),old:row.data?.[5],call});
 }
 return changes;
}
export function planPupilCopy(source,target,selectedKeys,newId){
 const keys=new Set(selectedKeys.map(String));
 if(!keys.size||keys.size>800||keys.size!==selectedKeys.length)throw Error('invalid_selection');
 const present=new Set(source.map(x=>String(x.nns)));
 if([...keys].some(key=>!present.has(key)))throw Error('pupil_not_found');
 const ids=new Set(target.map(x=>String(x.data?.[0]||'').trim()).filter(Boolean));
 const names=new Set(target.map(x=>normPupilName(x.data?.[1])).filter(Boolean));
 const usedCalls=new Set(target.map(x=>Number(x.data?.[5])).filter(n=>Number.isInteger(n)&&n>0));
 const output=[];let skipped=0;
 for(const row of source){
  if(!keys.has(String(row.nns)))continue;
  const p=structuredClone(row.data),nns=String(p?.[0]||'').trim(),name=normPupilName(p?.[1]);
  if(!name||nns&&ids.has(nns)||names.has(name)){skipped++;continue}
  if(target.length+output.length>=800)throw Error('class_capacity');
  const key=nns||'auto-'+newId();
  const call=nextFreeCall(usedCalls);if(call>9999)throw Error('class_capacity');
  usedCalls.add(call);p[5]=call;p[7]=key;output.push({nns:key,data:p});
  if(nns)ids.add(nns);names.add(name)
 }
 return{copies:output,skipped};
}
