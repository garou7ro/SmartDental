import { PATIENT_DEMOGRAPHICS, readClinicalPatient, writeClinicalPatient } from '../lib/clinicalRecords';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { sileo } from 'sileo';
import useSupabaseQuery from '../hooks/useSupabaseQuery';
import useAsyncAction from '../hooks/useAsyncAction';
import { unwrap } from '../lib/supabaseErrors';
import { ButtonLabel, EmptyState, ErrorState, LoadingBar, SkeletonCards, SkeletonList } from '../components/ui/Loading';
import Dialog from '../components/ui/Dialog';
import OdontogramWorkspace from '../components/odontogram/OdontogramWorkspace';
import { dmft, normalize, summarize } from '../lib/odontogram';
import { BrandIcon } from '../components/icons/BrandIcons';
import '../styles/clinic-pages.css';

const COMMON_TREATMENTS = [
  'Consulta general / Diagnóstico',
  'Profilaxis (limpieza)',
  'Ortodoncia',
  'Endodoncia',
  'Resina / Curación',
  'Implantología',
  'Blanqueamiento',
  'Extracción',
];
const ESTADO = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada' };
const EMPTY_FORM = { nombre: '', dni: '', telefono: '', email: '', tratamiento: '', otro: '', alergias: '' };

const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'P';
const hasAllergy = (a) => a && !/^(ninguna|no|-|n\/a)$/i.test(a.trim());
const waLink = (phone) => `https://wa.me/${String(phone || '').replace(/\D/g, '')}`;
const normalizePhone = (value) => {
  const digits = value.trim().replace(/[^\d+]/g, '');
  if (!digits) return '';
  return digits.startsWith('+') ? digits : `+51${digits.replace(/^51(?=\d{9}$)/, '')}`;
};

function PatientForm({ clinical = true, initial = EMPTY_FORM, onSubmit, pending, submitLabel, onCancel }) {
  const [form, setForm] = useState(() => {
    const known = COMMON_TREATMENTS.includes(initial.tratamiento) || !initial.tratamiento;
    return { ...EMPTY_FORM, ...initial, tratamiento: known ? (initial.tratamiento || '') : 'Otro', otro: known ? '' : initial.tratamiento };
  });
  const [error, setError] = useState(null);
  const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setError(null); };
  const submit = (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return setError('Escribe el nombre completo del paciente.');
    if (!form.telefono.trim()) return setError('El teléfono es obligatorio para contactar al paciente.');
    if (form.dni && !/^\d{8,12}$/.test(form.dni.trim())) return setError('El documento debe tener entre 8 y 12 dígitos.');
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) return setError('Revisa el correo electrónico.');
    const tratamiento = form.tratamiento === 'Otro' ? form.otro.trim() : form.tratamiento;
    onSubmit({
      nombre: form.nombre.trim(),
      dni: form.dni.trim() || null,
      telefono: normalizePhone(form.telefono),
      email: form.email.trim() || null,
      tratamiento: clinical ? tratamiento || null : null,
      alergias: clinical ? form.alergias.trim() || null : null,
    });
  };
  return (
    <form className="cp-form" onSubmit={submit} noValidate>
      <label className="cp-field cp-field--full"><span>Nombre completo *</span><input value={form.nombre} onChange={set('nombre')} autoComplete="off" placeholder="Ej.: Sofía Pérez Quispe" /></label>
      <label className="cp-field"><span>DNI</span><input value={form.dni} onChange={set('dni')} inputMode="numeric" placeholder="74829104" /></label>
      <label className="cp-field"><span>Teléfono *</span><input value={form.telefono} onChange={set('telefono')} inputMode="tel" placeholder="987 654 321" /></label>
      <label className="cp-field cp-field--full"><span>Correo</span><input type="email" value={form.email} onChange={set('email')} placeholder="paciente@correo.com" /></label>
      {clinical && <><label className="cp-field"><span>Tratamiento</span>
        <select value={form.tratamiento} onChange={set('tratamiento')}>
          <option value="">Sin asignar</option>
          {COMMON_TREATMENTS.map((t) => <option key={t} value={t}>{t}</option>)}
          <option value="Otro">Otro…</option>
        </select>
      </label>
      {form.tratamiento === 'Otro'
        ? <label className="cp-field"><span>Especifica</span><input value={form.otro} onChange={set('otro')} placeholder="Tratamiento" /></label>
        : <span className="cp-field" aria-hidden="true" />}
      <label className="cp-field cp-field--full"><span>Alergias conocidas</span><input value={form.alergias} onChange={set('alergias')} placeholder="Penicilina, látex… o Ninguna" /></label></>}
      {error && <p className="cp-form__error" role="alert">{error}</p>}
      <div className="cp-form__actions">
        {onCancel && <button type="button" className="saas-btn saas-btn-secondary" onClick={onCancel} disabled={pending}>Cancelar</button>}
        <button type="submit" className="saas-btn saas-btn-primary" disabled={pending}><ButtonLabel pending={pending}>{submitLabel}</ButtonLabel></button>
      </div>
    </form>
  );
}

function PatientAppointments({ patientId }) {
  const query = useSupabaseQuery(
    (signal) => supabase.from('citas').select('id, fecha_hora, motivo, estado, notas').eq('paciente_id', patientId).order('fecha_hora', { ascending: false }).limit(20).abortSignal(signal).then(unwrap),
    { key: patientId, enabled: !!patientId }
  );
  if (query.isLoading || query.status === 'idle') return <SkeletonList rows={3} label="Cargando citas" />;
  if (query.isError && !query.data) return <ErrorState compact error={query.error} onRetry={query.refetch} title="No se pudieron cargar las citas" />;
  if (!query.data?.length) return <EmptyState title="Sin citas registradas" description="Las citas que reserves en la agenda para este paciente aparecerán aquí." />;
  const now = Date.now();
  return (
    <ol className="cp-appts">
      {query.data.map((c) => {
        const d = new Date(c.fecha_hora);
        return (
          <li key={c.id} className={`cp-appt is-${c.estado} ${d.getTime() > now ? 'is-future' : ''}`}>
            <div className="cp-appt__date"><b>{d.getDate()}</b><span>{d.toLocaleDateString('es-PE', { month: 'short' })}</span></div>
            <div className="cp-appt__body">
              <strong>{c.motivo || 'Consulta'}</strong>
              <span>{d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
              {c.notas && <small>{c.notas}</small>}
            </div>
            <span className={`cp-pill is-${c.estado}`}>{ESTADO[c.estado] || c.estado}</span>
          </li>
        );
      })}
    </ol>
  );
}

function PatientSheet({ patient: demographic, onClose, onUpdated, canEdit, author, clinicSlug }) {
  const { profile } = useAuth();
  const clinical = useSupabaseQuery(signal => readClinicalPatient(profile, demographic, signal), { key: `${profile?.id}:${demographic.id}`, enabled: profile?.role === 'clinic_admin' || profile?.assistant_role === 'odontologo' });
  const patient = clinical.data || demographic;
  const [tab, setTab] = useState('ficha');
  const [editing, setEditing] = useState(false);
  const update = useAsyncAction(async ({ tratamiento, alergias, ...values }) => {
    const rows = unwrap(await supabase.from('pacientes').update(values).eq('id',patient.id).select(PATIENT_DEMOGRAPHICS));
    if(!rows?.length)throw new Error('No se confirmó el cambio de datos.');
    await writeClinicalPatient(profile,patient,{tratamiento,alergias});
    await clinical.refetch();
    return rows;
  });
  const odo = normalize(patient.historial_odontograma);
  const idx = dmft(odo, 'permanent');

  const save = async (values) => {
    const res = await update.run(values);
    if (res.skipped) return;
    if (!res.ok) { sileo.error({ title: 'No se pudo actualizar la ficha', description: res.error.message }); return; }
    if (!res.data?.length) { sileo.error({ title: 'No se confirmó el cambio', description: 'Tu usuario no tiene permiso para modificar esta ficha.' }); return; }
    onUpdated(res.data[0]);
    setEditing(false);
    sileo.success({ title: 'Ficha actualizada', description: `Se guardaron los datos de ${values.nombre}.` });
  };

  return (
    <Dialog label={`Ficha de ${patient.nombre}`} onClose={onClose}>
      <div className="cp-sheet">
        <header className="cp-sheet__head">
          <span className="cp-avatar is-lg" aria-hidden="true">{initials(patient.nombre)}</span>
          <div className="cp-sheet__title">
            <span className="odo-kicker">Ficha clínica</span>
            <h2>{patient.nombre}</h2>
            <p>{patient.dni ? `DNI ${patient.dni}` : 'Sin documento'} · Registrado el {new Date(patient.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <button type="button" className="cp-close" onClick={onClose} aria-label="Cerrar ficha"><BrandIcon name="close" size={18} /></button>
        </header>
        {hasAllergy(patient.alergias) && (
          <p className="cp-alert" role="note"><BrandIcon name="alert" size={18} /><span><strong>Alergia registrada:</strong> {patient.alergias}</span></p>
        )}
        <div className="cp-tabs" role="tablist" aria-label="Secciones de la ficha">
          {[['ficha', 'Datos'], ['odontograma', 'Odontograma'], ['citas', 'Citas']].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        <div className="cp-sheet__body" role="tabpanel">
          {tab === 'ficha' && (editing ? (
            <PatientForm initial={patient} onSubmit={save} pending={update.pending} submitLabel="Guardar cambios" onCancel={() => setEditing(false)} />
          ) : (
            <div className="cp-facts-wrap">{clinical.isError && <ErrorState compact error={clinical.error} onRetry={clinical.refetch} title="No se pudo cargar el registro clínico" />}<p className="wf-muted">{profile?.role === 'clinic_admin' ? 'Información administrativa histórica de la clínica. Los registros de cada profesional se conservan por separado.' : 'Solo se muestra tu registro profesional. No incluye el historial de otros médicos.'}</p>
              <dl className="cp-facts">
                <div><dt>Teléfono</dt><dd>{patient.telefono ? <a href={`tel:${patient.telefono}`}>{patient.telefono}</a> : 'Sin registrar'}</dd></div>
                <div><dt>Correo</dt><dd>{patient.email ? <a href={`mailto:${patient.email}`}>{patient.email}</a> : 'Sin registrar'}</dd></div>
                <div><dt>Tratamiento en este ámbito</dt><dd>{patient.tratamiento || 'Sin asignar'}</dd></div>
                <div><dt>Alergias</dt><dd>{patient.alergias || 'Sin registrar'}</dd></div>
                <div><dt>Odontograma</dt><dd>{summarize(odo)}</dd></div>
                <div><dt>Índice CPO-D</dt><dd>{idx.total} <small>(C {idx.decayed} · P {idx.missing} · O {idx.filled})</small></dd></div>
              </dl>
              <div className="cp-sheet__actions">
                <Link className="saas-btn saas-btn-secondary cp-wa-btn" to={`/${clinicSlug}/whatsapp`}><BrandIcon name="whatsapp" size={16} />Conversaciones de la clínica</Link>
                {canEdit && <Link className="saas-btn saas-btn-secondary" to={`/${clinicSlug}/agenda?paciente=${patient.id}`}><BrandIcon name="agenda" size={16} />Agendar cita</Link>}
                {canEdit && <button type="button" className="saas-btn saas-btn-primary" onClick={() => setEditing(true)}><BrandIcon name="edit" size={16} />Editar datos</button>}
              </div>
            </div>
          ))}
          {tab === 'odontograma' && (clinical.isLoading ? <p role="status">Cargando información autorizada…</p> : clinical.isError ? <ErrorState error={clinical.error} onRetry={clinical.refetch} /> : clinical.data ? <OdontogramWorkspace key={clinical.data.clinical_record_id || patient.id} patient={clinical.data} author={author} onSaved={() => clinical.refetch()} /> : <p>No tienes acceso clínico.</p>)}
          {tab === 'citas' && <PatientAppointments patientId={patient.id} />}
        </div>
      </div>
    </Dialog>
  );
}

export default function PatientDirectory() {
  const { profile } = useAuth();
  const { clinicSlug } = useParams();
  const [search, setSearch] = useState('');
  const [treatment, setTreatment] = useState('Todos');
  const [view, setView] = useState('cards');
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);

  const isDentist = profile?.role === 'assistant' && profile?.assistant_role === 'odontologo';
  // La edición la decide RLS en el servidor; si no hay permiso, la actualización no devuelve filas.
  const canEdit = profile?.role === 'clinic_admin';

  // Un odontólogo asistente solo ve a sus pacientes asignados (RLS también lo restringe).
  const patientsQuery = useSupabaseQuery(
    async (signal) => {
      let q = supabase.from('pacientes').select(PATIENT_DEMOGRAPHICS).order('nombre', { ascending: true });
      if (isDentist) {
        const assigned = await supabase.from('paciente_empleado').select('paciente_id').eq('empleado_id', profile.id).abortSignal(signal).then(unwrap);
        const ids = (assigned || []).map((a) => a.paciente_id);
        if (!ids.length) return [];
        q = q.in('id', ids);
      }
      return q.abortSignal(signal).then(unwrap);
    },
    { key: `${profile?.clinic_id}|${profile?.id}|${isDentist}`, enabled: !!profile?.clinic_id }
  );
  const patients = patientsQuery.data ?? [];
  const create = useAsyncAction(async ({tratamiento,alergias,...row}) => {
    const rows=unwrap(await supabase.from('pacientes').insert([row]).select(PATIENT_DEMOGRAPHICS));
    if(!rows?.length)throw new Error('No se confirmó el registro del paciente.');
    if(tratamiento || alergias)await writeClinicalPatient(profile,rows[0],{tratamiento,alergias});
    return rows;
  });

  // ?paciente=<id> abre la ficha (por ejemplo, desde el resumen).
  // ?nuevo=1 abre el registro (por ejemplo, desde la paleta de comandos). Se limpian al usarse.
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const id = params.get('paciente');
    const create = params.get('nuevo');
    if (!id && !create) return;
    if (id) setSelectedId(id);
    if (create && !isDentist) setCreating(true);
    setParams((prev) => { const n = new URLSearchParams(prev); n.delete('paciente'); n.delete('nuevo'); return n; }, { replace: true });
  }, [params, setParams, isDentist]);

  const treatments = useMemo(() => ['Todos', ...new Set(patients.map((p) => p.tratamiento).filter(Boolean))].slice(0, 8), [patients]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return patients.filter((p) => (
      (treatment === 'Todos' || p.tratamiento === treatment)
      && (!term || [p.nombre, p.dni, p.telefono, p.email].some((v) => String(v || '').toLocaleLowerCase('es').includes(term)))
    ));
  }, [patients, search, treatment]);
  const withAllergies = patients.filter((p) => hasAllergy(p.alergias)).length;
  const selected = patients.find((p) => p.id === selectedId) || null;

  const handleCreate = async (values) => {
    const res = await create.run({ ...values, clinic_id: profile.clinic_id });
    if (res.skipped) return;
    if (!res.ok) { sileo.error({ title: 'No se pudo registrar al paciente', description: res.error.message }); return; }
    sileo.success({ title: 'Paciente registrado', description: `Se creó la ficha de ${values.nombre}.` });
    setCreating(false);
    if (res.data?.[0]) {
      patientsQuery.setData((prev) => [...(prev || []), res.data[0]].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
      setSelectedId(res.data[0].id);
    } else patientsQuery.refetch();
  };
  const handleUpdated = (row) => patientsQuery.setData((prev) => (prev || []).map((p) => (p.id === row.id ? { ...p, ...row } : p)));

  return (
    <div className="clinic-page-container cp-page">
      <header className="cp-page-head">
        <div>
          <span className="odo-kicker">Pacientes</span>
          <h2>Tu directorio clínico</h2>
          <p>{patients.length} {patients.length === 1 ? 'paciente' : 'pacientes'}{withAllergies ? ` · ${withAllergies} con alergias registradas` : ''}</p>
        </div>
        {!isDentist && (
          <button type="button" className="saas-btn saas-btn-primary cp-cta" onClick={() => setCreating(true)}>
            <BrandIcon name="patientAdd" size={18} />Nuevo paciente
          </button>
        )}
      </header>

      <div className="cp-toolbar">
        <div className="cp-search">
          <BrandIcon name="search" size={17} />
          <label className="sd-sr-only" htmlFor="patient-search">Buscar paciente</label>
          <input id="patient-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, DNI, teléfono o correo" />
        </div>
        <div className="cp-chips" role="group" aria-label="Filtrar por tratamiento">
          {treatments.map((t) => (
            <button key={t} type="button" aria-pressed={treatment === t} className={treatment === t ? 'is-active' : ''} onClick={() => setTreatment(t)}>{t}</button>
          ))}
        </div>
        <div className="odo-seg" role="radiogroup" aria-label="Vista">
          <button type="button" role="radio" aria-checked={view === 'cards'} className={view === 'cards' ? 'is-active' : ''} onClick={() => setView('cards')} aria-label="Tarjetas"><BrandIcon name="grid" size={16} /></button>
          <button type="button" role="radio" aria-checked={view === 'list'} className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')} aria-label="Lista"><BrandIcon name="list" size={16} /></button>
        </div>
      </div>

      <LoadingBar active={patientsQuery.isRefreshing} />
      {patientsQuery.isError && patientsQuery.data && <ErrorState compact error={patientsQuery.error} onRetry={patientsQuery.refetch} title="No se pudo actualizar" />}
      {patientsQuery.isLoading || patientsQuery.status === 'idle' ? (
        <SkeletonCards count={6} height={170} label="Cargando pacientes" />
      ) : patientsQuery.isError && !patientsQuery.data ? (
        <ErrorState error={patientsQuery.error} onRetry={patientsQuery.refetch} title="No se pudieron cargar los pacientes" />
      ) : patientsQuery.isEmpty ? (
        <EmptyState
          title={isDentist ? 'No tienes pacientes asignados' : 'Aún no hay pacientes registrados'}
          description={isDentist ? 'El titular del consultorio puede asignarte pacientes desde su panel.' : 'Crea la primera ficha clínica con los datos del paciente.'}
          action={!isDentist ? <button type="button" className="saas-btn saas-btn-primary" onClick={() => setCreating(true)}>Registrar paciente</button> : null}
        />
      ) : !filtered.length ? (
        <EmptyState title="Sin coincidencias" description="Prueba con otro nombre, documento o tratamiento." action={<button type="button" className="saas-btn saas-btn-secondary" onClick={() => { setSearch(''); setTreatment('Todos'); }}>Limpiar filtros</button>} />
      ) : (
        <ul className={`cp-patients is-${view}`}>
          {filtered.map((p, i) => {
            const idx = dmft(normalize(p.historial_odontograma), 'permanent');
            return (
              <li key={p.id} style={{ '--i': Math.min(i, 12) }}>
                <button type="button" className="cp-patient" onClick={() => setSelectedId(p.id)} aria-label={`Abrir ficha de ${p.nombre}`}>
                  <span className="cp-avatar" aria-hidden="true">{initials(p.nombre)}</span>
                  <span className="cp-patient__main">
                    <strong>{p.nombre}</strong>
                    <small>{p.dni ? `DNI ${p.dni}` : 'Sin documento'}{p.telefono ? ` · ${p.telefono}` : ''}</small>
                  </span>
                  <span className="cp-patient__tags">
                    <span className="cp-tag">Ficha por profesional</span>
                    {hasAllergy(p.alergias) && <span className="cp-tag is-alert"><BrandIcon name="alert" size={12} />Alergia</span>}
                  </span>
                  <span className="cp-patient__odo" title="Índice CPO-D">
                    <BrandIcon name="odontogram" size={16} />
                    <b>{idx.total}</b>
                    <small>CPO-D</small>
                  </span>
                  <span className="cp-patient__go" aria-hidden="true"><BrandIcon name="arrow" size={16} /></span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {creating && (
        <Dialog label="Registrar paciente" onClose={() => !create.pending && setCreating(false)} busy={create.pending}>
          <div className="cp-sheet cp-sheet--narrow">
            <header className="cp-sheet__head">
              <span className="cp-avatar is-lg" aria-hidden="true"><BrandIcon name="patientAdd" size={24} /></span>
              <div className="cp-sheet__title"><span className="odo-kicker">Nuevo paciente</span><h2>Abrir ficha clínica</h2><p>Los campos con * son obligatorios.</p></div>
              <button type="button" className="cp-close" onClick={() => setCreating(false)} aria-label="Cerrar" disabled={create.pending}><BrandIcon name="close" size={18} /></button>
            </header>
            <PatientForm clinical={false} onSubmit={handleCreate} pending={create.pending} submitLabel="Registrar paciente" onCancel={() => setCreating(false)} />
          </div>
        </Dialog>
      )}

      {selected && (
        <PatientSheet
          patient={selected}
          onClose={() => setSelectedId(null)}
          onUpdated={handleUpdated}
          canEdit={canEdit}
          author={profile?.nombre_completo || profile?.email}
          clinicSlug={clinicSlug}
        />
      )}
    </div>
  );
}
