import {planPupilCopy} from './pupil-roster-tools.js';
export function normalizeAcademicYear(value){
 const s=String(value??'').trim().replace(/\s*[-/]\s*/g,'-');
 if(!/^\d{4}-\d{4}$/.test(s))throw Error('invalid_academic_year');
 const a=Number(s.slice(0,4)),b=Number(s.slice(5,9));
 if(a<2000||a>2100||b!==a+1)throw Error('invalid_academic_year');
 return s;
}
export function academicYearNext(value){
 const s=normalizeAcademicYear(value);
 return String(Number(s.slice(0,4))+1)+'-'+String(Number(s.slice(5,9))+1);
}
export function planNextYearRoster(archivedRows,existingRows,selectedKeys,createId){
 const source=archivedRows.map(p=>({nns:String(p.nns),data:p.data,position:p.position}));
 if(source.some(x=>!Array.isArray(x.data)||!x.nns))throw Error('invalid_archived_pupil');
 const prior=existingRows.map(x=>({nns:String(x.nns),data:x.data}));
 const output=planPupilCopy(source,prior,selectedKeys,createId);
 return {selected:selectedKeys.length,copies:output.copies,skipped:output.skipped};
}
