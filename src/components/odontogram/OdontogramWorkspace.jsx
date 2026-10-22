import useAuth from '../../hooks/useAuth';
import { writeClinicalPatient } from '../../lib/clinicalRecords';
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sileo } from 'sileo';
import { supabase } from '../../lib/supabaseClient';
import { unwrap } from '../../lib/supabaseErrors';
import useAsyncAction from '../../hooks/useAsyncAction';
import { ButtonLabel } from '../ui/Loading';
import ToothCell, { OdontogramDefs } from './ToothCell';
import ConditionGlyph from './ConditionGlyph';
import {
  CONDITIONS, LAYOUT, STATUS, SURFACES, applyTool, dmft, marks, normalize, setToothNote, summarize,
  surfaceLabel, toArchMap, toothName, toothRecord, withHistory,
} from '../../lib/odontogram';
import './odontogram.css';

const Odontogram3D = lazy(() => import('../landing/Odontogram3D'));

const TOOLS = [...Object.keys(CONDITIONS), 'clear'];
const strip = ({ history, ...rest }) => JSON.stringify(rest);

function Arch({ rows, model, selected, hovered, onSelect, onApply, onHover, label }) {
  return (
    <div className="odo-arch" role="group" aria-label={label}>
      {rows.map((row, i) => (
        <div key={i} className={`odo-quadrant ${i === 0 ? 'is-right' : 'is-left'}`}>
          {row.map((fdi) => (
            <ToothCell
              key={fdi}
              fdi={fdi}
              record={model.teeth[String(fdi)]}
              selected={selected === fdi}
              hovered={hovered === fdi}
              onSelect={onSelect}
              onApply={onApply}
              onHover={onHover}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Odontograma clínico completo de un paciente. Guarda en pacientes.historial_odontograma.
 * Props: patient { id, nombre, dni, historial_odontograma }, author (nombre para el historial),
 * onSaved(nuevoValor) para actualizar la lista del padre.
 */
export default function OdontogramWorkspace({ patient, author, onSaved, readOnly = false }) {
  const { profile } = useAuth();
  const initial = useMemo(() => normalize(patient?.historial_odontograma), [patient?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [model, setModel] = useState(initial);
  const [baseline, setBaseline] = useState(() => strip(initial));
  const [tool, setTool] = useState('caries');
  const [status, setStatus] = useState(CONDITIONS.caries.status);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [view, setView] = useState('chart');
  const [view3d, setView3d] = useState('oclusal');
  const undo = useRef([]);
  const redo = useRef([]);
  const [, force] = useState(0);
  const chartRef = useRef(null);

  // Cambio de paciente: se reinicia todo.
  useEffect(() => {
    setModel(initial);
    setBaseline(strip(initial));
    setSelected(null);
    undo.current = [];
    redo.current = [];
  }, [initial]);

  const dirty = strip(model) !== baseline;
  const layout = LAYOUT[model.dentition];
  const order = useMemo(() => [...layout.upper.flat(), ...layout.lower.flat()], [layout]);
  const index = dmft(model);
  const allMarks = marks(model);
  const counts = useMemo(() => allMarks.reduce((acc, m) => ({ ...acc, [m.c]: (acc[m.c] || 0) + 1 }), {}), [allMarks]);

  const commit = useCallback((next) => {
    setModel((prev) => {
      if (next === prev) return prev;
      undo.current = [...undo.current.slice(-49), prev];
      redo.current = [];
      return next;
    });
    force((n) => n + 1);
  }, []);

  const apply = useCallback((fdi, surface) => {
    setSelected(fdi);
    if (readOnly) return;
    setModel((prev) => {
      const next = applyTool(prev, fdi, tool, status, surface);
      if (next !== prev) {
        undo.current = [...undo.current.slice(-49), prev];
        redo.current = [];
      }
      return next;
    });
    force((n) => n + 1);
  }, [tool, status, readOnly]);

  const pickTool = (id) => {
    setTool(id);
    if (CONDITIONS[id]) setStatus(CONDITIONS[id].status);
  };

  const doUndo = () => {
    const prev = undo.current.pop();
    if (!prev) return;
    redo.current.push(model);
    setModel(prev);
    force((n) => n + 1);
  };
  const doRedo = () => {
    const next = redo.current.pop();
    if (!next) return;
    undo.current.push(model);
    setModel(next);
    force((n) => n + 1);
  };

  // Atajos: 1–9 herramientas, 0 borrar, flechas para recorrer, Ctrl+Z / Ctrl+Shift+Z.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) doRedo(); else doUndo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const hit = Object.entries(CONDITIONS).find(([, c]) => c.key === e.key);
      if (hit) { pickTool(hit[0]); return; }
      if (e.key === '0') { setTool('clear'); return; }
      if (!chartRef.current?.contains(document.activeElement)) return;
      if (['ArrowRight', 'ArrowLeft'].includes(e.key) && selected) {
        e.preventDefault();
        const i = order.indexOf(selected);
        const next = order[(i + (e.key === 'ArrowRight' ? 1 : -1) + order.length) % order.length];
        setSelected(next);
        chartRef.current.querySelector(`[data-fdi="${next}"]`)?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Aviso al salir con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = useAsyncAction((value) => writeClinicalPatient(profile, patient, { historial_odontograma: value }));
  const handleSave = async () => {
    if (!patient || !dirty) return;
    const value = withHistory(model, author);
    const res = await save.run(value);
    if (res.skipped) return;
    if (!res.ok) {
      sileo.error({ title: 'No se pudo guardar el odontograma', description: res.error.message });
      return;
    }
    if (!Array.isArray(res.data) || !res.data.length) {
      sileo.error({ title: 'No se confirmó el guardado', description: 'Tu usuario no tiene permiso para modificar esta ficha.' });
      return;
    }
    setModel(value);
    setBaseline(strip(value));
    onSaved?.(value);
    sileo.success({ title: 'Odontograma guardado', description: `${patient.nombre}: ${summarize(value)}.` });
  };
  const discard = () => {
    setModel(initial);
    setBaseline(strip(initial));
    undo.current = [];
    redo.current = [];
    force((n) => n + 1);
  };

  const record = selected ? toothRecord(model, selected) : null;
  const archMap = useMemo(() => toArchMap(model), [model]);
  const onSelect3d = useCallback((fdi) => setSelected(fdi), []);

  return (
    <div className="odo" data-dirty={dirty || undefined}>
      <OdontogramDefs />

      {/* Barra de herramientas */}
      <div className="odo-toolbar" role="toolbar" aria-label="Herramientas del odontograma">
        <div className="odo-tools" role="radiogroup" aria-label="Hallazgo o tratamiento">
          {TOOLS.map((id) => {
            const info = CONDITIONS[id];
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={tool === id}
                className={`odo-tool ${tool === id ? 'is-active' : ''}`}
                onClick={() => pickTool(id)}
                disabled={readOnly}
                title={info ? `${info.label} — ${info.hint} (tecla ${info.key})` : 'Borrar marcas (tecla 0)'}
              >
                <ConditionGlyph condition={id} status={tool === id ? status : info?.status} />
                <span>{info ? info.label : 'Borrar'}</span>
                {counts[id] ? <b>{counts[id]}</b> : null}
              </button>
            );
          })}
        </div>
        <div className="odo-toolbar__side">
          <div className="odo-status" role="radiogroup" aria-label="Estado de la marca">
            {Object.entries(STATUS).map(([key, s]) => (
              <button key={key} type="button" role="radio" aria-checked={status === key} disabled={readOnly || tool === 'clear'}
                className={`is-${key} ${status === key ? 'is-active' : ''}`} onClick={() => setStatus(key)}>
                <i style={{ background: s.color }} />{s.label}
              </button>
            ))}
          </div>
          <div className="odo-history-btns">
            <button type="button" className="odo-icon-btn" onClick={doUndo} disabled={!undo.current.length} aria-label="Deshacer (Ctrl+Z)" title="Deshacer (Ctrl+Z)">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
            </button>
            <button type="button" className="odo-icon-btn" onClick={doRedo} disabled={!redo.current.length} aria-label="Rehacer (Ctrl+Shift+Z)" title="Rehacer (Ctrl+Shift+Z)">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="odo-body">
        <section className="odo-stage" aria-label="Odontograma">
          <div className="odo-stage__head">
            <div className="odo-seg" role="tablist" aria-label="Vista">
              <button type="button" role="tab" aria-selected={view === 'chart'} className={view === 'chart' ? 'is-active' : ''} onClick={() => setView('chart')}>Odontograma</button>
              <button type="button" role="tab" aria-selected={view === '3d'} className={view === '3d' ? 'is-active' : ''} onClick={() => setView('3d')}>Arcada 3D</button>
            </div>
            {view === 'chart' ? (
              <div className="odo-seg" role="radiogroup" aria-label="Dentición">
                {[['permanent', 'Permanente'], ['temporary', 'Temporal']].map(([key, label]) => (
                  <button key={key} type="button" role="radio" aria-checked={model.dentition === key} className={model.dentition === key ? 'is-active' : ''}
                    onClick={() => { if (model.dentition !== key) { commit({ ...model, dentition: key }); setSelected(null); } }}>{label}</button>
                ))}
              </div>
            ) : (
              <div className="odo-seg" role="radiogroup" aria-label="Ángulo de la arcada">
                {[['oclusal', 'Oclusal'], ['frontal', 'Frontal']].map(([key, label]) => (
                  <button key={key} type="button" role="radio" aria-checked={view3d === key} className={view3d === key ? 'is-active' : ''} onClick={() => setView3d(key)}>{label}</button>
                ))}
              </div>
            )}
          </div>

          {view === 'chart' ? (
            <div className="odo-chart" ref={chartRef} onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
              <span className="odo-side is-r" aria-hidden="true">Derecha del paciente</span>
              <span className="odo-side is-l" aria-hidden="true">Izquierda del paciente</span>
              <Arch rows={layout.upper} model={model} selected={selected} hovered={hovered} onSelect={setSelected} onApply={apply} onHover={setHovered} label="Arcada superior" />
              <div className="odo-occlusal" aria-hidden="true"><span>Plano oclusal</span></div>
              <Arch rows={layout.lower} model={model} selected={selected} hovered={hovered} onSelect={setSelected} onApply={apply} onHover={setHovered} label="Arcada inferior" />
              {hovered && <p className="odo-hoverline" aria-hidden="true"><b>{hovered}</b> {toothName(hovered)}</p>}
            </div>
          ) : (
            <div className="odo-3d">
              <Suspense fallback={<div className="odo-3d__loading">Preparando la arcada…</div>}>
                <Odontogram3D data={archMap} selected={selected} view={view3d} onSelect={onSelect3d} reducedMotion={window.matchMedia('(prefers-reduced-motion: reduce)').matches} />
              </Suspense>
              <p className="odo-3d__hint">Arrastra para girar · Toca una pieza para inspeccionarla · Dentición permanente</p>
            </div>
          )}

          <ul className="odo-legend" aria-label="Leyenda">
            <li><i style={{ background: STATUS.bad.color }} />Rojo: mal estado o hallazgo</li>
            <li><i style={{ background: STATUS.good.color }} />Azul: buen estado o tratamiento realizado</li>
            <li className="odo-legend__keys">Teclas 1–9 herramientas · 0 borrar · ← → recorrer</li>
          </ul>
        </section>

        {/* Inspector de pieza */}
        <aside className="odo-inspector" aria-label="Detalle de la pieza">
          {selected ? (
            <>
              <div className="odo-inspector__head">
                <div className="odo-inspector__tooth">
                  <ToothCell fdi={selected} record={record} size={1.35} interactive={!readOnly} onApply={apply} />
                </div>
                <div>
                  <span className="odo-kicker">Pieza {selected}</span>
                  <h3>{toothName(selected)}</h3>
                  <p>{record.whole ? `${CONDITIONS[record.whole.c].label} · ${STATUS[record.whole.s].label.toLowerCase()}` : 'Sin condición general'}</p>
                </div>
              </div>
              <div className="odo-surfaces" role="group" aria-label="Superficies">
                {SURFACES.map((s) => {
                  const mark = record.surfaces[s];
                  return (
                    <button key={s} type="button" className={`odo-surface-row ${mark ? `is-${mark.s}` : ''}`} onClick={() => apply(selected, s)} disabled={readOnly}>
                      <span className="odo-surface-row__letter">{s === 'L' && selected < 30 ? 'P' : s}</span>
                      <span className="odo-surface-row__name">{surfaceLabel(selected, s)}</span>
                      <span className="odo-surface-row__state">{mark ? CONDITIONS[mark.c].label : 'Sana'}</span>
                    </button>
                  );
                })}
              </div>
              <label className="odo-field">
                <span>Nota de la pieza</span>
                <textarea rows={3} value={record.note || ''} disabled={readOnly} placeholder="Ej.: sensibilidad al frío, control en 6 meses…"
                  onChange={(e) => setModel((prev) => setToothNote(prev, selected, e.target.value))} />
              </label>
              {!readOnly && (record.whole || Object.keys(record.surfaces).length > 0) && (
                <button type="button" className="odo-link-btn" onClick={() => commit(applyTool(model, selected, 'clear'))}>Quitar todas las marcas de la pieza</button>
              )}
            </>
          ) : (
            <div className="odo-inspector__empty">
              <ConditionGlyph condition={tool} status={status} size={42} />
              <h3>Selecciona una pieza</h3>
              <p>Con la herramienta <strong>{CONDITIONS[tool]?.label || 'Borrar'}</strong> activa, toca una superficie del diagrama {CONDITIONS[tool]?.scope === 'whole' ? 'o la silueta de la pieza' : ''} para marcarla. Vuelve a tocar para quitarla.</p>
            </div>
          )}
        </aside>
      </div>

      {/* Índice, notas e historial */}
      <div className="odo-foot">
        <section className="odo-card odo-index" aria-label={`Índice ${index.label}`}>
          <span className="odo-kicker">Índice {index.label}</span>
          <div className="odo-index__grid">
            {[['C', index.decayed, model.dentition === 'temporary' ? 'Cariadas' : 'Cariadas'], ['P', index.missing, model.dentition === 'temporary' ? 'Extracción indicada' : 'Perdidas'], ['O', index.filled, 'Obturadas']].map(([k, v, l]) => (
              <div key={k}><b>{v}</b><span>{l}</span></div>
            ))}
            <div className="is-total"><b>{index.total}</b><span>Total</span></div>
          </div>
          <p>{summarize(model)}</p>
        </section>
        <label className="odo-card odo-notes">
          <span className="odo-kicker">Observaciones generales</span>
          <textarea rows={4} value={model.notes} disabled={readOnly} placeholder="Diagnóstico general, plan de tratamiento, especificaciones…" onChange={(e) => setModel((prev) => ({ ...prev, notes: e.target.value }))} />
        </label>
        <section className="odo-card odo-timeline" aria-label="Historial de versiones">
          <span className="odo-kicker">Historial</span>
          {model.history?.length ? (
            <ol>
              {model.history.slice(0, 5).map((h) => (
                <li key={h.at}>
                  <time dateTime={h.at}>{new Date(h.at).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
                  <span>{h.summary}</span>
                  <small>{h.by}</small>
                </li>
              ))}
            </ol>
          ) : <p className="odo-muted">Cada vez que guardes, quedará registrada una versión.</p>}
        </section>
      </div>

      {!readOnly && (
        <div className={`odo-savebar ${dirty ? 'is-visible' : ''}`} role="region" aria-label="Cambios sin guardar" aria-hidden={!dirty}>
          <span><i />Cambios sin guardar en el odontograma de <strong>{patient?.nombre}</strong></span>
          <div>
            <button type="button" className="saas-btn saas-btn-secondary" onClick={discard} disabled={save.pending} tabIndex={dirty ? 0 : -1}>Descartar</button>
            <button type="button" className="saas-btn saas-btn-primary" onClick={handleSave} disabled={save.pending} tabIndex={dirty ? 0 : -1}>
              <ButtonLabel pending={save.pending} pendingLabel="Guardando…">Guardar odontograma</ButtonLabel>
            </button>
          </div>
        </div>
      )}
      <button type="button" className="odo-print saas-btn saas-btn-secondary" onClick={() => window.print()}>Imprimir</button>
    </div>
  );
}
