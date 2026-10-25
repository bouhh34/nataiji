import crypto from 'node:crypto';
import {normalizeMauritaniaPhone} from './family-engagement.js';

// Optional for older clients: omission preserves the existing contact.
export function parsePupilGuardian(value) {
  if(value===undefined)return undefined;
  if(!value||typeof value.consent!=='boolean')throw Object.assign(Error('invalid_guardian'),{status:400});
  const raw=String(value.phone||'').trim().replace(/[٠-٩۰-۹]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.includes(c)?'٠١٢٣٤٥٦٧٨٩'.indexOf(c):'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
  const phone=raw?normalizeMauritaniaPhone(raw):'';
  if(raw&&!phone)throw Object.assign(Error('invalid_guardian_phone'),{status:400});
  if(!phone&&value.consent)throw Object.assign(Error('guardian_phone_required'),{status:400});
  return {phone,consent:!!phone&&value.consent};
}

// Called inside the pupil transaction, before any edits. No migration or data removal.
export async function backupPupil(client,schoolId,classId,key) {
  const scope='school:'+schoolId;
  const pupil=await client.query('SELECT * FROM nataiji_pupils WHERE school_id=$1 AND class_id=$2 AND nns=$3 FOR UPDATE',[schoolId,classId,key]);
  if(!pupil.rowCount)return;
  const marks=await client.query('SELECT * FROM nataiji_marks WHERE school_id=$1 AND class_id=$2 AND pupil_key=$3',[schoolId,classId,key]);
  const contacts=await client.query('SELECT * FROM nataiji_family_contacts WHERE actor_id=$1 AND class_id=$2 AND student_key=$3',[scope,classId,key]);
  const records=await client.query('SELECT * FROM nataiji_family_records WHERE contact_scope=$1 AND contact_class_id=$2 AND student_key=$3',[scope,classId,key]);
  await client.query('INSERT INTO kv_store(key,value) VALUES($1,$2)',[
    'pupil-edit-backup:'+schoolId+':'+crypto.randomUUID(),
    JSON.stringify({pupils:pupil.rows,marks:marks.rows,contacts:contacts.rows,records:records.rows})
  ]);
}

export async function savePupilGuardian(client,{schoolId,classId,oldKey,key,guardian}) {
  const scope='school:'+schoolId;
  if(oldKey&&oldKey!==key){
    // Never attach an orphaned destination contact to a different pupil.
    const collision=await client.query('SELECT 1 FROM nataiji_family_contacts WHERE actor_id=$1 AND class_id=$2 AND student_key=$3',[scope,classId,key]);
    if(collision.rowCount)throw Object.assign(Error('guardian_key_conflict'),{status:409});
    await client.query('UPDATE nataiji_family_contacts SET student_key=$4,updated_at=now() WHERE actor_id=$1 AND class_id=$2 AND student_key=$3',[scope,classId,oldKey,key]);
    await client.query('UPDATE nataiji_family_records SET student_key=$4 WHERE contact_scope=$1 AND contact_class_id=$2 AND student_key=$3',[scope,classId,oldKey,key]);
  }
  if(guardian===undefined)return;
  await client.query(`INSERT INTO nataiji_family_contacts(actor_id,class_id,student_key,phone,consent,updated_at)
    VALUES($1,$2,$3,$4,$5,now()) ON CONFLICT(actor_id,class_id,student_key)
    DO UPDATE SET phone=EXCLUDED.phone,consent=EXCLUDED.consent,updated_at=now()`,[scope,classId,key,guardian.phone,guardian.consent]);
  await client.query("UPDATE nataiji_family_records SET status='cancelled',guardian_phone='' WHERE contact_scope=$1 AND contact_class_id=$2 AND student_key=$3 AND (guardian_phone<>$4 OR $5=false) AND status IN ('pending','opened')",[scope,classId,key,guardian.phone,guardian.consent]);
}
