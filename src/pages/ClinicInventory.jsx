import React, { useMemo, useState } from 'react';
import { sileo } from 'sileo';
import useAuth from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import useSupabaseQuery from '../hooks/useSupabaseQuery';
import useAsyncAction from '../hooks/useAsyncAction';
import { unwrap } from '../lib/supabaseErrors';
import { ButtonLabel, EmptyState, ErrorState, LoadingBar, SkeletonCards } from '../components/ui/Loading';
import Dialog from '../components/ui/Dialog';
import CountUp from '../components/ui/CountUp';
import { BrandIcon } from '../components/icons/BrandIcons';
import '../styles/clinic-pages.css';
import '../styles/inventory.css';

const levelOf = (item) => (item.cantidad <= 0 ? 'out' : item.cantidad <= item.stock_minimo ? 'low' : 'ok');
const LEVEL = { out: 'Agotado', low: 'Bajo mínimo', ok: 'En stock' };

function Stepper({ value, onChange, min = 1, max = 9999, label }) {
  const clamp = (n) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
  return (
    <div className="inv-stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label="Restar uno">−</button>
      <input type="number" inputMode="numeric" value={value} min={min} max={max} onChange={(e) => onChange(clamp(parseInt(e.target.value, 10)))} aria-label={label} />
      <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label="Sumar uno">+</button>
    </div>
  );
}

function MoveDialog({ item, mode, onClose, onDone }) {
  const out = mode === 'out';
  const [qty, setQty] = useState(out ? 1 : Math.max(1, item.stock_minimo * 2 - item.cantidad));
  const action = useAsyncAction((next) => supabase.from('inventario').update({ cantidad: next }).eq('id', item.id).select('id, cantidad').then(unwrap));
  const next = out ? item.cantidad - qty : item.cantidad + qty;
  const submit = async (e) => {
    e.preventDefault();
    if (out && qty > item.cantidad) return;
    const res = await action.run(next);
    if (res.skipped) return;
    if (!res.ok) { sileo.error({ title: out ? 'No se pudo registrar la salida' : 'No se pudo reponer', description: res.error.message }); return; }
    if (!res.data?.length) { sileo.error({ title: 'No se confirmó el cambio', description: 'Tu usuario no tiene permiso para modificar este insumo.' }); return; }
    sileo.success({ title: out ? 'Salida registrada' : 'Stock repuesto', description: `${item.producto}: ${item.cantidad} → ${next} unidades.` });
    onDone({ ...item, cantidad: next });
  };
  return (
    <Dialog label={out ? `Registrar salida de ${item.producto}` : `Reponer ${item.producto}`} onClose={() => !action.pending && onClose()} busy={action.pending}>
      <form className="cp-sheet cp-sheet--narrow inv-move" onSubmit={submit}>
        <header className="cp-sheet__head">
          <span className={`cp-avatar is-lg inv-move__icon ${out ? 'is-out' : ''}`} aria-hidden="true"><BrandIcon name="inventory" size={24} /></span>
          <div className="cp-sheet__title"><span className="odo-kicker">{out ? 'Registrar salida' : 'Reponer stock'}</span><h2>{item.producto}</h2><p>Disponible: {item.cantidad} · Mínimo: {item.stock_minimo}</p></div>
          <button type="button" className="cp-close" onClick={onClose} aria-label="Cerrar" disabled={action.pending}><BrandIcon name="close" size={18} /></button>
        </header>
        <div className="inv-move__body">
          <Stepper value={qty} onChange={setQty} max={out ? Math.max(1, item.cantidad) : 9999} label={out ? 'Unidades que salen' : 'Unidades que entran'} />
          <div className={`inv-move__preview is-${levelOf({ ...item, cantidad: next })}`}>
            <span>Quedarán</span>
            <b>{next}</b>
            <small>{LEVEL[levelOf({ ...item, cantidad: next })]}</small>
          </div>
        </div>
        {out && qty > item.cantidad && <p className="cp-form__error">No hay suficientes unidades.</p>}
        <div className="cp-form__actions">
          <button type="button" className="saas-btn saas-btn-secondary" onClick={onClose} disabled={action.pending}>Cancelar</button>
          <button type="submit" className="saas-btn saas-btn-primary" disabled={action.pending || (out && item.cantidad <= 0)}>
            <ButtonLabel pending={action.pending}>{out ? `Registrar salida de ${qty}` : `Reponer ${qty}`}</ButtonLabel>
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function ItemDialog({ item, clinicId, onClose, onSaved }) {
  const editing = !!item;
  const [producto, setProducto] = useState(item?.producto || '');
  const [cantidad, setCantidad] = useState(item?.cantidad ?? 10);
  const [minimo, setMinimo] = useState(item?.stock_minimo ?? 5);
  const [error, setError] = useState(null);
  const action = useAsyncAction((row) => (editing
    ? supabase.from('inventario').update(row).eq('id', item.id).select()
    : supabase.from('inventario').insert(row).select()).then(unwrap));
  const submit = async (e) => {
    e.preventDefault();
    if (!producto.trim()) return setError('Escribe el nombre del insumo.');
    const row = editing ? { producto: producto.trim(), stock_minimo: minimo } : { producto: producto.trim(), cantidad, stock_minimo: minimo, clinic_id: clinicId };
    const res = await action.run(row);
    if (res.skipped) return;
    if (!res.ok) { sileo.error({ title: 'No se pudo guardar el insumo', description: res.error.message }); return; }
    if (!res.data?.length) { sileo.error({ title: 'No se confirmó el cambio', description: 'Tu usuario no tiene permiso para esta acción.' }); return; }
    sileo.success({ title: editing ? 'Insumo actualizado' : 'Insumo registrado', description: producto.trim() });
    onSaved(res.data[0], !editing);
  };
  return (
    <Dialog label={editing ? 'Editar insumo' : 'Nuevo insumo'} onClose={() => !action.pending && onClose()} busy={action.pending}>
      <form className="cp-sheet cp-sheet--narrow" onSubmit={submit} noValidate>
        <header className="cp-sheet__head">
          <span className="cp-avatar is-lg" aria-hidden="true"><BrandIcon name="inventory" size={24} /></span>
          <div className="cp-sheet__title"><span className="odo-kicker">{editing ? 'Editar insumo' : 'Nuevo insumo'}</span><h2>{editing ? item.producto : 'Agregar al inventario'}</h2><p>El aviso de stock bajo aparece al llegar al mínimo.</p></div>
          <button type="button" className="cp-close" onClick={onClose} aria-label="Cerrar" disabled={action.pending}><BrandIcon name="close" size={18} /></button>
        </header>
        <div className="cp-form">
          <label className="cp-field cp-field--full"><span>Nombre del insumo *</span><input value={producto} onChange={(e) => { setProducto(e.target.value); setError(null); }} placeholder="Ej.: Guantes de nitrilo M" /></label>
          {!editing && <div className="cp-field"><span>Cantidad inicial</span><Stepper value={cantidad} onChange={setCantidad} min={0} label="Cantidad inicial" /></div>}
          <div className={`cp-field ${editing ? 'cp-field--full' : ''}`}><span>Stock mínimo</span><Stepper value={minimo} onChange={setMinimo} min={1} label="Stock mínimo" /></div>
          {error && <p className="cp-form__error">{error}</p>}
          <div className="cp-form__actions">
            <button type="button" className="saas-btn saas-btn-secondary" onClick={onClose} disabled={action.pending}>Cancelar</button>
            <button type="submit" className="saas-btn saas-btn-primary" disabled={action.pending}><ButtonLabel pending={action.pending}>{editing ? 'Guardar cambios' : 'Agregar insumo'}</ButtonLabel></button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

export default function ClinicInventory() {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'clinic_admin';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [move, setMove] = useState(null);
  const [editing, setEditing] = useState(undefined);

  const invQuery = useSupabaseQuery(
    (signal) => supabase.from('inventario').select('*').order('producto', { ascending: true }).abortSignal(signal).then(unwrap),
    { key: profile?.clinic_id, enabled: !!profile?.clinic_id }
  );
  const inventory = invQuery.data ?? [];
  const counts = useMemo(() => inventory.reduce((acc, i) => ({ ...acc, [levelOf(i)]: (acc[levelOf(i)] || 0) + 1 }), { out: 0, low: 0, ok: 0 }), [inventory]);
  const critical = inventory.filter((i) => levelOf(i) !== 'ok').sort((a, b) => a.cantidad / a.stock_minimo - b.cantidad / b.stock_minimo);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    const rank = { out: 0, low: 1, ok: 2 };
    return inventory
      .filter((i) => (filter === 'all' || levelOf(i) === filter) && (!term || i.producto.toLocaleLowerCase('es').includes(term)))
      .sort((a, b) => rank[levelOf(a)] - rank[levelOf(b)] || a.producto.localeCompare(b.producto, 'es'));
  }, [inventory, search, filter]);

  const replace = (row) => invQuery.setData((prev) => (prev || []).map((i) => (i.id === row.id ? { ...i, ...row } : i)));

  return (
    <div className="clinic-page-container cp-page">
      <header className="cp-page-head">
        <div>
          <span className="odo-kicker">Inventario</span>
          <h2>Insumos al día</h2>
          <p>{inventory.length} insumos · {counts.low + counts.out} requieren atención</p>
        </div>
        {isOwner && <button type="button" className="saas-btn saas-btn-primary cp-cta" onClick={() => setEditing(null)}><BrandIcon name="plus" size={18} />Nuevo insumo</button>}
      </header>

      <div className="inv-kpis">
        {[['all', 'Insumos', inventory.length], ['out', 'Agotados', counts.out], ['low', 'Bajo mínimo', counts.low], ['ok', 'En stock', counts.ok]].map(([id, label, value]) => (
          <button key={id} type="button" className={`inv-kpi is-${id} ${filter === id ? 'is-active' : ''}`} onClick={() => setFilter(id)} aria-pressed={filter === id}>
            <span>{label}</span><b><CountUp value={value} /></b>
          </button>
        ))}
      </div>

      {critical.length > 0 && filter === 'all' && !search && (
        <section className="inv-alert" aria-label="Insumos que requieren reposición">
          <div className="inv-alert__head"><BrandIcon name="alert" size={20} /><div><strong>{critical.length === 1 ? 'Un insumo necesita reposición' : `${critical.length} insumos necesitan reposición`}</strong><p>Ordenados del más urgente al menos urgente.</p></div></div>
          <ul>
            {critical.slice(0, 6).map((i) => (
              <li key={i.id}>
                <span className={`inv-dot is-${levelOf(i)}`} />
                <span className="inv-alert__name">{i.producto}</span>
                <small>{i.cantidad}/{i.stock_minimo}</small>
                {isOwner && <button type="button" onClick={() => setMove({ item: i, mode: 'in' })}>Reponer</button>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="cp-toolbar">
        <div className="cp-search">
          <BrandIcon name="search" size={17} />
          <label className="sd-sr-only" htmlFor="inv-search">Buscar insumo</label>
          <input id="inv-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar insumo" />
        </div>
      </div>

      <LoadingBar active={invQuery.isRefreshing} />
      {invQuery.isError && invQuery.data && <ErrorState compact error={invQuery.error} onRetry={invQuery.refetch} title="No se pudo actualizar" />}
      {invQuery.isLoading || invQuery.status === 'idle' ? (
        <SkeletonCards count={6} height={150} label="Cargando inventario" />
      ) : invQuery.isError && !invQuery.data ? (
        <ErrorState error={invQuery.error} onRetry={invQuery.refetch} title="No se pudo cargar el inventario" />
      ) : invQuery.isEmpty ? (
        <EmptyState title="Inventario vacío" description="Registra tus insumos con un stock mínimo y SmartDental te avisará cuando se estén acabando." action={isOwner ? <button type="button" className="saas-btn saas-btn-primary" onClick={() => setEditing(null)}>Agregar insumo</button> : null} />
      ) : !filtered.length ? (
        <EmptyState title="Sin coincidencias" description="Prueba con otro nombre o filtro." action={<button type="button" className="saas-btn saas-btn-secondary" onClick={() => { setSearch(''); setFilter('all'); }}>Limpiar filtros</button>} />
      ) : (
        <ul className="inv-grid">
          {filtered.map((i, idx) => {
            const level = levelOf(i);
            const scale = Math.max(i.stock_minimo * 3, i.cantidad, 1);
            return (
              <li key={i.id} className={`inv-card is-${level}`} style={{ '--i': Math.min(idx, 12) }}>
                <div className="inv-card__top">
                  <strong title={i.producto}>{i.producto}</strong>
                  <span className={`inv-badge is-${level}`}>{LEVEL[level]}</span>
                </div>
                <div className="inv-card__qty"><b>{i.cantidad}</b><span>unidades</span></div>
                <div className="inv-meter" aria-label={`${i.cantidad} de ${scale} · mínimo ${i.stock_minimo}`}>
                  <i style={{ '--w': `${Math.min(100, (i.cantidad / scale) * 100)}%` }} />
                  <span className="inv-meter__min" style={{ left: `${(i.stock_minimo / scale) * 100}%` }} title={`Mínimo: ${i.stock_minimo}`} />
                </div>
                <div className="inv-card__meta"><span>Mínimo {i.stock_minimo}</span>{isOwner && <button type="button" className="odo-link-btn inv-edit" onClick={() => setEditing(i)}>Editar</button>}</div>
                <div className="inv-card__actions">
                  <button type="button" className="saas-btn saas-btn-secondary" onClick={() => setMove({ item: i, mode: 'out' })} disabled={i.cantidad <= 0}>− Salida</button>
                  {isOwner && <button type="button" className="saas-btn saas-btn-secondary inv-in" onClick={() => setMove({ item: i, mode: 'in' })}>+ Reponer</button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {move && <MoveDialog item={move.item} mode={move.mode} onClose={() => setMove(null)} onDone={(row) => { replace(row); setMove(null); }} />}
      {editing !== undefined && (
        <ItemDialog item={editing} clinicId={profile?.clinic_id} onClose={() => setEditing(undefined)}
          onSaved={(row, created) => { if (created) invQuery.setData((prev) => [...(prev || []), row]); else replace(row); setEditing(undefined); }} />
      )}
    </div>
  );
}
