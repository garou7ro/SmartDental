import { useEffect } from 'react';

/*
 * Efectos compartidos por el panel de la clínica y el de administración.
 *
 * useSpotlight: las superficies marcadas con [data-spot] (o las clases de tarjeta listadas)
 * reciben --mx/--my con la posición del cursor, y el CSS dibuja un brillo que lo sigue.
 * Un único listener delegado; solo se escribe en la tarjeta bajo el cursor.
 *
 * useNavIndicator: una píldora (.panel-nav-pill) se desliza detrás del enlace activo del menú.
 */

const SPOT_SELECTOR = [
  '[data-spot]', '.saas-panel-card', '.sd-admin-metric', '.sd-overview-hero', '.cp-page-head', '.cp-patient',
  '.inv-card', '.inv-kpi', '.fin-kpi', '.wa-card', '.set-member', '.set-plan', '.ag-stats button', '.cp-odo-head',
  '.odo-stage', '.odo-card', '.sd-account__card', '.sd-account__hero', '.fin-chart', '.ag-mini',
].join(',');

export function useSpotlight(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(hover: none), (prefers-reduced-motion: reduce)').matches) return undefined;
    let current = null;
    let frame = 0;
    let last = null;
    const paint = () => {
      frame = 0;
      if (!last) return;
      const target = last.target.closest?.(SPOT_SELECTOR);
      if (current && current !== target) current.classList.remove('is-spot');
      current = target && root.contains(target) ? target : null;
      if (!current) return;
      const r = current.getBoundingClientRect();
      current.style.setProperty('--mx', `${last.clientX - r.left}px`);
      current.style.setProperty('--my', `${last.clientY - r.top}px`);
      current.classList.add('is-spot');
    };
    const onMove = (e) => {
      last = e;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onLeave = () => { current?.classList.remove('is-spot'); current = null; };
    root.addEventListener('pointermove', onMove, { passive: true });
    root.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      current?.classList.remove('is-spot');
    };
  }, [rootRef]);
}

export function useNavIndicator(navRef, dep) {
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;
    let pill = nav.querySelector(':scope > .panel-nav-pill');
    if (!pill) {
      pill = document.createElement('span');
      pill.className = 'panel-nav-pill';
      pill.setAttribute('aria-hidden', 'true');
      nav.prepend(pill);
    }
    const place = () => {
      const active = nav.querySelector('.saas-nav-link.active, .saas-nav-link[aria-current="page"]');
      if (!active) { pill.style.opacity = '0'; return; }
      const n = nav.getBoundingClientRect();
      const a = active.getBoundingClientRect();
      pill.style.opacity = '1';
      pill.style.transform = `translate(${a.left - n.left + nav.scrollLeft}px, ${a.top - n.top + nav.scrollTop}px)`;
      pill.style.width = `${a.width}px`;
      pill.style.height = `${a.height}px`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(nav);
    const t = setTimeout(place, 60);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [navRef, dep]);
}
