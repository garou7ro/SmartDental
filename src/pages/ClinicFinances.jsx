import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { sileo } from 'sileo';
import useAuth from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { csvCell } from '../lib/clinicExport';
import useSupabaseQuery from '../hooks/useSupabaseQuery';
import useAsyncAction from '../hooks/useAsyncAction';
import { unwrap } from '../lib/supabaseErrors';
import { ButtonLabel, EmptyState, ErrorState, LoadingBar, SkeletonCards } from '../components/ui/Loading';
import Dialog from '../components/ui/Dialog';
import CountUp from '../components/ui/CountUp';
import { BrandIcon } from '../components/icons/BrandIcons';
import '../styles/clinic-pages.css';
import '../styles/finances.css';

const soles = (n) => `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const CONCEPTS = ['Consulta', 'Profilaxis', 'Resina', 'Endodoncia', 'Extracción', 'Ortodoncia (cuota)', 'Blanqueamiento', 'Implante'];
const METHODS = ['Efectivo', 'Yape / Plin', 'Tarjeta', 'Transferencia'];
const PERIODS = [['7', '7 días'], ['30', '30 días'], ['month', 'Este mes'], ['all', 'Todo']];
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'S/';

function RevenueChart({ rows }) {
  const [hover, setHover] = useState(null);
  const days = useMemo(() => {
    const out = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const totals = rows.reduce((acc, t) => { const k = dayKey(new Date(t.created_at)); acc[k] = (acc[k] || 0) + Number(t.monto || 0); return acc; }, {});
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      out.push({ d, v: totals[dayKey(d)] || 0 });
    }
    return out;
  }, [rows]);
  const max = Math.max(1, ...days.map((x) => x.v));
  const W = 600; const H = 160; const bw = W / days.length;
  const total = days.reduce((s, x) => s + x.v, 0);
  const shown = hover != null ? days[hover] : null;
  return (
    <section className="fin-chart" aria-label="Ingresos de los últimos 30 días">
      <header>
        <div><span className="odo-kicker">Últimos 30 días</span><strong>{soles(total)}</strong></div>
        <p aria-live="polite">{shown ? <>{shown.d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })} · <b>{soles(shown.v)}</b></> : 'Pasa el cursor por las barras'}</p>
      </header>
      <svg viewBox={`0 0 ${W} ${H + 22}`} preserveAspectRatio="none" role="img" aria-label={`Total ${soles(total)}`} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="fin-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2fe0c8" /><stop offset="1" stopColor="#1e7bff" /></linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1="0" x2={W} y1={H - H * g} y2={H - H * g} className="fin-chart__grid" />)}
        {days.map((x, i) => {
          const h = x.v ? Math.max(3, (x.v / max) * (H - 8)) : 2;
          return (
            <g key={i} onPointerEnter={() => setHover(i)}>
              <rect x={i * bw} y="0" width={bw} height={H} fill="transparent" />
              <rect className={`fin-chart__bar ${hover === i ? 'is-hover' : ''} ${x.v ? '' : 'is-zero'}`} x={i * bw + bw * 0.18} y={H - h} width={bw * 0.64} height={h} rx={Math.min(4, bw * 0.3)} style={{ '--i': i }} />
              {(days.length - 1 - i) % 7 === 0 && <text x={i * bw + bw / 2} y={H + 16} textAnchor="middle" className="fin-chart__label">{x.d.getDate()}/{x.d.getMonth() + 1}</text>}
            </g>
          );
        })}
      </svg>
    </section>
  );
}

function IncomeDialog({ clinicId, onClose, onSaved }) {
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [method, setMethod] = useState('');
  const [patientId, setPatientId] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const patientsQuery = useSupabaseQuery(
    (signal) => supabase.from('pacientes').select('id, nombre, dni').order('nombre', { ascending: true }).abortSignal(signal).then(unwrap),
    { key: clinicId, enabled: !!clinicId }
  );
  const patients = patientsQuery.data ?? [];
  const patient = patients.find((p) => p.id === patientId);
  const matches = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return term ? patients.filter((p) => [p.nombre, p.dni].some((v) => String(v || '').toLocaleLowerCase('es').includes(term))).slice(0, 5) : [];
  }, [patients, search]);
  const add = useAsyncAction((row) => supabase.from('transacciones').insert(row).select('id, monto, concepto, created_at, pacientes(nombre, dni)').then(unwrap));

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(String(amount).replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return setError('Ingresa un monto mayor que cero.');
    if (!concept.trim()) return setError('Indica el concepto del ingreso.');
    const concepto = method ? `${concept.trim()} · ${method}` : concept.trim();
    const res = await add.run({ clinic_id: clinicId, paciente_id: patientId || null, monto: Math.round(value * 100) / 100, concepto });
    if (res.skipped) return;
    if (!res.ok) { sileo.error({ title: 'No se pudo registrar el ingreso', description: res.error.message }); return; }
    sileo.success({ title: 'Ingreso registrado', description: `${soles(value)} · ${concepto}` });
    onSaved(res.data?.[0]);
  };

  return (
    <Dialog label="Registrar ingreso" onClose={() => !add.pending && onClose()} busy={add.pending}>
      <form className="cp-sheet cp-sheet--narrow fin-income" onSubmit={submit} noValidate>
        <header className="cp-sheet__head">
          <span className="cp-avatar is-lg" aria-hidden="true"><BrandIcon name="cash" size={24} /></span>
          <div className="cp-sheet__title"><span className="odo-kicker">Caja</span><h2>Registrar ingreso</h2><p>Queda registrado con la fecha y hora actuales.</p></div>
          <button type="button" className="cp-close" onClick={onClose} aria-label="Cerrar" disabled={add.pending}><BrandIcon name="close" size={18} /></button>
        </header>
        <label className="fin-amount">
          <span>S/</span>
          <input autoFocus inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^\d.,]/g, '')); setError(null); }} aria-label="Monto en soles" />
        </label>
        <fieldset className="ag-book__section">
          <legend>Concepto</legend>
          <div className="cp-chips is-wrap">{CONCEPTS.map((c) => <button key={c} type="button" aria-pressed={concept === c} className={concept === c ? 'is-active' : ''} onClick={() => setConcept(c)}>{c}</button>)}</div>
          <label className="cp-field"><span className="sd-sr-only">Concepto</span><input value={concept} onChange={(e) => { setConcept(e.target.value); setError(null); }} placeholder="O escribe el concepto" /></label>
        </fieldset>
        <fieldset className="ag-book__section">
          <legend>Método de pago (opcional)</legend>
          <div className="cp-chips is-wrap">{METHODS.map((m) => <button key={m} type="button" aria-pressed={method === m} className={method === m ? 'is-active' : ''} onClick={() => setMethod(method === m ? '' : m)}>{m}</button>)}</div>
        </fieldset>
        <fieldset className="ag-book__section">
          <legend>Paciente (opcional)</legend>
          {patient ? (
            <div className="ag-book__patient"><span className="cp-avatar" aria-hidden="true">{initials(patient.nombre)}</span><div><strong>{patient.nombre}</strong><small>{patient.dni || 'Sin documento'}</small></div><button type="button" className="odo-link-btn" onClick={() => setPatientId('')}>Quitar</button></div>
          ) : (
            <div className="ag-book__picker">
              <div className="cp-search"><BrandIcon name="search" size={16} /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={patientsQuery.isLoading ? 'Cargando pacientes…' : 'Vincular a un paciente'} aria-label="Buscar paciente" /></div>
              {matches.length > 0 && <ul>{matches.map((p) => <li key={p.id}><button type="button" onClick={() => setPatientId(p.id)}><span className="cp-avatar" aria-hidden="true">{initials(p.nombre)}</span>{p.nombre}<small>{p.dni || ''}</small></button></li>)}</ul>}
            </div>
          )}
        </fieldset>
        {error && <p className="cp-form__error" role="alert">{error}</p>}
        <div className="cp-form__actions">
          <button type="button" className="saas-btn saas-btn-secondary" onClick={onClose} disabled={add.pending}>Cancelar</button>
          <button type="submit" className="saas-btn saas-btn-primary" disabled={add.pending}><ButtonLabel pending={add.pending}>Registrar {amount ? soles(Number(String(amount).replace(',', '.')) || 0) : 'ingreso'}</ButtonLabel></button>
        </div>
      </form>
    </Dialog>
  );
}

export default function ClinicFinances() {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'clinic_admin';
  const clinicSlug = profile?.clinic_name ? profile.clinic_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : 'mi-clinica';
  const [period, setPeriod] = useState('30');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  const trxQuery = useSupabaseQuery(
    (signal) => supabase.from('transacciones').select('id, monto, concepto, created_at, pacientes(nombre, dni)').order('created_at', { ascending: false }).abortSignal(signal).then(unwrap),
    { key: profile?.clinic_id, enabled: !!profile?.clinic_id && isOwner }
  );
  const rows = trxQuery.data ?? [];

  const now = new Date();
  const todayKey = dayKey(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const stats = useMemo(() => {
    const today = rows.filter((t) => dayKey(new Date(t.created_at)) === todayKey).reduce((s, t) => s + Number(t.monto || 0), 0);
    const monthRows = rows.filter((t) => new Date(t.created_at) >= monthStart);
    const month = monthRows.reduce((s, t) => s + Number(t.monto || 0), 0);
    const total = rows.reduce((s, t) => s + Number(t.monto || 0), 0);
    return { today, month, avg: monthRows.length ? month / monthRows.length : 0, total, count: monthRows.length };
  }, [rows, todayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    const from = period === 'all' ? null : period === 'month' ? monthStart : new Date(Date.now() - Number(period) * 86400000);
    return rows.filter((t) => (!from || new Date(t.created_at) >= from)
      && (!term || [t.concepto, t.pacientes?.nombre, t.pacientes?.dni].some((v) => String(v || '').toLocaleLowerCase('es').includes(term))));
  }, [rows, period, search]); // eslint-disable-line react-hooks/exhaustive-deps
  const filteredTotal = filtered.reduce((s, t) => s + Number(t.monto || 0), 0);
  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((t) => { const k = dayKey(new Date(t.created_at)); if (!map.has(k)) map.set(k, []); map.get(k).push(t); });
    return [...map.entries()];
  }, [filtered]);

  const exportCsv = () => {
    if (!filtered.length) { sileo.info({ title: 'Sin movimientos', description: 'No hay ingresos en el periodo elegido.' }); return; }
    const out = [['Fecha', 'Concepto', 'Paciente', 'DNI', 'Monto (S/)']].concat(filtered.map((t) => [new Date(t.created_at).toLocaleString('es-PE'), t.concepto, t.pacientes?.nombre || '', t.pacientes?.dni || '', Number(t.monto || 0).toFixed(2)]));
    const blob = new Blob(['﻿' + out.map((r) => r.map(csvCell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `caja-${todayKey}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    sileo.success({ title: 'Reporte descargado', description: `${filtered.length} movimientos exportados.` });
  };

  if (!isOwner) {
    return (
      <div className="clinic-page-container">
        <EmptyState icon={undefined} title="Acceso solo para el titular" description="La caja contiene información financiera del consultorio. Solo el titular puede verla." action={<Link className="saas-btn saas-btn-primary" to={`/${clinicSlug}`}>Volver al resumen</Link>} />
      </div>
    );
  }

  return (
    <div className="clinic-page-container cp-page">
      <header className="cp-page-head">
        <div>
          <span className="odo-kicker">Caja e ingresos</span>
          <h2>Lo que ingresa, claro</h2>
          <p>{stats.count} {stats.count === 1 ? 'movimiento' : 'movimientos'} este mes</p>
        </div>
        <div className="fin-head-actions">
          <button type="button" className="saas-btn saas-btn-secondary" onClick={exportCsv}><BrandIcon name="download" size={17} />Exportar CSV</button>
          <button type="button" className="saas-btn saas-btn-primary cp-cta" onClick={() => setAdding(true)}><BrandIcon name="plus" size={18} />Registrar ingreso</button>
        </div>
      </header>

      <div className="fin-kpis">
        {[['Hoy', stats.today], ['Este mes', stats.month], ['Ticket promedio del mes', stats.avg], ['Total registrado', stats.total]].map(([label, v], i) => (
          <div key={label} className={`fin-kpi ${i === 1 ? 'is-hero' : ''}`}><span>{label}</span><b><CountUp value={Math.round(v * 100) / 100} format={soles} /></b></div>
        ))}
      </div>

      <LoadingBar active={trxQuery.isRefreshing} />
      {trxQuery.isLoading || trxQuery.status === 'idle' ? (
        <SkeletonCards count={4} height={120} label="Cargando caja" />
      ) : trxQuery.isError && !trxQuery.data ? (
        <ErrorState error={trxQuery.error} onRetry={trxQuery.refetch} title="No se pudo cargar la caja" />
      ) : (
        <>
          <RevenueChart rows={rows} />
          <div className="cp-toolbar">
            <div className="cp-search"><BrandIcon name="search" size={17} /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar concepto o paciente" aria-label="Buscar movimiento" /></div>
            <div className="odo-seg" role="radiogroup" aria-label="Periodo">
              {PERIODS.map(([id, label]) => <button key={id} type="button" role="radio" aria-checked={period === id} className={period === id ? 'is-active' : ''} onClick={() => setPeriod(id)}>{label}</button>)}
            </div>
          </div>
          {!filtered.length ? (
            <EmptyState title={rows.length ? 'Sin movimientos en este periodo' : 'Aún no hay ingresos'} description={rows.length ? 'Prueba con otro periodo o búsqueda.' : 'Registra el primer ingreso de tu caja.'} action={<button type="button" className="saas-btn saas-btn-primary" onClick={() => setAdding(true)}>Registrar ingreso</button>} />
          ) : (
            <div className="fin-ledger">
              <p className="fin-ledger__total">{filtered.length} movimientos · <b>{soles(filteredTotal)}</b></p>
              {groups.map(([k, items]) => {
                const d = new Date(`${k}T00:00`);
                const sum = items.reduce((s, t) => s + Number(t.monto || 0), 0);
                return (
                  <section key={k} className="fin-day">
                    <h3><span>{k === todayKey ? 'Hoy' : d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</span><b>{soles(sum)}</b></h3>
                    <ul>
                      {items.map((t) => (
                        <li key={t.id} className="fin-row">
                          <span className="cp-avatar" aria-hidden="true">{t.pacientes?.nombre ? initials(t.pacientes.nombre) : 'S/'}</span>
                          <span className="fin-row__main"><strong>{t.concepto}</strong><small>{t.pacientes?.nombre || 'Sin paciente vinculado'} · {new Date(t.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</small></span>
                          <b className="fin-row__amount">+ {soles(t.monto)}</b>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      {adding && <IncomeDialog clinicId={profile.clinic_id} onClose={() => setAdding(false)} onSaved={(row) => { setAdding(false); if (row) trxQuery.setData((prev) => [row, ...(prev || [])]); else trxQuery.refetch(); }} />}
    </div>
  );
}
