import { PATIENT_DEMOGRAPHICS, readClinicalPatient } from '../lib/clinicalRecords';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import useSupabaseQuery from '../hooks/useSupabaseQuery';
import { unwrap } from '../lib/supabaseErrors';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Loading';
import OdontogramWorkspace from '../components/odontogram/OdontogramWorkspace';
import { dmft, normalize } from '../lib/odontogram';
import '../styles/clinic-pages.css';

const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'P';

export default function ClinicOdontograma() {
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [recordId,setRecordId] = useState('legacy');
  const [search, setSearch] = useState('');

  const patientsQuery = useSupabaseQuery(
    (signal) => supabase.from('pacientes').select(PATIENT_DEMOGRAPHICS).order('nombre', { ascending: true }).abortSignal(signal).then(unwrap),
    { key: `${profile?.clinic_id}:${profile?.id}`, enabled: !!profile?.clinic_id }
  );
  const patients = patientsQuery.data ?? [];
  const selectedId = params.get('paciente');
  const selected = patients.find((p) => p.id === selectedId) || patients[0] || null;

  useEffect(() => {
    if (selected && selected.id !== selectedId) setParams((prev) => { const n = new URLSearchParams(prev); n.set('paciente', selected.id); return n; }, { replace: true });
  }, [selected, selectedId, setParams]);

  const records=useSupabaseQuery(signal=>supabase.from('patient_clinical_records').select('id,doctor_id,content,updated_at').eq('patient_id',selected.id).abortSignal(signal).then(unwrap),{key:selected?.id,enabled:!!selected && profile?.role==='clinic_admin'});
  useEffect(()=>setRecordId('legacy'),[selected?.id]);
  const selectedRecord=records.data?.find(r=>r.id===recordId);
  const clinical = useSupabaseQuery(signal => readClinicalPatient(profile, selected, signal), { key: `${profile?.id}:${selected?.id}`, enabled: !!selected });

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    if (!term) return patients;
    return patients.filter((p) => [p.nombre, p.dni].some((v) => String(v || '').toLocaleLowerCase('es').includes(term)));
  }, [patients, search]);

  if (patientsQuery.isLoading || patientsQuery.status === 'idle') {
    return (
      <div className="clinic-page-container sd-page-skeleton" role="status" aria-label="Cargando odontograma">
        <Skeleton h={64} r={18} />
        <Skeleton h={480} r={22} />
      </div>
    );
  }
  if (patientsQuery.isError && !patientsQuery.data) {
    return <div className="clinic-page-container"><ErrorState error={patientsQuery.error} onRetry={patientsQuery.refetch} title="No se pudo cargar el odontograma" /></div>;
  }
  if (patientsQuery.isEmpty) {
    return <div className="clinic-page-container"><EmptyState title="Aún no hay pacientes" description="El odontograma se guarda en la ficha de cada paciente. Registra un paciente para empezar." /></div>;
  }

  const choose = (id) => setParams((prev) => { const n = new URLSearchParams(prev); n.set('paciente', id); return n; });

  return (
    <div className="clinic-page-container cp-odo-page">
      <aside className="cp-patient-rail" aria-label="Pacientes">
        <div className="cp-rail-search">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
          <label className="sd-sr-only" htmlFor="odo-patient-search">Buscar paciente</label>
          <input id="odo-patient-search" type="search" placeholder="Buscar paciente o DNI" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <ul className="cp-rail-list">
          {filtered.map((p) => {
            const idx = dmft(normalize(p.historial_odontograma), 'permanent');
            const active = selected?.id === p.id;
            return (
              <li key={p.id}>
                <button type="button" className={`cp-rail-item ${active ? 'is-active' : ''}`} aria-current={active ? 'true' : undefined} onClick={() => choose(p.id)}>
                  <span className="cp-avatar" aria-hidden="true">{initials(p.nombre)}</span>
                  <span className="cp-rail-item__text"><strong>{p.nombre}</strong><small>{p.dni ? `DNI ${p.dni}` : 'Sin documento'}</small></span>
                  {idx.total > 0 && <span className="cp-rail-item__badge" title="Índice CPO-D">{idx.total}</span>}
                </button>
              </li>
            );
          })}
          {!filtered.length && <li className="cp-rail-empty">Sin coincidencias para “{search}”.</li>}
        </ul>
      </aside>

      <div className="cp-odo-main">
        {selected && (
          <>
            <header className="cp-odo-head">
              <span className="cp-avatar is-lg" aria-hidden="true">{initials(selected.nombre)}</span>
              <div>
                <span className="odo-kicker">Odontograma · Notación FDI</span>
                <h2>{selected.nombre}</h2>
                <p>{selected.dni ? `DNI ${selected.dni}` : 'Sin documento registrado'}</p>
              </div>
            </header>
            {profile?.role==='clinic_admin' && <label className="cp-field"><span>Historial clínico</span><select value={recordId} onChange={e=>setRecordId(e.target.value)}><option value="legacy">Archivo general anterior</option>{(records.data || []).map(r=><option key={r.id} value={r.id}>Profesional {r.doctor_id.slice(0,8)} · {new Date(r.updated_at).toLocaleDateString('es-PE')}</option>)}</select></label>}
            {records.isError && <ErrorState error={records.error} onRetry={records.refetch}/>}
            {clinical.isLoading ? <Skeleton h={400} /> : clinical.isError ? <ErrorState error={clinical.error} onRetry={clinical.refetch} /> : clinical.data ? <OdontogramWorkspace
              key={`${selected.id}:${recordId}`}
              patient={selectedRecord ? {...selected,...selectedRecord.content,id:selected.id,clinical_record_id:selectedRecord.id,clinical_content:selectedRecord.content} : clinical.data}
              author={profile?.nombre_completo || profile?.email}
              onSaved={() => {clinical.refetch();records.refetch();}}
            /> : null}
          </>
        )}
      </div>
    </div>
  );
}
