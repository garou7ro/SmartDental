import React, { useCallback, useEffect, useRef, useState } from 'react';

const HOLD_MS = 2600;
const EXIT_MS = 1000;
let shownThisLoad = false;

export function shouldShowIntro() {
  return typeof window !== 'undefined' && !shownThisLoad && !window.location.hash
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/*
 * Arcada dental de 32 piezas en notación FDI, vista de frente: arriba 18…11 21…28 y abajo
 * 48…41 31…38. Cada pieza se orienta según la normal de la elipse y su tamaño depende del
 * tipo (incisivo, canino, premolar, molar). Se calcula una sola vez al cargar el módulo.
 */
const RX = 150;
const RY = 104;
const SIZE = [[10, 18], [10, 17], [12, 20], [14, 17], [14, 17], [21, 19], [21, 19], [19, 18]];
// Piezas que terminan marcadas como en un odontograma: rojo = hallazgo, azul = tratamiento.
const MARKS = { 16: 'bad', 46: 'bad', 26: 'good', 36: 'good', 11: 'good' };

const TEETH = [true, false].flatMap((upper) => Array.from({ length: 16 }, (_, t) => {
  const a = upper ? Math.PI + ((t + 0.5) / 16) * Math.PI : Math.PI - ((t + 0.5) / 16) * Math.PI;
  const x = RX * Math.cos(a);
  const y = RY * Math.sin(a) * (upper ? 1 : 1.04) + (upper ? -6 : 6);
  const normal = Math.atan2(y / (RY * RY), x / (RX * RX));
  const k = Math.floor(Math.abs(t - 7.5)); // 0 = incisivo central … 7 = tercer molar
  const quadrant = upper ? (t < 8 ? 1 : 2) : (t < 8 ? 4 : 3);
  const fdi = quadrant * 10 + (t < 8 ? 8 - t : t - 7);
  const [w, h] = SIZE[k];
  return { fdi, x, y, w, h, k, rot: (normal * 180) / Math.PI + 90, mark: MARKS[fdi] };
}));

/**
 * Presentación de marca breve; nunca representa una carga de datos.
 * Secuencia: la arcada se enciende desde los incisivos hacia los molares, algunas piezas
 * toman el color clínico (rojo hallazgo, azul tratamiento), el diente gira 360° y el nombre
 * se enfoca. Al salir, la cortina se abre como un diafragma desde el diente.
 */
export default function BrandIntro({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  const exiting = useRef(false);
  const exitTimer = useRef(null);
  const rootRef = useRef(null);
  const markRef = useRef(null);

  const finish = useCallback(() => {
    if (exiting.current) return;
    exiting.current = true;
    const mark = markRef.current?.getBoundingClientRect();
    if (mark && rootRef.current) {
      rootRef.current.style.setProperty('--sdl-boot-x', `${mark.left + mark.width / 2}px`);
      rootRef.current.style.setProperty('--sdl-boot-y', `${mark.top + mark.height / 2}px`);
    }
    setLeaving(true);
    exitTimer.current = window.setTimeout(onDone, EXIT_MS);
  }, [onDone]);

  useEffect(() => {
    shownThisLoad = true;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    window.scrollTo(0, 0);
    const page = document.querySelector('.sdl');
    const siblings = [...(page?.children || [])].filter(el => !el.classList.contains('sdl-boot'));
    const previous = siblings.map(el => el.inert);
    siblings.forEach(el => { el.inert = true; });
    const timer = window.setTimeout(finish, HOLD_MS);
    const escape = e => { if (e.key === 'Escape') finish(); };
    document.addEventListener('keydown', escape);
    return () => {
      clearTimeout(timer);
      clearTimeout(exitTimer.current);
      exiting.current = false;
      document.removeEventListener('keydown', escape);
      html.style.overflow = prev;
      siblings.forEach((el, i) => { el.inert = previous[i]; });
    };
  }, [finish]);

  return (
    <div ref={rootRef} className={`sdl-boot ${leaving ? 'is-leaving' : ''}`} aria-label="Bienvenido a SmartDental">
      <div className="sdl-boot__glow" aria-hidden="true" />
      <div className="sdl-boot__grid" aria-hidden="true" />

      <div className="sdl-boot__center">
        <div className="sdl-boot__stage">
          <svg className="sdl-boot__arch" viewBox="-190 -140 380 280" aria-hidden="true">
            <ellipse className="sdl-boot__orbit" cx="0" cy="0" rx={RX + 26} ry={RY + 24} pathLength="1" />
            {TEETH.map((t) => (
              <g key={t.fdi} transform={`translate(${t.x.toFixed(1)} ${t.y.toFixed(1)}) rotate(${t.rot.toFixed(1)})`}>
                <rect
                  className={`sdl-boot__tooth${t.mark ? ` is-${t.mark}` : ''}`}
                  x={-t.w / 2} y={-t.h / 2} width={t.w} height={t.h} rx={t.k < 3 ? 4 : 5}
                  style={{ '--d': `${180 + t.k * 70}ms` }}
                />
              </g>
            ))}
          </svg>
          <div className="sdl-boot__mark" ref={markRef}>
            <div className="sdl-boot__spin">
              <img src="/landing/logo-mark-256.webp" width="112" height="112" alt="" />
            </div>
          </div>
        </div>

        <p className="sdl-boot__word" aria-label="SmartDental">
          {'SmartDental'.split('').map((letter, i) => (
            <span aria-hidden="true" key={i} style={{ '--i': i }} className={i > 4 ? 'is-accent' : ''}>{letter}</span>
          ))}
        </p>
        <p className="sdl-boot__tag">Tu consultorio dental, <b>en orden.</b></p>
      </div>

      <div className="sdl-boot__foot">
        <span><i className="is-bad" />Hallazgo<i className="is-good" />Tratamiento<em>32 piezas · notación FDI</em></span>
        <button type="button" onClick={finish}>Entrar <span aria-hidden="true">↗</span></button>
      </div>
      <span className="sdl-boot__progress" aria-hidden="true" />
    </div>
  );
}
