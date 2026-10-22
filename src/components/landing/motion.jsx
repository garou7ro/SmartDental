import React, { useEffect } from 'react';

// Utilidades de movimiento de la landing. Todo se comunica al CSS mediante variables
// (--rx, --ry, --mx, --my, --p…) para no provocar re-renders de React en cada frame.

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const finePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/**
 * Interacciones de puntero delegadas en un solo listener:
 *  - [data-tilt]       inclinación 3D sutil + reflejo de luz (--rx, --ry, --mx, --my)
 *  - [data-spotlight]  foco que sigue al cursor (--sx, --sy)
 *  - [data-magnetic]   atracción leve hacia el cursor (--tx, --ty)
 */
export function usePointerEffects(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion() || !finePointer()) return undefined;

    let frame = 0;
    let last = null;
    const active = new Set();

    const apply = () => {
      frame = 0;
      if (!last) return;
      const { x, y, target } = last;

      const tilt = target.closest('[data-tilt]');
      const spot = target.closest('[data-spotlight]');
      const mag = target.closest('[data-magnetic]');

      for (const el of active) {
        if (el !== tilt && el !== mag) reset(el);
      }
      active.clear();

      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const px = (x - r.left) / r.width;
        const py = (y - r.top) / r.height;
        tilt.style.setProperty('--rx', `${(0.5 - py) * 6}deg`);
        tilt.style.setProperty('--ry', `${(px - 0.5) * 8}deg`);
        tilt.style.setProperty('--mx', `${px * 100}%`);
        tilt.style.setProperty('--my', `${py * 100}%`);
        tilt.classList.add('is-tilting');
        active.add(tilt);
      }
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty('--sx', `${x - r.left}px`);
        spot.style.setProperty('--sy', `${y - r.top}px`);
      }
      if (mag) {
        const r = mag.getBoundingClientRect();
        const dx = x - (r.left + r.width / 2);
        const dy = y - (r.top + r.height / 2);
        mag.style.setProperty('--tx', `${dx * 0.18}px`);
        mag.style.setProperty('--ty', `${dy * 0.28}px`);
        active.add(mag);
      }
    };

    const reset = (el) => {
      el.classList.remove('is-tilting');
      for (const v of ['--rx', '--ry', '--tx', '--ty']) el.style.removeProperty(v);
    };

    const onMove = (e) => {
      last = { x: e.clientX, y: e.clientY, target: e.target };
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      for (const el of active) reset(el);
      active.clear();
      last = null;
    };

    root.addEventListener('pointermove', onMove, { passive: true });
    root.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
    };
  }, [rootRef]);
}

/**
 * Progreso de scroll de cada [data-progress] dentro de root, como --p entre 0 y 1:
 * por defecto 0 cuando su parte superior llega al 85 % de la ventana y 1 cuando su parte inferior llega al 50 %.
 */
export function useScrollProgressVars(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const items = [...root.querySelectorAll('[data-progress]')];
    if (!items.length) return undefined;
    if (prefersReducedMotion()) {
      items.forEach((el) => el.style.setProperty('--p', '1'));
      return undefined;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const el of items) {
        const r = el.getBoundingClientRect();
        // data-progress-start / -end: fracción de la ventana (por defecto 0.85 y 0.5)
        const start = vh * (parseFloat(el.dataset.progressStart) || 0.85);
        const end = vh * (parseFloat(el.dataset.progressEnd) || 0.5);
        const total = r.height + (start - end);
        const p = Math.min(1, Math.max(0, (start - r.top) / total));
        el.style.setProperty('--p', p.toFixed(3));
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [rootRef]);
}

/**
 * Scroll suave con Lenis (solo escritorio y sin movimiento reducido). Lenis usa el scroll nativo,
 * así que position: sticky, IntersectionObserver y los enlaces #ancla siguen funcionando.
 */
let lenisInstance = null;

/** Desplaza hasta un elemento (o al inicio) sin tocar la URL. */
export function scrollToTarget(el) {
  const top = el ? el.getBoundingClientRect().top + window.scrollY - 88 : 0;
  if (lenisInstance) lenisInstance.scrollTo(Math.max(0, top), { duration: 1.1 });
  else window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/**
 * Enlaces internos (href="#id") sin "#" en la barra de direcciones: se intercepta el clic,
 * se desplaza por código y el foco pasa a la sección para quien navega con teclado.
 */
export function useAnchorScroll(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('a[href^="#"]');
      if (!a || !root.contains(a)) return;
      const id = decodeURIComponent(a.getAttribute('href').slice(1));
      e.preventDefault();
      const el = id && id !== 'inicio' ? document.getElementById(id) : null;
      scrollToTarget(el);
      const focusEl = el || document.getElementById('inicio');
      if (focusEl) {
        if (!focusEl.hasAttribute('tabindex')) focusEl.setAttribute('tabindex', '-1');
        focusEl.focus({ preventScroll: true });
      }
    };
    // enlaces antiguos con ancla: se respeta el destino y se limpia la URL
    const cleanHash = () => {
      if (!window.location.hash) return;
      const el = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
      if (el) requestAnimationFrame(() => scrollToTarget(el));
    };
    root.addEventListener('click', onClick);
    window.addEventListener('hashchange', cleanHash);
    cleanHash();
    return () => {
      root.removeEventListener('click', onClick);
      window.removeEventListener('hashchange', cleanHash);
    };
  }, [rootRef]);
}

export function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion() || !finePointer()) return undefined;
    let lenis;
    let raf = 0;
    let cancelled = false;
    import('lenis').then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({ duration: 1.1, smoothWheel: true });
      lenisInstance = lenis;
      const tick = (time) => {
        lenis.raf(time);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenis?.destroy();
      if (lenisInstance === lenis) lenisInstance = null;
    };
  }, []);
}

/** Divide un título en palabras para revelarlas en cascada (ver .sdl-word en Landing.css). */
export function SplitWords({ text }) {
  const words = text.split(' ');
  return words.map((w, i) => (
    <React.Fragment key={`${w}-${i}`}>
      <span className="sdl-word" style={{ '--i': i }}>
        <span>{w}</span>
      </span>
      {i < words.length - 1 ? ' ' : null}
    </React.Fragment>
  ));
}
