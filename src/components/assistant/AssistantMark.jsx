import React, { useId } from 'react';
import './assistant.css';

/*
 * Denti: la identidad del asistente de SmartDental. Un molar de cristal con un degradado vivo,
 * ojos que parpadean y un destello. Estados: 'idle' | 'thinking' | 'happy'.
 */
export default function AssistantMark({ size = 40, state = 'idle', className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <span className={`denti is-${state} ${className}`} style={{ '--denti': `${size}px` }} aria-hidden="true">
      <span className="denti__halo" />
      <svg viewBox="0 0 48 48" width={size} height={size}>
        <defs>
          <linearGradient id={`dg-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7ef5e0" />
            <stop offset=".45" stopColor="#2fb8f0" />
            <stop offset="1" stopColor="#6b5cf6" />
          </linearGradient>
          <radialGradient id={`dh-${id}`} cx=".32" cy=".25" r=".6">
            <stop offset="0" stopColor="#fff" stopOpacity=".95" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".15" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`dc-${id}`}>
            <path d="M14.4 7.6c3.2-1.6 6.4-.8 9.6 1 3.2-1.8 6.4-2.6 9.6-1 4.6 2.4 5.2 8.6 3.4 14-1.4 4-2 8.8-3 13.2-.8 3.4-1.8 5.4-3.6 5.4-2.6 0-2.8-4.8-3.6-8.8-.4-2-1.2-3.4-2.8-3.4s-2.4 1.4-2.8 3.4c-.8 4-1 8.8-3.6 8.8-1.8 0-2.8-2-3.6-5.4-1-4.4-1.6-9.2-3-13.2-1.8-5.4-1.2-11.6 3.4-14Z" />
          </clipPath>
        </defs>
        <g clipPath={`url(#dc-${id})`}>
          <rect className="denti__body" x="-12" y="-12" width="72" height="72" fill={`url(#dg-${id})`} />
          <rect x="0" y="0" width="48" height="48" fill={`url(#dh-${id})`} />
          <path className="denti__shine" d="M-10 30 30 -10h7L-3 30Z" fill="#fff" opacity=".35" />
        </g>
        <path d="M14.4 7.6c3.2-1.6 6.4-.8 9.6 1 3.2-1.8 6.4-2.6 9.6-1 4.6 2.4 5.2 8.6 3.4 14-1.4 4-2 8.8-3 13.2-.8 3.4-1.8 5.4-3.6 5.4-2.6 0-2.8-4.8-3.6-8.8-.4-2-1.2-3.4-2.8-3.4s-2.4 1.4-2.8 3.4c-.8 4-1 8.8-3.6 8.8-1.8 0-2.8-2-3.6-5.4-1-4.4-1.6-9.2-3-13.2-1.8-5.4-1.2-11.6 3.4-14Z" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1" />
        <g className="denti__face">
          <ellipse className="denti__eye" cx="19.5" cy="19" rx="2" ry="2.8" fill="#0b1b3a" />
          <ellipse className="denti__eye" cx="28.5" cy="19" rx="2" ry="2.8" fill="#0b1b3a" />
          <path className="denti__smile" d="M20.5 24.5c2.2 2 4.8 2 7 0" fill="none" stroke="#0b1b3a" strokeWidth="1.6" strokeLinecap="round" />
        </g>
        <g className="denti__dots">
          <circle cx="18" cy="21" r="1.8" fill="#0b1b3a" />
          <circle cx="24" cy="21" r="1.8" fill="#0b1b3a" />
          <circle cx="30" cy="21" r="1.8" fill="#0b1b3a" />
        </g>
        <path className="denti__spark" d="M39 4.5l1.1 2.9 2.9 1.1-2.9 1.1L39 12.5l-1.1-2.9L35 8.5l2.9-1.1Z" fill="#fff" />
      </svg>
    </span>
  );
}
