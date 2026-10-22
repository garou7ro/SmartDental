import { useEffect, useRef, useState } from 'react';

const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Cifra que cuenta desde 0 (o desde su valor anterior) hasta `value`. Texto final accesible. */
export default function CountUp({ value, duration = 1100, format = (n) => n.toLocaleString('es-PE') }) {
  const numeric = typeof value === 'number' && Number.isFinite(value);
  const [shown, setShown] = useState(numeric ? 0 : value);
  const from = useRef(0);

  useEffect(() => {
    if (!numeric) {
      setShown(value);
      return undefined;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      from.current = value;
      return undefined;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const current = origin + (value - origin) * easeOutExpo(t);
      setShown(Number.isInteger(value) ? Math.round(current) : current);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    });
    return () => cancelAnimationFrame(raf);
  }, [value, numeric, duration]);

  if (!numeric) return value ?? '—';
  return (
    <>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sd-sr-only">{format(value)}</span>
    </>
  );
}
