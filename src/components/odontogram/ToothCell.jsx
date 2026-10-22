import React, { memo } from 'react';
import { STATUS, isUpper, mesialOnRight, surfaceLabel, toothName, toothType, CONDITIONS } from '../../lib/odontogram';

/*
 * Una pieza del odontograma: silueta anatómica (corona + raíces) y diagrama de cinco superficies.
 * Se dibuja en orientación superior (raíces arriba) y se refleja para la arcada inferior.
 */

const CROWN = {
  molar: 'M8 34C8 30 12 28 24 28C36 28 40 30 40 34L41 50C41 58 36 62 30 61C27 60.5 25.5 58 24 58C22.5 58 21 60.5 18 61C12 62 7 58 7 50Z',
  premolar: 'M12 34C12 30 16 28 24 28C32 28 36 30 36 34L37 49C37 57 32 62 28 61L24 57L20 61C16 62 11 57 11 49Z',
  canine: 'M13 34C13 30 17 28 24 28C31 28 35 30 35 34L35 46C35 53 29 58 24 63C19 58 13 53 13 46Z',
  incisor: 'M13 34C13 30 17 28 24 28C31 28 35 30 35 34L36 56C36 60 33 62 24 62C15 62 12 60 12 56Z',
};
const ROOT = {
  molar: 'M10 33C9 20 10 9 13 3C15.5 9 17 20 19 29C21 22 22 12 24 6C26 12 27 22 29 29C31 20 32.5 9 35 3C38 9 39 20 38 33Z',
  premolar: 'M14 33C13 20 15 9 18 3C20 10 22 20 24 27C26 20 28 10 30 3C33 9 35 20 34 33Z',
  canine: 'M15 33C14 20 18 8 24 1C30 8 34 20 33 33Z',
  incisor: 'M16 33C16 21 19 10 24 4C29 10 32 21 32 33Z',
};

const W = 48;
const SIL_H = 64;
const CX = 24;
const R_OUT = 17;
const R_IN = 7.5;

const polar = (r, deg, cy) => {
  const a = (deg * Math.PI) / 180;
  return `${(CX + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
};
const ring = (a0, a1, cy) => `M${polar(R_OUT, a0, cy)}A${R_OUT} ${R_OUT} 0 0 1 ${polar(R_OUT, a1, cy)}L${polar(R_IN, a1, cy)}A${R_IN} ${R_IN} 0 0 0 ${polar(R_IN, a0, cy)}Z`;

/** Qué superficie ocupa cada sector del diagrama según la arcada y el lado. */
function sectorMap(fdi) {
  const upper = isUpper(fdi);
  const mesialRight = mesialOnRight(fdi);
  return {
    top: upper ? 'V' : 'L',
    bottom: upper ? 'L' : 'V',
    right: mesialRight ? 'M' : 'D',
    left: mesialRight ? 'D' : 'M',
  };
}
const SECTORS = { top: [-135, -45], right: [-45, 45], bottom: [45, 135], left: [135, 225] };

function surfaceFill(mark) {
  if (!mark) return 'var(--odo-surface, #fff)';
  if (mark.c === 'sealant') return `url(#odo-hatch-${mark.s})`;
  return STATUS[mark.s].color;
}

function ToothCell({ fdi, record, selected, hovered, onSelect, onApply, onHover, size = 1, interactive = true }) {
  const type = toothType(fdi);
  const upper = isUpper(fdi);
  const sectors = sectorMap(fdi);
  const whole = record?.whole;
  const surfaces = record?.surfaces || {};
  const wholeColor = whole ? STATUS[whole.s].color : null;
  const gone = whole && ['missing'].includes(whole.c);

  // Posiciones: superior → silueta, diagrama, número. Inferior → número, diagrama, silueta.
  const silY = upper ? 2 : 71;
  const diagY = upper ? 92 : 44;
  const numY = upper ? 128 : 14;
  const H = 136;

  const label = `${fdi}, ${toothName(fdi)}${whole ? `, ${CONDITIONS[whole.c].label} (${STATUS[whole.s].label.toLowerCase()})` : ''}${Object.keys(surfaces).length ? `, ${Object.keys(surfaces).length} superficies marcadas` : ''}`;

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onApply?.(fdi, null);
    }
  };

  return (
    <svg
      className={`odo-tooth ${selected ? 'is-selected' : ''} ${hovered ? 'is-hovered' : ''} ${gone ? 'is-gone' : ''} ${upper ? 'is-upper' : 'is-lower'}`}
      viewBox={`0 0 ${W} ${H}`}
      width={W * size}
      height={H * size}
      role={interactive ? 'button' : 'img'}
      tabIndex={interactive ? (selected ? 0 : -1) : undefined}
      aria-label={label}
      aria-pressed={interactive ? selected : undefined}
      data-fdi={fdi}
      onKeyDown={interactive ? handleKey : undefined}
      onFocus={interactive ? () => onSelect?.(fdi) : undefined}
      onPointerEnter={() => onHover?.(fdi)}
      onPointerLeave={() => onHover?.(null)}
    >
      <rect className="odo-tooth__bg" x="1" y="1" width={W - 2} height={H - 2} rx="12" />

      {/* Silueta anatómica */}
      <g
        className="odo-tooth__sil"
        transform={upper ? `translate(0 ${silY})` : `translate(0 ${silY + SIL_H}) scale(1 -1)`}
        onClick={interactive ? () => onApply?.(fdi, null) : undefined}
      >
        <path className={`odo-tooth__root ${whole?.c === 'implant' ? 'is-faded' : ''}`} d={ROOT[type]} />
        <path className="odo-tooth__crown" d={CROWN[type]} style={whole?.c === 'crown' ? { fill: wholeColor, fillOpacity: 0.22, stroke: wholeColor, strokeWidth: 2 } : undefined} />
        {whole?.c === 'endodontics' && <path d="M24 6V33" stroke={wholeColor} strokeWidth="3" strokeLinecap="round" />}
        {whole?.c === 'implant' && (
          <g stroke={wholeColor} strokeWidth="2.2" strokeLinecap="round">
            <path d="M24 5V32" />
            {[9, 14, 19, 24, 29].map((y) => <path key={y} d={`M${18 + (y - 5) * 0.08} ${y}H${30 - (y - 5) * 0.08}`} />)}
          </g>
        )}
        {whole?.c === 'fracture' && <path d="M12 36L20 44L16 48L28 56L26 50L36 44" fill="none" stroke={wholeColor} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />}
        {['missing', 'extraction'].includes(whole?.c) && (
          <path d="M8 6L40 60M40 6L8 60" stroke={wholeColor} strokeWidth="3.2" strokeLinecap="round" />
        )}
      </g>

      {/* Diagrama de superficies */}
      <g className="odo-tooth__diagram">
        {whole?.c === 'crown' && <circle cx={CX} cy={diagY} r={R_OUT + 3.2} fill="none" stroke={wholeColor} strokeWidth="2.4" />}
        {Object.entries(SECTORS).map(([sector, [a0, a1]]) => {
          const surface = sectors[sector];
          const mark = surfaces[surface];
          return (
            <path
              key={sector}
              className={`odo-surface ${mark ? 'is-marked' : ''}`}
              d={ring(a0, a1, diagY)}
              fill={surfaceFill(mark)}
              onClick={interactive ? (e) => { e.stopPropagation(); onApply?.(fdi, surface); } : undefined}
            >
              <title>{`${surfaceLabel(fdi, surface)}${mark ? `: ${CONDITIONS[mark.c].label}` : ''}`}</title>
            </path>
          );
        })}
        <circle
          className={`odo-surface ${surfaces.O ? 'is-marked' : ''}`}
          cx={CX}
          cy={diagY}
          r={R_IN}
          fill={surfaceFill(surfaces.O)}
          onClick={interactive ? (e) => { e.stopPropagation(); onApply?.(fdi, 'O'); } : undefined}
        >
          <title>{`${surfaceLabel(fdi, 'O')}${surfaces.O ? `: ${CONDITIONS[surfaces.O.c].label}` : ''}`}</title>
        </circle>
        {['missing', 'extraction'].includes(whole?.c) && (
          <path d={`M${CX - 13} ${diagY - 13}L${CX + 13} ${diagY + 13}M${CX + 13} ${diagY - 13}L${CX - 13} ${diagY + 13}`} stroke={wholeColor} strokeWidth="2.4" strokeLinecap="round" pointerEvents="none" />
        )}
      </g>

      <text className="odo-tooth__num" x={CX} y={numY} textAnchor="middle">{fdi}</text>
      {record?.note?.trim() && <circle className="odo-tooth__note" cx={W - 9} cy={upper ? H - 10 : 10} r="3.2" />}
    </svg>
  );
}

export default memo(ToothCell);

/** Patrones compartidos (rayado del sellante). Se monta una vez por odontograma. */
export function OdontogramDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="odo-enamel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--odo-enamel-a)' }} />
          <stop offset="1" style={{ stopColor: 'var(--odo-enamel-b)' }} />
        </linearGradient>
        {Object.entries(STATUS).map(([key, { color }]) => (
          <pattern key={key} id={`odo-hatch-${key}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="4" fill="var(--odo-surface, #fff)" />
            <rect width="2" height="4" fill={color} />
          </pattern>
        ))}
      </defs>
    </svg>
  );
}
