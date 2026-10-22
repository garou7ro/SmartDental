import React from 'react';
import { STATUS } from '../../lib/odontogram';

/** Símbolo clínico de cada herramienta, dibujado con la misma notación que el odontograma. */
export default function ConditionGlyph({ condition, status = 'bad', size = 22 }) {
  const color = STATUS[status]?.color || STATUS.bad.color;
  const ring = (fill, extra) => (
    <>
      <circle cx="12" cy="12" r="9" fill="var(--odo-surface, #fff)" stroke="currentColor" strokeOpacity=".35" />
      <path d="M5.6 5.6 9.2 9.2M18.4 5.6 14.8 9.2M5.6 18.4 9.2 14.8M18.4 18.4 14.8 14.8" stroke="currentColor" strokeOpacity=".35" />
      <circle cx="12" cy="12" r="4" fill={fill} stroke="currentColor" strokeOpacity=".35" />
      {extra}
    </>
  );
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true, className: 'odo-glyph' };
  switch (condition) {
    case 'caries':
      return <svg {...common}>{ring(color)}</svg>;
    case 'restoration':
      return <svg {...common}>{ring(color, <path d="M12 3a9 9 0 0 1 9 9h-5a4 4 0 0 0-4-4Z" fill={color} />)}</svg>;
    case 'sealant':
      return (
        <svg {...common}>
          <defs><pattern id={`g-hatch-${status}`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.5" height="3" fill={color} /></pattern></defs>
          {ring(`url(#g-hatch-${status})`)}
        </svg>
      );
    case 'crown':
      return <svg {...common}>{ring('var(--odo-surface, #fff)')}<circle cx="12" cy="12" r="11" stroke={color} strokeWidth="2" /></svg>;
    case 'endodontics':
      return (
        <svg {...common}>
          <path d="M7 3h10l-1.5 9c-.6 3.5-1.2 7-3.5 9-2.3-2-2.9-5.5-3.5-9Z" fill="var(--odo-surface, #fff)" stroke="currentColor" strokeOpacity=".4" />
          <path d="M12 6v13" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'implant':
      return (
        <svg {...common} stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M12 3v18" />
          <path d="M7 6h10M8 10h8M8.5 14h7M9.5 18h5" />
        </svg>
      );
    case 'fracture':
      return (
        <svg {...common}>
          <path d="M5 4h14l-1 10c-.4 4-3 7-6 7s-5.6-3-6-7Z" fill="var(--odo-surface, #fff)" stroke="currentColor" strokeOpacity=".4" />
          <path d="M6 9l5 4-2 2 7 4" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'extraction':
    case 'missing':
      return (
        <svg {...common}>
          <path d="M5 4h14l-1 10c-.4 4-3 7-6 7s-5.6-3-6-7Z" fill="var(--odo-surface, #fff)" stroke="currentColor" strokeOpacity=".3" />
          <path d="M5 4l14 16M19 4 5 20" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'clear':
      return (
        <svg {...common} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m14.5 4.5 5 5-9 9H6l-2.5-2.5a1.5 1.5 0 0 1 0-2.1Z" />
          <path d="m9 10 5 5M6 18.5h14" strokeOpacity=".5" />
        </svg>
      );
    default:
      return null;
  }
}
