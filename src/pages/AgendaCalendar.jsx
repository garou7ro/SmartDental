import { invokeFunction } from '../lib/api';
import { workflow, WorkflowResult } from '../components/assistant/PersonalAssistant';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { sileo } from 'sileo';
import useAuth from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import useSupabaseQuery from '../hooks/useSupabaseQuery';
import useAsyncAction from '../hooks/useAsyncAction';
import { unwrap } from '../lib/supabaseErrors';
import { ButtonLabel, EmptyState, ErrorState, LoadingBar, SkeletonTable } from '../components/ui/Loading';
import Dialog from '../components/ui/Dialog';
import { BrandIcon } from '../components/icons/BrandIcons';
import '../styles/clinic-pages.css';
import '../styles/agenda.css';

const START_HOUR = 7;
const END_HOUR = 21;
const SLOT_MIN = 30;
const BLOCK_MIN = 45; // duración visual de una cita (la tabla no guarda duración)
const ROW = 36; // px por media hora
const MOTIVES = ['Consulta / Diagnóstico', 'Profilaxis', 'Endodoncia', 'Ortodoncia', 'Resina', 'Extracción', 'Implantología', 'Blanqueamiento'];
const ESTADO = {
  pending: { label: 'Pendiente', verb: 'pendiente' },
  confirmed: { label: 'Confirmada', verb: 'confirmada' },
  cancelled: { label: 'Cancelada', verb: 'cancelada' },
};
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mondayOf = (d) => { const x = startOfDay(d); const day = x.getDay(); return addDays(x, day === 0 ? -6 : 1 - day); };
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const timeOf = (d) => d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
const toLocalInput = (d) => `${keyOf(d)}T${timeOf(d)}`;
const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'P';

/** Reparte citas superpuestas de un día en carriles. */
function layoutDay(items) {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const lanes = [];
  sorted.forEach((it) => {
    let lane = lanes.findIndex((end) => end <= it.start.getTime());
    if (lane === -1) { lane = lanes.length; lanes.push(0); }
    lanes[lane] = it.start.getTime() + BLOCK_MIN * 60000;
    it.lane = lane;
  });
  sorted.forEach((it) => { it.lanes = Math.max(1, lanes.length); });
  return sorted;
}

function MiniMonth({ month, onMonth, selected, onPick, counts }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = mondayOf(first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const today = new Date();
  return (
    <div className="ag-mini">
      <div className="ag-mini__head">
        <button type="button" onClick={() => onMonth(-1)} aria-label="Mes anterior"><BrandIcon name="chevronLeft" size={16} /></button>
        <strong>{month.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}</strong>
        <button type="button" onClick={() => onMonth(1)} aria-label="Mes siguiente"><BrandIcon name="chevronRight" size={16} /></button>
      </div>
      <div className="ag-mini__grid" role="grid">
        {DAY_NAMES.map((d) => <span key={d} className="ag-mini__dow">{d[0]}</span>)}
        {days.map((d) => {
          const n = counts[keyOf(d)] || 0;
          return (
            <button
              key={d.toISOString()}
              type="button"
              className={`ag-mini__day ${d.getMonth() !== month.getMonth() ? 'is-out' : ''} ${sameDay(d, today) ? 'is-today' : ''} ${sameDay(d, selected) ? 'is-selected' : ''}`}
              onClick={() => onPick(d)}
              aria-label={`${d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}${n ? `, ${n} citas` : ''}`}
            >
              {d.getDate()}
              {n > 0 && <i style={{ '--n': Math.min(n, 6) }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BookingDialog({ initial, patients, patientsLoading, citas, onClose, onBooked, profile }) {
  const [patientId, setPatientId] = useState(initial.patientId || '');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(keyOf(initial.date));
  const [time, setTime] = useState(initial.time || '');
  const [motivo, setMotivo] = useState('');
  const [otro, setOtro] = useState('');
  const [error, setError] = useState(null);
  const [doctorId, setDoctorId] = useState('');
  const doctors = useSupabaseQuery(signal => supabase.from('profiles').select('id,nombre_completo,email').eq('clinic_id',profile.clinic_id).eq('assistant_role','odontologo').eq('status','active').abortSignal(signal).then(unwrap), {key:profile.clinic_id});
  const availability = useSupabaseQuery(() => workflow('available_slots',{doctor_id:doctorId,from:new Date(`${date}T00:00`).toISOString(),to:new Date(`${date}T23:59:59`).toISOString(),duration_minutes:30}), {key:`${doctorId}:${date}`,enabled:!!doctorId && !!date});
  const book = useAsyncAction(async row => {await invokeFunction('whatsapp-settings',{action:'assign-patient',patient_id:row.patient_id,doctor_id:row.doctor_id});return workflow('create_appointment',row);});

  const patient = patients.find((p) => p.id === patientId);
  const matches = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return (term ? patients.filter((p) => [p.nombre, p.dni].some((v) => String(v || '').toLocaleLowerCase('es').includes(term))) : patients).slice(0, 6);
  }, [patients, search]);

  const slots = (availability.data?.slots || []).map(slot => ({ t: timeOf(new Date(slot.start)), start: slot.start, busy: false, past: new Date(slot.start) < new Date() }));

  const submit = async (e) => {
    e.preventDefault();
    if (!patientId) return setError('Elige un paciente.');
    if (!time) return setError('Elige un horario.');
    if (!doctorId) return setError('Selecciona el profesional.');
    const chosenSlot = slots.find(slot => slot.t === time);
    if (!chosenSlot) return setError('Selecciona un horario disponible confirmado por el servidor.');
    const at = new Date(chosenSlot.start);
    if (Number.isNaN(at.getTime())) return setError('Revisa la fecha y la hora.');
    if (at < new Date()) return setError('La fecha y hora ya pasaron.');
    const reason = motivo === 'Otro' ? otro.trim() : motivo;
    const res = await book.run({
      patient_id: patientId,
      doctor_id: doctorId,
      start_at: at.toISOString(),
      duration_minutes: 30,
      motivo: reason || 'Consulta / Diagnóstico',

    });
    if (res.skipped) return;
    if (!res.ok) { sileo.error({ title: 'No se pudo reservar la cita', description: res.error.message }); return; }
    sileo.success({ title: 'Cita registrada', description: `${patient?.nombre} · ${at.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}, ${time}.` });
    onBooked(at);
  };

  const busySelected = slots.find((s) => s.t === time)?.busy;

  return (
    <Dialog label="Reservar cita" onClose={() => !book.pending && onClose()} busy={book.pending}>
      <form className="cp-sheet cp-sheet--narrow ag-book" onSubmit={submit} noValidate>
        <header className="cp-sheet__head">
          <span className="cp-avatar is-lg" aria-hidden="true"><BrandIcon name="agenda" size={24} /></span>
          <div className="cp-sheet__title"><span className="odo-kicker">Nueva cita</span><h2>Reservar en la agenda</h2><p>El servidor comprueba disponibilidad y permisos antes de registrar la cita.</p></div>
          <button type="button" className="cp-close" onClick={onClose} aria-label="Cerrar" disabled={book.pending}><BrandIcon name="close" size={18} /></button>
        </header>

        <fieldset className="ag-book__section" disabled={book.pending}>
          <legend>Paciente</legend>
          {patient ? (
            <div className="ag-book__patient">
              <span className="cp-avatar" aria-hidden="true">{initials(patient.nombre)}</span>
              <div><strong>{patient.nombre}</strong><small>{patient.dni ? `DNI ${patient.dni}` : 'Sin documento'}</small></div>
              <button type="button" className="odo-link-btn" onClick={() => setPatientId('')}>Cambiar</button>
            </div>
          ) : (
            <div className="ag-book__picker">
              <div className="cp-search">
                <BrandIcon name="search" size={16} />
                <label className="sd-sr-only" htmlFor="book-patient">Buscar paciente</label>
                <input id="book-patient" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={patientsLoading ? 'Cargando pacientes…' : 'Buscar por nombre o DNI'} autoComplete="off" />
              </div>
              <ul>
                {matches.map((p) => (
                  <li key={p.id}><button type="button" onClick={() => { setPatientId(p.id); setError(null); }}><span className="cp-avatar" aria-hidden="true">{initials(p.nombre)}</span>{p.nombre}<small>{p.dni || ''}</small></button></li>
                ))}
                {!matches.length && !patientsLoading && <li className="cp-rail-empty">Sin coincidencias.</li>}
              </ul>
            </div>
          )}
        </fieldset>

        <fieldset className="ag-book__section" disabled={book.pending}>
          <legend>Profesional, fecha y hora</legend>
          <label className="cp-field"><span>Profesional responsable</span><select value={doctorId} onChange={e => {setDoctorId(e.target.value);setTime('');}} required><option value="">Selecciona un profesional</option>{(doctors.data || []).map(person => <option key={person.id} value={person.id}>{person.nombre_completo || person.email}</option>)}</select></label>
          {doctors.isError && <ErrorState compact error={doctors.error} onRetry={doctors.refetch} />}
          {availability.isError && <ErrorState compact error={availability.error} onRetry={availability.refetch} />}
          {availability.isLoading && doctorId && <p role="status">Consultando disponibilidad real…</p>}
          {doctorId && availability.status === 'success' && !slots.length && <p>No hay horarios disponibles. Revisa el horario configurado o elige otro día.</p>}
          <p>Las horas se muestran en la zona horaria de tu dispositivo.</p>
          <label className="cp-field"><span>Día</span><input type="date" value={date} min={keyOf(new Date())} onChange={(e) => { setDate(e.target.value); setTime(''); }} /></label>
          <div className="ag-slots" role="radiogroup" aria-label="Horarios">
            {slots.map((s) => (
              <button key={s.t} type="button" role="radio" aria-checked={time === s.t} disabled={s.past}
                className={`${time === s.t ? 'is-active' : ''} ${s.busy ? 'is-busy' : ''}`} onClick={() => { setTime(s.t); setError(null); }}
                title={s.busy ? 'Ya hay una cita a esta hora' : undefined}>{s.t}</button>
            ))}
          </div>
          {busySelected && <p className="ag-warn"><BrandIcon name="alert" size={15} />Ya hay una cita a esa hora. Puedes reservar igual si atienden en paralelo.</p>}
        </fieldset>

        <fieldset className="ag-book__section" disabled={book.pending}>
          <legend>Motivo</legend>
          <div className="cp-chips is-wrap">
            {[...MOTIVES, 'Otro'].map((m) => <button key={m} type="button" aria-pressed={motivo === m} className={motivo === m ? 'is-active' : ''} onClick={() => setMotivo(m)}>{m}</button>)}
          </div>
          {motivo === 'Otro' && <label className="cp-field"><span>Especifica el motivo</span><input value={otro} onChange={(e) => setOtro(e.target.value)} /></label>}
        </fieldset>

        {error && <p className="cp-form__error" role="alert">{error}</p>}
        <div className="cp-form__actions">
          <button type="button" className="saas-btn saas-btn-secondary" onClick={onClose} disabled={book.pending}>Cancelar</button>
          <button type="submit" className="saas-btn saas-btn-primary" disabled={book.pending}><ButtonLabel pending={book.pending} pendingLabel="Reservando…">Reservar cita</ButtonLabel></button>
        </div>
      </form>
    </Dialog>
  );
}

function AppointmentDialog({ cita, onClose, onStatus, pending, clinicSlug, clinicName }) {
  const d = new Date(cita.fecha_hora);
  const p = cita.pacientes;
  const reminder = `Hola ${p?.nombre?.split(' ')[0] || ''}, te recordamos tu cita en ${clinicName || 'el consultorio'} el ${d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${timeOf(d)}. ¿Nos confirmas tu asistencia?`;
  const phone = String(p?.telefono || '').replace(/\D/g, '');
  return (
    <Dialog label={`Cita de ${p?.nombre || 'paciente'}`} onClose={() => !pending && onClose()} busy={!!pending}>
      <div className={`cp-sheet cp-sheet--narrow ag-detail is-${cita.estado}`}>
        <header className="cp-sheet__head">
          <div className="ag-detail__date"><b>{d.getDate()}</b><span>{d.toLocaleDateString('es-PE', { month: 'short' })}</span></div>
          <div className="cp-sheet__title">
            <span className="odo-kicker">{d.toLocaleDateString('es-PE', { weekday: 'long' })} · {timeOf(d)}</span>
            <h2>{p?.nombre || 'Paciente'}</h2>
            <p>{cita.motivo || 'Consulta'}</p>
          </div>
          <button type="button" className="cp-close" onClick={onClose} aria-label="Cerrar" disabled={!!pending}><BrandIcon name="close" size={18} /></button>
        </header>
        <div className="ag-detail__status">
          <span className={`cp-pill is-${cita.estado}`}>{ESTADO[cita.estado]?.label || cita.estado}</span>
          {p?.dni && <span className="cp-tag">DNI {p.dni}</span>}
        </div>
        {cita.notas && <p className="ag-detail__notes">{cita.notas}</p>}
        <div className="ag-detail__actions" role="group" aria-label="Cambiar estado">
          {cita.estado !== 'confirmed' && <button type="button" className="saas-btn saas-btn-primary" onClick={() => onStatus(cita, 'confirmed')} disabled={!!pending}><BrandIcon name="check" size={16} /><ButtonLabel pending={pending === 'confirmed'}>Revisar en Mi espacio</ButtonLabel></button>}

          {cita.estado !== 'cancelled' && <button type="button" className="saas-btn saas-btn-secondary ag-danger" onClick={() => onStatus(cita, 'cancelled')} disabled={!!pending}><BrandIcon name="close" size={16} /><ButtonLabel pending={pending === 'cancelled'} pendingLabel="Cancelando…">Cancelar cita</ButtonLabel></button>}
        </div>
        <div className="cp-sheet__actions">
          <Link className="saas-btn saas-btn-secondary cp-wa-btn" to={`/${clinicSlug}/whatsapp`}><BrandIcon name="whatsapp" size={16} />Atender desde la clínica</Link>
          {p?.id && <Link className="saas-btn saas-btn-secondary" to={`/${clinicSlug}/patients?paciente=${p.id}`}><BrandIcon name="patients" size={16} />Ver ficha</Link>}
        </div>
      </div>
    </Dialog>
  );
}

export default function AgendaCalendar() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { clinicSlug } = useParams();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState(() => (window.matchMedia('(max-width: 760px)').matches ? 'day' : 'week'));
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [month, setMonth] = useState(() => new Date());
  const [filter, setFilter] = useState('all');
  const [booking, setBooking] = useState(null);
  const [selected, setSelected] = useState(null);
  const [statusPending, setStatusPending] = useState(null);
  const [workflowPreview, setWorkflowPreview] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const gridRef = useRef(null);
  const isDentist = profile?.role === 'assistant' && profile?.assistant_role === 'odontologo';

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);

  const days = useMemo(() => (view === 'day' ? [cursor] : Array.from({ length: 7 }, (_, i) => addDays(mondayOf(cursor), i))), [view, cursor]);
  const rangeStart = view === 'list' ? startOfDay(cursor) : days[0];
  const rangeEnd = view === 'list' ? addDays(startOfDay(cursor), 14) : addDays(days[days.length - 1], 1);

  const citasQuery = useSupabaseQuery(
    (signal) => {
      let q = supabase.from('citas').select('id, fecha_hora, motivo, notas, estado, empleado_id, pacientes(id, nombre, dni, telefono)')
        .gte('fecha_hora', rangeStart.toISOString()).lt('fecha_hora', rangeEnd.toISOString()).order('fecha_hora', { ascending: true });
      if (isDentist) q = q.eq('empleado_id', profile.id);
      return q.abortSignal(signal).then(unwrap);
    },
    { key: `${profile?.clinic_id}|${rangeStart.toISOString()}|${rangeEnd.toISOString()}|${isDentist}`, enabled: !!profile?.clinic_id }
  );
  const citas = citasQuery.data ?? [];

  // Densidad del mes para el minicalendario.
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const monthQuery = useSupabaseQuery(
    (signal) => {
      let q = supabase.from('citas').select('fecha_hora, estado, empleado_id').gte('fecha_hora', mondayOf(monthStart).toISOString()).lt('fecha_hora', addDays(monthEnd, 7).toISOString());
      if (isDentist) q = q.eq('empleado_id', profile.id);
      return q.abortSignal(signal).then(unwrap);
    },
    { key: `${profile?.clinic_id}|m|${monthStart.toISOString()}|${isDentist}`, enabled: !!profile?.clinic_id }
  );
  const counts = useMemo(() => (monthQuery.data || []).reduce((acc, c) => {
    if (c.estado === 'cancelled') return acc;
    const k = keyOf(new Date(c.fecha_hora));
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {}), [monthQuery.data]);

  const patientsQuery = useSupabaseQuery(
    (signal) => supabase.from('pacientes').select('id, nombre, dni').order('nombre', { ascending: true }).abortSignal(signal).then(unwrap),
    { key: profile?.clinic_id, enabled: !!profile?.clinic_id && !!booking }
  );

  // ?paciente=<id> (desde la ficha) abre la reserva con el paciente elegido.
  useEffect(() => {
    if (params.get('nueva') && profile?.role === 'clinic_admin') {
      setBooking({ date: new Date() });
      setParams((prev) => { const n = new URLSearchParams(prev); n.delete('nueva'); return n; }, { replace: true });
      return;
    }
    const pid = params.get('paciente');
    if (pid && profile?.role === 'clinic_admin') {
      setBooking({ date: new Date(), patientId: pid });
      setParams((prev) => { const n = new URLSearchParams(prev); n.delete('paciente'); return n; }, { replace: true });
    }
  }, [params, setParams]);

  // Al abrir la vista, desplaza la rejilla a la hora actual.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const minutes = Math.max(0, (now.getHours() - START_HOUR - 1) * 60);
    el.scrollTop = (minutes / SLOT_MIN) * ROW;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const visible = citas.filter((c) => filter === 'all' || c.estado === filter);
  const stats = {
    total: citas.filter((c) => c.estado !== 'cancelled').length,
    pending: citas.filter((c) => c.estado === 'pending').length,
    confirmed: citas.filter((c) => c.estado === 'confirmed').length,
    cancelled: citas.filter((c) => c.estado === 'cancelled').length,
  };

  const move = (dir) => setCursor((c) => addDays(c, dir * (view === 'week' ? 7 : view === 'list' ? 14 : 1)));
  const goToday = () => { const t = startOfDay(new Date()); setCursor(t); setMonth(t); };
  const pick = (d) => { setCursor(startOfDay(d)); if (view === 'list') setView('day'); };

  const updateStatus = async (cita, estado) => {
    if (statusPending) return;
    if (estado !== 'cancelled') { navigate(`/${clinicSlug}/workspace`); return; }
    setStatusPending(estado);
    try {const data=await workflow('preview_cancel',{appointment_ids:[cita.id],notify:true,offer_reschedule:true,request_key:crypto.randomUUID()});setWorkflowPreview(data);setSelected(null);}
    catch(error){sileo.error({title:'No se pudo preparar la cancelación',description:error.message});}
    finally{setStatusPending(null);}
  };

  const title = view === 'day'
    ? cursor.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
    : view === 'week'
      ? `${days[0].toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : `Próximos 14 días desde el ${cursor.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}`;

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const rows = ((END_HOUR - START_HOUR) * 60) / SLOT_MIN;

  const openSlot = (day, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const slot = Math.floor((e.clientY - rect.top) / ROW);
    const minutes = START_HOUR * 60 + slot * SLOT_MIN;
    const at = new Date(day);
    at.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    if (at < now) { sileo.info({ title: 'Horario pasado', description: 'Elige un horario futuro para reservar.' }); return; }
    if (profile?.role === 'clinic_admin') setBooking({ date: at, time: timeOf(at) });
  };

  const grouped = useMemo(() => {
    const map = new Map();
    visible.forEach((c) => {
      const k = keyOf(new Date(c.fecha_hora));
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(c);
    });
    return [...map.entries()];
  }, [visible]);

  return (
    <div className="clinic-page-container ag-page">
      <aside className="ag-side">
        <button type="button" hidden={profile?.role !== 'clinic_admin'} className="saas-btn saas-btn-primary cp-cta ag-new" onClick={() => setBooking({ date: cursor < startOfDay(now) ? now : cursor })}>
          <BrandIcon name="plus" size={18} />Nueva cita
        </button>
        <MiniMonth month={month} onMonth={(n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1))} selected={cursor} onPick={pick} counts={counts} />
        <div className="ag-stats" aria-label="Resumen del periodo visible">
          <button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}><b>{stats.total}</b><span>Activas</span></button>
          <button type="button" className={`is-pending ${filter === 'pending' ? 'is-active' : ''}`} onClick={() => setFilter('pending')}><b>{stats.pending}</b><span>Pendientes</span></button>
          <button type="button" className={`is-confirmed ${filter === 'confirmed' ? 'is-active' : ''}`} onClick={() => setFilter('confirmed')}><b>{stats.confirmed}</b><span>Confirmadas</span></button>
          <button type="button" className={`is-cancelled ${filter === 'cancelled' ? 'is-active' : ''}`} onClick={() => setFilter('cancelled')}><b>{stats.cancelled}</b><span>Canceladas</span></button>
        </div>
      </aside>

      <section className="ag-main" aria-label="Agenda">
        <header className="ag-bar">
          <div className="ag-bar__nav">
            <button type="button" className="odo-icon-btn" onClick={() => move(-1)} aria-label="Anterior"><BrandIcon name="chevronLeft" size={18} /></button>
            <button type="button" className="saas-btn saas-btn-secondary ag-today" onClick={goToday}>Hoy</button>
            <button type="button" className="odo-icon-btn" onClick={() => move(1)} aria-label="Siguiente"><BrandIcon name="chevronRight" size={18} /></button>
            <h2 className="ag-title">{title}</h2>
          </div>
          <div className="odo-seg" role="radiogroup" aria-label="Vista">
            {[['day', 'Día'], ['week', 'Semana'], ['list', 'Lista']].map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={view === id} className={view === id ? 'is-active' : ''} onClick={() => setView(id)}>{label}</button>
            ))}
          </div>
        </header>

        <LoadingBar active={citasQuery.isRefreshing} />
        {citasQuery.isError && citasQuery.data && <ErrorState compact error={citasQuery.error} onRetry={citasQuery.refetch} title="No se pudo actualizar la agenda" />}

        {citasQuery.isLoading || citasQuery.status === 'idle' ? (
          <SkeletonTable rows={8} cols={view === 'week' ? 7 : 2} label="Cargando citas" />
        ) : citasQuery.isError && !citasQuery.data ? (
          <ErrorState error={citasQuery.error} onRetry={citasQuery.refetch} title="No se pudo cargar la agenda" />
        ) : view === 'list' ? (
          grouped.length ? (
            <div className="ag-list">
              {grouped.map(([k, items]) => {
                const d = new Date(`${k}T00:00`);
                return (
                  <section key={k} className="ag-list__day">
                    <h3 className={sameDay(d, now) ? 'is-today' : ''}><b>{d.getDate()}</b>{d.toLocaleDateString('es-PE', { weekday: 'long', month: 'long' })}<span>{items.length} {items.length === 1 ? 'cita' : 'citas'}</span></h3>
                    <ul>
                      {items.map((c) => (
                        <li key={c.id}>
                          <button type="button" className={`ag-row is-${c.estado}`} onClick={() => setSelected(c)}>
                            <time>{timeOf(new Date(c.fecha_hora))}</time>
                            <span className="cp-avatar" aria-hidden="true">{initials(c.pacientes?.nombre)}</span>
                            <span className="ag-row__main"><strong>{c.pacientes?.nombre || 'Paciente'}</strong><small>{c.motivo || 'Consulta'}</small></span>
                            <span className={`cp-pill is-${c.estado}`}>{ESTADO[c.estado]?.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          ) : <EmptyState title="Sin citas en este periodo" description="Las citas que reserves aparecerán aquí." action={profile?.role === 'clinic_admin' && <button type="button" className="saas-btn saas-btn-primary" onClick={() => setBooking({ date: now })}>Reservar cita</button>} />
        ) : (
          <div className={`ag-cal is-${view}`} style={{ '--cols': days.length, '--row': `${ROW}px` }}>
            <div className="ag-cal__head">
              <span />
              {days.map((d) => (
                <button key={d.toISOString()} type="button" className={`ag-cal__dayhead ${sameDay(d, now) ? 'is-today' : ''}`} onClick={() => { setCursor(d); setView('day'); }}>
                  <span>{DAY_NAMES[(d.getDay() + 6) % 7]}</span><b>{d.getDate()}</b>
                  {counts[keyOf(d)] ? <i>{counts[keyOf(d)]}</i> : null}
                </button>
              ))}
            </div>
            <div className="ag-cal__scroll" ref={gridRef}>
              <div className="ag-cal__body" style={{ height: rows * ROW }}>
                <div className="ag-cal__hours" aria-hidden="true">
                  {hours.map((h) => <span key={h} style={{ top: ((h - START_HOUR) * 60 / SLOT_MIN) * ROW }}>{String(h).padStart(2, '0')}:00</span>)}
                </div>
                {days.map((d) => {
                  const items = layoutDay(visible.filter((c) => sameDay(new Date(c.fecha_hora), d)).map((c) => ({ ...c, start: new Date(c.fecha_hora) })));
                  const isToday = sameDay(d, now);
                  const nowTop = ((now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) / SLOT_MIN) * ROW;
                  return (
                    <div key={d.toISOString()} className={`ag-cal__col ${isToday ? 'is-today' : ''} ${d < startOfDay(now) ? 'is-past' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) openSlot(d, e); }} role="presentation">
                      {items.map((c) => {
                        const mins = c.start.getHours() * 60 + c.start.getMinutes() - START_HOUR * 60;
                        const top = Math.max(0, (mins / SLOT_MIN) * ROW);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            className={`ag-event is-${c.estado}`}
                            style={{ top, height: (BLOCK_MIN / SLOT_MIN) * ROW - 3, left: `calc(${(c.lane / c.lanes) * 100}% + 3px)`, width: `calc(${100 / c.lanes}% - 6px)` }}
                            onClick={() => setSelected(c)}
                            title={`${timeOf(c.start)} · ${c.pacientes?.nombre || ''} · ${c.motivo || ''}`}
                          >
                            <time>{timeOf(c.start)}</time>
                            <strong>{c.pacientes?.nombre || 'Paciente'}</strong>
                            <small>{c.motivo || 'Consulta'}</small>
                          </button>
                        );
                      })}
                      {isToday && nowTop >= 0 && nowTop <= rows * ROW && <span className="ag-now" style={{ top: nowTop }} aria-hidden="true" />}
                    </div>
                  );
                })}
              </div>
            </div>
            {!visible.length && <p className="ag-cal__empty">Sin citas {filter !== 'all' ? `${ESTADO[filter].label.toLowerCase()}s ` : ''}en este periodo · Toca un horario libre para reservar</p>}
          </div>
        )}
      </section>

      {booking && profile?.role === 'clinic_admin' && (
        <BookingDialog
          initial={booking}
          patients={patientsQuery.data ?? []}
          patientsLoading={patientsQuery.isLoading}
          citas={citas}
          profile={profile}
          onClose={() => setBooking(null)}
          onBooked={(at) => { setBooking(null); setCursor(startOfDay(at)); citasQuery.refetch(); monthQuery.refetch(); }}
        />
      )}
      {workflowPreview && <Dialog label="Revisar cancelación" onClose={() => setWorkflowPreview(null)}><WorkflowResult data={workflowPreview} kind="cancel" onConfirmed={() => {citasQuery.refetch();monthQuery.refetch();}} /></Dialog>}
      {selected && (
        <AppointmentDialog cita={selected} onClose={() => setSelected(null)} onStatus={updateStatus} pending={statusPending} clinicSlug={clinicSlug} clinicName={profile?.clinic_name} />
      )}
    </div>
  );
}
