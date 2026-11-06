import React, { useEffect, useMemo, useRef, useState } from 'react';
import { sileo } from 'sileo';
import useAuth from '../../hooks/useAuth';
import usePriceList from '../../hooks/usePriceList';
import { ButtonLabel } from '../ui/Loading';
import PriceListEditor from './PriceListEditor';
import Dialog from '../ui/Dialog';
import { BrandIcon } from '../icons/BrandIcons';
import { toothName } from '../../lib/odontogram';
import printNode from '../../lib/printNode';
import { EXTRAS, PROCEDURES, buildQuote, formatSoles, suggestions } from '../../lib/quote';

function PriceListDialog({ onClose, ...props }) {
  return (
    <Dialog label="Tarifario de la clínica" onClose={onClose}>
      <div className="cp-sheet pl-dialog">
        <header className="cp-sheet__head">
          <span className="cp-avatar is-lg" aria-hidden="true"><BrandIcon name="cash" size={24} /></span>
          <div className="cp-sheet__title">
            <span className="odo-kicker">Cotizaciones</span>
            <h2>Tarifario de la clínica</h2>
            <p>Precios en soles que usan todas las cotizaciones. También están en Preferencias.</p>
          </div>
          <button type="button" className="cp-close" onClick={onClose} aria-label="Cerrar"><BrandIcon name="close" size={18} /></button>
        </header>
        <PriceListEditor {...props} />
      </div>
    </Dialog>
  );
}

/**
 * Cotización del tratamiento a partir del odontograma: sugiere procedimientos por pieza según las
 * marcas en mal estado, permite ajustar y guarda una copia junto con el odontograma.
 */
export default function QuotePanel({ model, patient, readOnly, saving, onSaveQuote }) {
  const { profile } = useAuth();
  const admin = profile?.role === 'clinic_admin';
  const priceList = usePriceList(profile?.clinic_id);
  const { available, custom } = priceList;
  const basePrices = priceList.prices;
  const [overrides, setOverrides] = useState({});
  const prices = useMemo(() => ({ ...basePrices, ...overrides }), [basePrices, overrides]);
  const [excluded, setExcluded] = useState([]);
  const [extras, setExtras] = useState({});
  const [includeImplants, setIncludeImplants] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [editing, setEditing] = useState(false);

  // Al cambiar de paciente se reinicia la cotización en curso.
  useEffect(() => { setExcluded([]); setExtras({}); setDiscount(0); setNotes(''); setOverrides({}); setIncludeImplants(false); }, [patient?.id]);

  const items = useMemo(() => suggestions(model, { includeImplants }), [model, includeImplants]);
  const quote = useMemo(() => buildQuote(model, prices, { excluded, extras, discount, includeImplants, custom }), [model, prices, excluded, extras, discount, includeImplants, custom]);
  const hasMissing = useMemo(() => Object.values(model.teeth).some((t) => t.whole?.c === 'missing'), [model]);
  const last = model.quotes?.[0];

  const toggle = (id) => setExcluded((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const setPrice = (code, value) => {
    const n = Number(value);
    setOverrides((o) => ({ ...o, [code]: Number.isFinite(n) && n >= 0 ? n : 0 }));
  };

  const docRef = useRef(null);
  const print = () => printNode(docRef.current, 'quote');

  const today = new Date();
  const validUntil = new Date(today.getTime() + 30 * 86400000);

  return (
    <section className="odo-card quote" aria-label="Cotización del tratamiento">
      <header className="quote__head">
        <div>
          <span className="odo-kicker">Cotización del tratamiento</span>
          <h3>{quote.lines.length ? `${formatSoles(quote.total)} aproximado` : 'Sin tratamientos pendientes'}</h3>
          <p>{items.length
            ? `Calculada a partir de ${quote.teeth} ${quote.teeth === 1 ? 'pieza' : 'piezas'} con hallazgos en rojo. Ajusta lo que necesites antes de entregarla.`
            : 'Marca en rojo los hallazgos del odontograma (caries, fractura, extracción indicada…) y aquí aparecerá el presupuesto.'}</p>
        </div>
        <div className="quote__actions">
          <button type="button" className="saas-btn saas-btn-secondary" onClick={() => setEditing(true)}>{admin ? 'Tarifario' : 'Ver tarifario'}</button>
          <button type="button" className="saas-btn saas-btn-secondary" onClick={print} disabled={!quote.lines.length}>Imprimir</button>
          {!readOnly && (
            <button type="button" className="saas-btn saas-btn-primary" disabled={!quote.lines.length || saving} onClick={() => onSaveQuote(quote, notes)}>
              <ButtonLabel pending={saving} pendingLabel="Guardando…">Guardar cotización</ButtonLabel>
            </button>
          )}
        </div>
      </header>

      <div className="quote__body">
        <div className="quote__items">
          {items.length > 0 && (
            <ul className="quote__list" aria-label="Tratamientos sugeridos por pieza">
              {items.map((s) => {
                const on = !excluded.includes(s.id);
                return (
                  <li key={s.id} className={on ? '' : 'is-off'}>
                    <label>
                      <input type="checkbox" checked={on} onChange={() => toggle(s.id)} />
                      <span className="quote__tooth" title={toothName(s.fdi)}>{s.fdi}</span>
                      <span className="quote__what"><strong>{PROCEDURES[s.code].label}{s.qty > 1 ? ` ×${s.qty}` : ''}</strong><small>{s.reason}</small></span>
                      <span className="quote__amount">{formatSoles(prices[s.code] * s.qty)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <span className="quote__extras-title">Añadir al presupuesto</span>
          <div className="quote__extras">
            {[...EXTRAS.map((code) => ({ code, label: PROCEDURES[code].label, price: prices[code] })), ...custom.map((c) => ({ code: `custom:${c.id}`, label: c.label, price: prices[`custom:${c.id}`] ?? c.price }))].map(({ code, label, price }) => (
              <label key={code} className={`quote__chip ${extras[code] ? 'is-on' : ''}`}>
                <input type="checkbox" checked={!!extras[code]} onChange={(e) => setExtras((x) => ({ ...x, [code]: e.target.checked ? 1 : 0 }))} />
                <span>{label} · {formatSoles(price)}</span>
              </label>
            ))}
            {hasMissing && (
              <label className="quote__chip">
                <input type="checkbox" checked={includeImplants} onChange={(e) => setIncludeImplants(e.target.checked)} />
                <span>Reponer piezas ausentes con implante · {formatSoles(prices.implant)} c/u</span>
              </label>
            )}
          </div>
        </div>

        <aside className="quote__summary" aria-label="Resumen de la cotización">
          <table>
            <thead><tr><th>Procedimiento</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead>
            <tbody>
              {quote.lines.map((l) => (
                <tr key={l.code}>
                  <td>{l.label}{l.teeth.length ? <small>Piezas {l.teeth.join(', ')}</small> : null}</td>
                  <td>{l.qty}</td>
                  <td>
                    <span className="quote-money is-inline"><i>S/</i><input type="number" min="0" step="1" aria-label={`Precio de ${l.label}`} value={l.unit} onChange={(e) => setPrice(l.code, e.target.value)} disabled={readOnly} /></span>
                  </td>
                  <td>{formatSoles(l.total)}</td>
                </tr>
              ))}
              {!quote.lines.length && <tr><td colSpan="4" className="quote__empty">Nada que cotizar todavía.</td></tr>}
            </tbody>
          </table>
          <div className="quote__totals">
            <div><span>Subtotal</span><b>{formatSoles(quote.subtotal)}</b></div>
            <label><span>Descuento</span><span className="quote-money is-pct"><input type="number" min="0" max="100" step="1" value={discount} onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} disabled={readOnly} /><i>%</i></span></label>
            {quote.discountAmount > 0 && <div><span>Ahorro</span><b>− {formatSoles(quote.discountAmount)}</b></div>}
            <div className="is-total"><span>Total aproximado</span><b>{formatSoles(quote.total)}</b></div>
          </div>
          <label className="odo-field quote__notes">
            <span>Nota para el paciente</span>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} disabled={readOnly} placeholder="Ej.: se puede realizar en 3 sesiones; incluye controles." />
          </label>
          {!available && <p className="quote-warning">Precios referenciales. Puedes ajustar cada precio en esta tabla.</p>}
          {last && <p className="quote__last">Última cotización guardada: <b>{formatSoles(last.total)}</b> · {new Date(last.at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })} · {last.by}</p>}
        </aside>
      </div>

      {/* Documento para imprimir o guardar en PDF */}
      <article className="quote-doc" aria-hidden="true" ref={docRef}>
        <header>
          <div><img src="/landing/logo-mark-256.webp" alt="" width="40" height="40" /><b>{profile?.clinic_name || 'Consultorio odontológico'}</b></div>
          <div><span>Cotización de tratamiento</span><time>{today.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</time></div>
        </header>
        <dl>
          <div><dt>Paciente</dt><dd>{patient?.nombre}</dd></div>
          <div><dt>Documento</dt><dd>{patient?.dni || '—'}</dd></div>
          <div><dt>Válida hasta</dt><dd>{validUntil.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>
        </dl>
        <table>
          <thead><tr><th>Procedimiento</th><th>Piezas</th><th>Cant.</th><th>P. unitario</th><th>Total</th></tr></thead>
          <tbody>
            {quote.lines.map((l) => (
              <tr key={l.code}><td>{l.label}</td><td>{l.teeth.join(', ') || '—'}</td><td>{l.qty}</td><td>{formatSoles(l.unit)}</td><td>{formatSoles(l.total)}</td></tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan="4">Subtotal</td><td>{formatSoles(quote.subtotal)}</td></tr>
            {quote.discount > 0 && <tr><td colSpan="4">Descuento ({quote.discount}%)</td><td>− {formatSoles(quote.discountAmount)}</td></tr>}
            <tr className="is-total"><td colSpan="4">Total aproximado</td><td>{formatSoles(quote.total)}</td></tr>
          </tfoot>
        </table>
        {notes.trim() && <p className="quote-doc__notes">{notes}</p>}
        <p className="quote-doc__legal">Presupuesto referencial elaborado a partir del odontograma. El plan y los costos pueden variar según la evaluación clínica y los exámenes complementarios. No constituye comprobante de pago.</p>
      </article>

      {editing && (
        <PriceListDialog
          prices={basePrices}
          custom={custom}
          clinicId={profile?.clinic_id}
          available={available}
          canEdit={admin}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); setOverrides({}); priceList.refetch(); }}
        />
      )}
    </section>
  );
}
