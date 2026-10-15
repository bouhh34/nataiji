// Pure, non-destructive state operations shared by collaboration endpoints.
export function preserveArchivedAssignments(before, candidate) {
 const next=structuredClone(candidate);
 for(const cls of next.classes){const old=before.classes.find(c=>c.id===cls.id);if(old?.sharedClassId)cls.sharedClassId=old.sharedClassId;}
 for(const a of next.assignments) a.archived=!!before.assignments.find(x=>x.id===a.id)?.archived;
 for(const a of before.assignments.filter(x=>x.archived)){
  const cls=before.classes.find(c=>c.id===a.classId);
  if(cls&&!next.classes.some(c=>c.id===cls.id))next.classes.push(structuredClone(cls));
  const i=next.assignments.findIndex(x=>x.id===a.id);
  if(i<0)next.assignments.push(structuredClone(a));else next.assignments[i]=structuredClone(a);
  next.marks[a.id]=structuredClone(before.marks[a.id]||{});
 }
 return next;
}
export function snapshotDepartingResults(room,profile,userId,sharedClassId){
 const next=structuredClone(room||{}),classIds=new Set(profile.classes.filter(c=>c.sharedClassId===sharedClassId).map(c=>c.id));
 next.resultArchives=Array.isArray(next.resultArchives)?next.resultArchives:[];
 for(const a of profile.assignments.filter(a=>classIds.has(a.classId))){
  const key=String(userId)+':'+a.id,entry={key,userId:String(userId),assignment:structuredClone(a),marks:structuredClone(profile.marks[a.id]||{})};
  const i=next.resultArchives.findIndex(x=>x.key===key);if(i<0)next.resultArchives.push(entry);else next.resultArchives[i]=entry;
 }
 return next;
}
