import { supabase } from './supabaseClient';
import { unwrap } from './supabaseErrors';
const clinicalFields = content => Object.fromEntries(['tratamiento','alergias','historial_odontograma'].filter(key=>Object.hasOwn(content || {},key)).map(key=>[key,content[key]]));
export const PATIENT_DEMOGRAPHICS = 'id,clinic_id,nombre,dni,telefono,email,created_at,updated_at';
/** Clinical context is scoped to its treating professional, never inferred from a shared patient row. */
export async function readClinicalPatient(profile, patient, signal) {
  if (profile.role === 'clinic_admin') {
    const content = unwrap(await supabase.rpc('read_patient_legacy', { p_patient_id: patient.id }).abortSignal(signal));
    return { ...patient, ...clinicalFields(content), clinical_content: content || {}, clinical_scope: 'legacy' };
  }
  if (profile.assistant_role !== 'odontologo') throw new Error('No tienes acceso a información clínica.');
  const authorized = unwrap(await supabase.from('pacientes').select('id').eq('id',patient.id).maybeSingle().abortSignal(signal));
  if (!authorized) throw new Error('Este paciente ya no está asignado a tu atención.');
  const record = unwrap(await supabase.from('patient_clinical_records').select('id,content').eq('patient_id',patient.id).eq('doctor_id',profile.id).order('updated_at',{ascending:false}).limit(1).maybeSingle().abortSignal(signal));
  return { ...patient, ...clinicalFields(record?.content), clinical_record_id: record?.id, clinical_content: record?.content || {}, clinical_scope: 'professional' };
}
export async function writeClinicalPatient(profile,patient,patch) {
  const content = { ...(patient.clinical_content || {}), ...patch };
  if(profile.role === 'clinic_admin' && !patient.clinical_record_id) {
    const result=unwrap(await supabase.rpc('write_patient_legacy',{p_patient_id:patient.id,p_content:content}));
    if(!result)throw new Error('No se confirmó el guardado de la información clínica.');
    return [{id:patient.id}];
  }
  if(profile.role !== 'clinic_admin' && profile.assistant_role !== 'odontologo')throw new Error('No tienes permiso para modificar información clínica.');
  const row={clinic_id:profile.clinic_id,patient_id:patient.id,doctor_id:profile.id,content,updated_at:new Date().toISOString()};
  return unwrap(await (patient.clinical_record_id ? supabase.from('patient_clinical_records').update({content,updated_at:row.updated_at}).eq('id',patient.clinical_record_id) : supabase.from('patient_clinical_records').insert(row)).select('id'));
}
