import React, { useCallback, useEffect, useRef, useState } from 'react';

const HOLD_MS = 2300;
const EXIT_MS = 1000;
let shownThisLoad = false;

export function shouldShowIntro() {
  return typeof window !== 'undefined' && !shownThisLoad && !window.location.hash
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Presentación de marca breve; nunca representa una carga de datos.
 * Secuencia: un anillo de luz se dibuja, el diente gira 360° y el nombre se enfoca.
 * Al salir, la cortina se abre como un diafragma desde el logo y revela la página.
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
    // La apertura nace en el centro del diente.
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
      <div className="sdl-boot__aurora" aria-hidden="true" />
      <div className="sdl-boot__grain" aria-hidden="true" />

      <div className="sdl-boot__center">
        <div className="sdl-boot__halo" aria-hidden="true">
          <svg viewBox="0 0 200 200" className="sdl-boot__ring">
            <defs>
              <linearGradient id="sdl-boot-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#2fe0c8" />
                <stop offset=".55" stopColor="#1e7bff" />
                <stop offset="1" stopColor="#b9a6ff" />
              </linearGradient>
            </defs>
            <circle className="sdl-boot__ring-track" cx="100" cy="100" r="92" />
            <circle className="sdl-boot__ring-draw" cx="100" cy="100" r="92" pathLength="1" />
          </svg>
          <span className="sdl-boot__comet"><i /></span>
          <span className="sdl-boot__pulse" />
        </div>

        <div className="sdl-boot__mark" ref={markRef}>
          <div className="sdl-boot__spin">
            <img src="/landing/logo-mark-256.webp" width="112" height="112" alt="" />
            <span className="sdl-boot__sheen" aria-hidden="true" />
          </div>
          <span className="sdl-boot__shadow" aria-hidden="true" />
        </div>

        <p className="sdl-boot__word" aria-label="SmartDental">
          {'SmartDental'.split('').map((letter, i) => (
            <span aria-hidden="true" key={i} style={{ '--i': i }} className={i > 4 ? 'is-accent' : ''}>{letter}</span>
          ))}
        </p>
        <p className="sdl-boot__tag">Tu consultorio. En armonía.</p>
      </div>

      <div className="sdl-boot__foot">
        <span>ODONTOLOGÍA · ORGANIZACIÓN · EQUIPO</span>
        <button type="button" onClick={finish}>Entrar <span aria-hidden="true">↗</span></button>
      </div>
      <span className="sdl-boot__progress" aria-hidden="true" />
    </div>
  );
}
