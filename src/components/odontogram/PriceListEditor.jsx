import React, { useEffect, useMemo, useState } from 'react';
import { sileo } from 'sileo';
import useAsyncAction from '../../hooks/useAsyncAction';
import { supabase } from '../../lib/supabaseClient';
import { unwrap } from '../../lib/supabaseErrors';
import { ButtonLabel } from '../ui/Loading';
import { BrandIcon } from '../icons/BrandIcons';
import { CATEGORIES, MAX_CUSTOM, MAX_PRICE, PROCEDURES, defaultPrices, formatSoles, serializePriceList } from '../../lib/quote';
import './price-list.css';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const toText = (n) => (n === null || n === undefined ? '' : String(n));
const DEFAULTS = defaultPrices();
const EXAMPLES = ['Blanqueamiento dental', 'Ortodoncia (control mensual)', 'Carillas de resina', 'Prótesis removible', 'Férula de descarga', 'Radiografía periapical'];

/**
 * Tarifario de la clínica: precios por especialidad, ajuste global por porcentaje, vuelta al precio
 * referencial por fila y procedimientos propios (blanqueamiento, ortodoncia…) que luego se añaden a
 * cualquier cotización. Solo el administrador lo edita; el resto del equipo lo consulta.
 */
export default function PriceListEditor({ clinicId, prices, custom, canEdit, available, onSaved }) {
  const editable = canEdit && available;
  const [draft, setDraft] = useState(() => Object.fromEntries(Object.entries(prices).map(([k, v]) => [k, toText(v)])));
  const [own, setOwn] = useState(() => custom.map((c) => ({ ...c, price: toText(c.price) })));
  const [query, setQuery] = useState('');
  const [pct, setPct] = useState('10');

  // Si el tarifario cambia en el servidor (otro guardado), se recarga el borrador.
  const sourceKey = JSON.stringify({ prices, custom });
  useEffect(() => {
    setDraft(Object.fromEntries(Object.entries(prices).map(([k, v]) => [k, toText(v)])));
    setOwn(custom.map((c) => ({ ...c, price: toText(c.price) })));
  }, [sourceKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const num = (v) => { const n = Number(v); return v !== '' && Number.isFinite(n) ? n : null; };
  const invalid = (v) => { const n = num(v); return n === null || n < 0 || n > MAX_PRICE; };
  // Una fila propia recién agregada y aún vacía no es un error: simplemente no se guarda.
  const blank = (c) => !c.label.trim() && c.price === '';
  const errors = Object.keys(PROCEDURES).filter((k) => invalid(draft[k])).length + own.filter((c) => !blank(c) && (!c.label.trim() || invalid(c.price))).length;
  const dirty = Object.keys(PROCEDURES).some((k) => num(draft[k]) !== prices[k])
    || JSON.stringify(own.filter((c) => !blank(c)).map((c) => [c.id, c.label.trim(), num(c.price)])) !== JSON.stringify(custom.map((c) => [c.id, c.label, c.price]));

  const save = useAsyncAction((value) => supabase.from('clinics').update({ price_list: value }).eq('id', clinicId).select('id').then(unwrap));
  const submit = async () => {
    if (errors) return;
    const value = serializePriceList(Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, num(v)])), own.map((c) => ({ ...c, price: num(c.price) })));
    const res = await save.run(value);
    if (res.skipped) return;
    if (!res.ok || !res.data?.length) {
      sileo.error({ title: 'No se pudo guardar el tarifario', description: res.error?.message || 'Tu usuario no puede modificar el tarifario de la clínica.' });
      return;
    }
    sileo.success({ title: 'Tarifario guardado', description: 'Las cotizaciones nuevas ya usan estos precios.' });
    onSaved?.();
  };
  const discard = () => {
    setDraft(Object.fromEntries(Object.entries(prices).map(([k, v]) => [k, toText(v)])));
    setOwn(custom.map((c) => ({ ...c, price: toText(c.price) })));
  };

  const adjustAll = (sign) => {
    const p = Number(pct);
    if (!Number.isFinite(p) || p <= 0 || p > 300) return;
    const factor = 1 + (sign * p) / 100;
    // Redondeo a múltiplos de S/ 5: así quedan precios que se pueden decir en consulta.
    const round = (n) => Math.max(0, Math.round((n * factor) / 5) * 5);
    setDraft((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, num(v) === null ? v : String(round(num(v)))])));
    setOwn((list) => list.map((c) => (num(c.price) === null ? c : { ...c, price: String(round(num(c.price))) })));
  };
  const resetAll = () => setDraft(Object.fromEntries(Object.entries(DEFAULTS).map(([k, v]) => [k, String(v)])));
  const addOwn = () => setOwn((list) => (list.length >= MAX_CUSTOM ? list : [...list, { id: `c${Date.now().toString(36)}`, label: '', price: '' }]));

  const term = norm(query.trim());
  const groups = useMemo(() => CATEGORIES.map((g) => ({
    ...g,
    codes: g.codes.filter((k) => !term || norm(`${PROCEDURES[k].label} ${PROCEDURES[k].hint} ${g.label}`).includes(term)),
  })).filter((g) => g.codes.length), [term]);
  const ownShown = own.filter((c) => !term || norm(c.label).includes(term) || !c.label);

  const resin = num(draft.resin) ?? 0;
  const extra = num(draft.resinExtra) ?? 0;

  return (
    <div className={`pl ${editable ? '' : 'is-readonly'}`}>
      <div className="pl-top">
        <label className="pl-search">
          <BrandIcon name="search" size={16} />
          <span className="sd-sr-only">Buscar procedimiento</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar procedimiento…" />
        </label>
        {editable && (
          <div className="pl-tools" role="group" aria-label="Ajuste rápido de precios">
            <span>Ajustar todo</span>
            <span className="pl-pct"><input type="number" min="1" max="300" value={pct} onChange={(e) => setPct(e.target.value)} aria-label="Porcentaje" /><i>%</i></span>
            <button type="button" className="pl-chip" onClick={() => adjustAll(1)} title="Subir todos los precios">Subir</button>
            <button type="button" className="pl-chip" onClick={() => adjustAll(-1)} title="Bajar todos los precios">Bajar</button>
            <button type="button" className="pl-chip is-ghost" onClick={resetAll}>Precios referenciales</button>
          </div>
        )}
      </div>

      <p className="pl-example">
        <BrandIcon name="sparkles" size={15} />
        <span>Así se cotiza: una caries en <b>2 caras</b> = resina {formatSoles(resin)} + cara adicional {formatSoles(extra)} = <b>{formatSoles(resin + extra)}</b>.</span>
      </p>
      {!available && <p className="quote-warning">El servidor todavía no permite guardar el tarifario. Mientras tanto se usan los precios referenciales.</p>}
      {!canEdit && available && <p className="pl-note">Solo el titular de la clínica puede cambiar los precios. Aquí puedes consultarlos.</p>}

      <div className="pl-grid">
        {groups.map((g) => (
          <section key={g.key} className="pl-group" aria-label={g.label}>
            <h4>{g.label}</h4>
            <ul>
              {g.codes.map((k) => {
                const changed = num(draft[k]) !== DEFAULTS[k];
                const bad = invalid(draft[k]);
                return (
                  <li key={k} className={bad ? 'is-invalid' : ''}>
                    <span className="pl-name">
                      <strong>{PROCEDURES[k].label}</strong>
                      <small>{PROCEDURES[k].hint}{changed && !bad && <> · ref. {formatSoles(DEFAULTS[k])}{editable && <button type="button" className="pl-reset" onClick={() => setDraft((d) => ({ ...d, [k]: String(DEFAULTS[k]) }))}>restablecer</button>}</>}</small>
                    </span>
                    <span className="pl-money">
                      <i>S/</i>
                      <input type="number" inputMode="decimal" min="0" max={MAX_PRICE} step="5" value={draft[k]} disabled={!editable} aria-label={`Precio de ${PROCEDURES[k].label}`} aria-invalid={bad || undefined}
                        onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <section className="pl-group is-own" aria-label="Procedimientos de la clínica">
          <h4>Procedimientos de la clínica</h4>
          <p className="pl-own-hint">Agrega lo que ofreces y no sale del odontograma, como blanqueamiento u ortodoncia. Luego podrás sumarlo a cualquier cotización con un toque.</p>
          {ownShown.length > 0 && (
            <ul>
              {ownShown.map((c, i) => {
                const bad = !blank(c) && (!c.label.trim() || invalid(c.price));
                return (
                  <li key={c.id} className={bad ? 'is-invalid' : ''}>
                    <input className="pl-own-name" value={c.label} disabled={!editable} maxLength={80} placeholder={`Ej.: ${EXAMPLES[i % EXAMPLES.length]}`} aria-label="Nombre del procedimiento"
                      onChange={(e) => setOwn((list) => list.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)))} />
                    <span className="pl-money">
                      <i>S/</i>
                      <input type="number" inputMode="decimal" min="0" max={MAX_PRICE} step="5" value={c.price} disabled={!editable} aria-label={`Precio de ${c.label || 'procedimiento'}`}
                        onChange={(e) => setOwn((list) => list.map((x) => (x.id === c.id ? { ...x, price: e.target.value } : x)))} />
                    </span>
                    {editable && <button type="button" className="pl-remove" aria-label={`Quitar ${c.label || 'procedimiento'}`} onClick={() => setOwn((list) => list.filter((x) => x.id !== c.id))}><BrandIcon name="close" size={14} /></button>}
                  </li>
                );
              })}
            </ul>
          )}
          {editable && own.length < MAX_CUSTOM && <button type="button" className="pl-add" onClick={addOwn}><BrandIcon name="plus" size={15} />Agregar procedimiento</button>}
          {!editable && !own.length && <p className="pl-own-hint">La clínica aún no agregó procedimientos propios.</p>}
        </section>
      </div>

      {editable && (
        <div className={`pl-savebar ${dirty ? 'is-visible' : ''}`} aria-hidden={!dirty}>
          <span>{errors ? `Revisa ${errors === 1 ? '1 precio' : `${errors} precios`}: deben ser montos entre S/ 0 y S/ ${MAX_PRICE.toLocaleString('es-PE')} y los procedimientos propios necesitan nombre.` : 'Tienes cambios sin guardar en el tarifario.'}</span>
          <div>
            <button type="button" className="saas-btn saas-btn-secondary" onClick={discard} disabled={save.pending} tabIndex={dirty ? 0 : -1}>Descartar</button>
            <button type="button" className="saas-btn saas-btn-primary" onClick={submit} disabled={save.pending || errors > 0} tabIndex={dirty ? 0 : -1}>
              <ButtonLabel pending={save.pending} pendingLabel="Guardando…">Guardar tarifario</ButtonLabel>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
