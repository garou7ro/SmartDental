import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Crown, Move3d } from '../icons';

const Odontogram3D = lazy(() => import('./Odontogram3D'));

// Estados que ofrece el odontograma del panel (ClinicOdontograma.jsx).
const STATE_INFO = {
  healthy: { label: 'Sano' },
  caries: { label: 'Caries' },
  restoration: { label: 'Resina' },
  crown: { label: 'Corona' },
  implant: { label: 'Implante' },
  missing: { label: 'Ausente' },
};
const ORDER = ['healthy', 'caries', 'restoration', 'crown', 'implant', 'missing'];

// Datos de ejemplo (los tres primeros son los mismos del ejemplo del panel).
const EXAMPLE = { 14: 'caries', 26: 'crown', 36: 'restoration', 46: 'implant', 38: 'missing', 21: 'restoration' };

const POS_NAMES = ['', 'Incisivo central', 'Incisivo lateral', 'Canino', 'Primer premolar', 'Segundo premolar', 'Primer molar', 'Segundo molar', 'Tercer molar'];
const QUAD = { 1: 'superior derecho', 2: 'superior izquierdo', 3: 'inferior izquierdo', 4: 'inferior derecho' };
const toothName = (f) => `${POS_NAMES[f % 10]} ${QUAD[Math.floor(f / 10)]}`;

// Recorrido clínico habitual: 18→11, 21→28, 38→31, 41→48.
const SEQUENCE = [
  ...[8, 7, 6, 5, 4, 3, 2, 1].map((p) => 10 + p),
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((p) => 20 + p),
  ...[8, 7, 6, 5, 4, 3, 2, 1].map((p) => 30 + p),
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((p) => 40 + p),
];

export function StateGlyph({ state, size = 14 }) {
  const common = { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true, className: `sdl-glyph is-${state}` };
  switch (state) {
    case 'caries':
      return <svg {...common}><circle cx="8" cy="8" r="4.2" fill="currentColor" /></svg>;
    case 'restoration':
      return <svg {...common}><path d="M8 2.5 13.5 8 8 13.5 2.5 8Z" fill="currentColor" /></svg>;
    case 'crown':
      return <Crown size={size} strokeWidth={2} aria-hidden="true" className="sdl-glyph is-crown" />;
    case 'implant':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M5 3h6M6 6h4M6.5 9h3M7 12h2M8 3v11" />
        </svg>
      );
    case 'missing':
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m4.5 4.5 7 7m0-7-7 7" /></svg>;
    default:
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="4.6" /></svg>;
  }
}

export default function OdontogramShowcase({ reducedMotion, defer = false }) {
  const stageRef = useRef(null);
  const labelsRef = useRef({});
  const [mount3d, setMount3d] = useState(false);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(26);
  const [view, setView] = useState('oclusal');
  const data = EXAMPLE;

  useEffect(() => {
    if (defer) return undefined; // nada de trabajo pesado mientras se ve la intro
    const el = stageRef.current;
    if (!el || !('IntersectionObserver' in window)) { setMount3d(true); return undefined; }
    // se construye con antelación y en un momento libre del navegador, no en mitad del scroll
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { idle(() => setMount3d(true), { timeout: 1200 }); io.disconnect(); }
    }, { rootMargin: '900px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [defer]);

  const onSelect = useCallback((f) => setSelected(f), []);
  const onReady = useCallback(() => setReady(true), []);

  const counts = useMemo(() => {
    const c = Object.fromEntries(ORDER.map((s) => [s, 0]));
    SEQUENCE.forEach((f) => { c[data[f] || 'healthy'] += 1; });
    return c;
  }, [data]);

  const state = data[selected] || 'healthy';
  const step = (dir) => {
    const i = SEQUENCE.indexOf(selected);
    setSelected(SEQUENCE[(i + dir + SEQUENCE.length) % SEQUENCE.length]);
  };
  const jumpTo = (s) => {
    const list = SEQUENCE.filter((f) => (data[f] || 'healthy') === s);
    if (!list.length) return;
    const i = list.indexOf(selected);
    setSelected(list[(i + 1) % list.length]);
  };

  return (
    <div className="sdl-odo3d">
      <div className={`sdl-odo3d__stage ${ready ? 'is-ready' : ''}`} ref={stageRef}>
        <div className="sdl-odo3d__glow" aria-hidden="true" />
        <div className="sdl-odo3d__views" role="group" aria-label="Vista del modelo">
          {[['oclusal', 'Oclusal'], ['frontal', 'Frontal']].map(([id, label]) => (
            <button key={id} type="button" aria-pressed={view === id} className={view === id ? 'is-on' : ''} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </div>
        {mount3d && (
          <Suspense fallback={null}>
            <Odontogram3D
              data={data}
              selected={selected}
              view={view}
              onSelect={onSelect}
              onReady={onReady}
              labelsRef={labelsRef}
              reducedMotion={reducedMotion}
            />
          </Suspense>
        )}
        <div className="sdl-odo3d__labels" role="group" aria-label="Piezas dentales, numeración FDI">
          {SEQUENCE.map((f) => {
            const s = data[f] || 'healthy';
            return (
              <button
                key={f}
                type="button"
                ref={(el) => { labelsRef.current[f] = el; }}
                className={`sdl-odo3d__num ${selected === f ? 'is-selected' : ''} ${s !== 'healthy' ? `has-state is-${s}` : ''}`}
                aria-pressed={selected === f}
                aria-label={`Pieza ${f}, ${toothName(f)}: ${STATE_INFO[s].label}`}
                onClick={() => setSelected(f)}
              >
                {f}
                {s !== 'healthy' && <span className="sdl-odo3d__badge"><StateGlyph state={s} size={9} /></span>}
              </button>
            );
          })}
        </div>
        <p className="sdl-odo3d__hint" aria-hidden="true"><Move3d size={14} />Arrastra para girar<span>&nbsp;· toca una pieza</span></p>
        <span className="sdl-tag">Datos de ejemplo</span>
      </div>

      <div className="sdl-odo3d__panel">
        <div className="sdl-odo3d__detail" aria-live="polite">
          <div className="sdl-odo3d__fdi">
            <span className="sdl-mono">Pieza</span>
            <strong>{selected}</strong>
          </div>
          <div className="sdl-odo3d__meta">
            <p className="sdl-odo3d__name">{toothName(selected)}</p>
            <p className={`sdl-odo3d__state is-${state}`}>
              <StateGlyph state={state} />
              {STATE_INFO[state].label}
            </p>
          </div>
          <div className="sdl-odo3d__step">
            <button type="button" onClick={() => step(-1)} aria-label="Pieza anterior"><ChevronLeft size={18} /></button>
            <button type="button" onClick={() => step(1)} aria-label="Pieza siguiente"><ChevronRight size={18} /></button>
          </div>
        </div>
        <ul className="sdl-odo3d__legend" aria-label="Leyenda de estados">
          {ORDER.map((s) => (
            <li key={s}>
              <button
                type="button"
                className={`is-${s} ${state === s ? 'is-active' : ''}`}
                onClick={() => jumpTo(s)}
                disabled={!counts[s]}
                aria-label={`${STATE_INFO[s].label}: ${counts[s]} piezas`}
              >
                <StateGlyph state={s} />
                <span>{STATE_INFO[s].label}</span>
                <span className="sdl-mono">{counts[s]}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="sdl-odo3d__note">Datos de ejemplo. Arrastra el modelo para girarlo.</p>
        <div className="sdl-odo3d__inpanel">
          <p className="sdl-mono">En tu panel</p>
          <ul>
            <li><Check size={15} aria-hidden="true" />Vista 2D y modelo 3D</li>
            <li><Check size={15} aria-hidden="true" />Estado marcado pieza por pieza</li>
            <li><Check size={15} aria-hidden="true" />Guardado en la ficha de cada paciente</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
