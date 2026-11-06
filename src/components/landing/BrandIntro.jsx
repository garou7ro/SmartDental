import React, { useCallback, useEffect, useRef, useState } from 'react';

const EXIT_MS = 760;
let shownThisLoad = false;

export function shouldShowIntro() {
  return typeof window !== 'undefined' && !shownThisLoad && !window.location.hash
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/*
 * Spot de marca al estilo de un anuncio de televisión: cortes secos cada ~230 ms con una
 * palabra gigante sobre un bloque de color, un cierre «Todo, en orden.» y el logo que cae
 * girando. Cada plano se apila sobre el anterior y solo se vuelve visible en su instante,
 * así los cortes no dependen de JavaScript y no hay fundidos que cuesten fotogramas.
 */
const SHOTS = [
  { word: 'Citas.', bg: '#05080f', fg: '#ffffff' },
  { word: 'Pacientes.', bg: '#2fe0c8', fg: '#05080f' },
  { word: 'Odontograma.', bg: '#f5f3ef', fg: '#05080f', dots: true },
  { word: 'Inventario.', bg: '#1e5bff', fg: '#ffffff' },
  { word: 'Caja.', bg: '#05080f', fg: '#2fe0c8' },
];
const CUT_MS = 230;
const CLOSE_AT = SHOTS.length * CUT_MS; // «Todo, en orden.»
const LOGO_AT = CLOSE_AT + 560; // logo final
const HOLD_MS = LOGO_AT + 1250;

const size = word => `min(${(158 / word.length).toFixed(1)}vw, 30vh)`;

export default function BrandIntro({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  const exiting = useRef(false);
  const exitTimer = useRef(null);

  const finish = useCallback(() => {
    if (exiting.current) return;
    exiting.current = true;
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
    // Un clic en cualquier parte o Esc la cierran antes de tiempo.
    <div className={`sdl-boot ${leaving ? 'is-leaving' : ''}`} aria-label="Bienvenido a SmartDental" onClick={finish} role="presentation">
      {SHOTS.map((shot, i) => (
        <section key={shot.word} className="sdl-shot" style={{ '--at': `${i * CUT_MS}ms`, '--bg': shot.bg, '--fg': shot.fg }} aria-hidden="true">
          <h2 className="sdl-shot__word" style={{ fontSize: size(shot.word) }}>{shot.word}</h2>
          {shot.dots && <span className="sdl-shot__dots"><i className="is-bad" /><i className="is-good" /></span>}
        </section>
      ))}

      <section className="sdl-shot sdl-shot--close" style={{ '--at': `${CLOSE_AT}ms` }} aria-hidden="true">
        <h2 className="sdl-shot__word"><span>Todo,</span> <span className="is-accent">en orden.</span></h2>
      </section>

      <section className="sdl-shot sdl-shot--logo" style={{ '--at': `${LOGO_AT}ms` }}>
        <div className="sdl-boot__mark">
          <img src="/landing/logo-mark-256.webp" width="112" height="112" alt="" />
        </div>
        <p className="sdl-boot__word" aria-label="SmartDental">
          <span aria-hidden="true">Smart</span><span aria-hidden="true" className="is-accent">Dental</span>
        </p>
      </section>

    </div>
  );
}
