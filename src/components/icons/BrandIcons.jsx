import React from 'react';

/*
 * Iconografía propia de SmartDental: trazo redondeado de 1.6 + una forma de acento rellena con el
 * degradado de marca (turquesa → azul). El trazo usa currentColor; el acento se adapta al tema.
 * Cada icono se dibuja en 24×24.
 */

const A = 'url(#sd-bi-grad)';

const ICONS = {
  home: (
    <>
      <path className="bi-b" d="M9.5 21v-5.2a2.5 2.5 0 0 1 5 0V21Z" fill={A} />
      <path d="M3.5 10.2 12 3.5l8.5 6.7V19a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />
    </>
  ),
  agenda: (
    <>
      <rect className="bi-b" x="7" y="12.5" width="4.5" height="4" rx="1.2" fill={A} />
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  patients: (
    <>
      <circle className="bi-b" cx="16.5" cy="9" r="2.6" fill={A} />
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3 20c.6-3.4 3-5.4 6-5.4s5.4 2 6 5.4" />
      <path d="M15.5 14.6c2.6.1 4.6 1.9 5.2 4.6" />
    </>
  ),
  patientAdd: (
    <>
      <path className="bi-b" d="M18 7.5v6M15 10.5h6" stroke={A} strokeWidth="2.2" />
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3 20c.6-3.4 3-5.4 6-5.4s5.4 2 6 5.4" />
    </>
  ),
  odontogram: (
    <>
      <path className="bi-b" d="M9.3 12.5c.6 2.5 1 6.5 2 6.5s1.2-2.6 1.4-4" stroke={A} strokeWidth="2" />
      <path d="M7.2 4.2c1.6-.8 3.2-.4 4.8.5 1.6-.9 3.2-1.3 4.8-.5 2.3 1.2 2.6 4.3 1.7 7-.7 2-1 4.4-1.5 6.6-.4 1.7-.9 2.7-1.8 2.7-1.3 0-1.4-2.4-1.8-4.4-.2-1-.6-1.7-1.4-1.7s-1.2.7-1.4 1.7c-.4 2-.5 4.4-1.8 4.4-.9 0-1.4-1-1.8-2.7-.5-2.2-.8-4.6-1.5-6.6-.9-2.7-.6-5.8 1.7-7Z" />
    </>
  ),
  inventory: (
    <>
      <path className="bi-b" d="M12 12.2 20 8v8.6l-8 4.2Z" fill={A} />
      <path d="M12 3.2 20 7.6v9L12 21l-8-4.4v-9Z" />
      <path d="M4 7.6 12 12l8-4.4M12 12v9M8 5.4l8 4.4" />
    </>
  ),
  cash: (
    <>
      <circle className="bi-b" cx="12" cy="12.5" r="3" fill={A} />
      <rect x="2.8" y="6" width="18.4" height="13" rx="3" />
      <path d="M6 9.5h.01M18 15.5h.01M5 6l2.5-2.5h9L19 6" />
    </>
  ),
  // Logo oficial de WhatsApp (glifo sin modificar, en un solo color).
  whatsapp: <path className="bi-official" d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41" fill="currentColor" stroke="none" />,
  team: (
    <>
      <path className="bi-b" d="M12 12.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" fill={A} />
      <path d="M6.5 20c.5-3 2.7-4.8 5.5-4.8s5 1.8 5.5 4.8" />
      <circle cx="5.2" cy="9.5" r="2.2" />
      <circle cx="18.8" cy="9.5" r="2.2" />
      <path d="M2.5 17c.3-1.7 1.4-2.8 2.9-3M21.5 17c-.3-1.7-1.4-2.8-2.9-3" />
    </>
  ),
  preferences: (
    <>
      <circle className="bi-b" cx="15" cy="7" r="2.4" fill={A} />
      <circle className="bi-b" cx="9" cy="17" r="2.4" fill={A} />
      <path d="M3.5 7h9M17.5 7h3M3.5 17h3M11.5 17h9" />
      <circle cx="15" cy="7" r="2.4" />
      <circle cx="9" cy="17" r="2.4" />
    </>
  ),
  key: (
    <>
      <circle className="bi-b" cx="8" cy="15.5" r="2" fill={A} />
      <circle cx="8" cy="15.5" r="4.5" />
      <path d="m11.3 12.2 8.2-8.2M16.5 7l2.5 2.5M14 9.5l2 2" />
    </>
  ),
  bell: (
    <>
      <path className="bi-b" d="M10 19.5a2 2 0 0 0 4 0Z" fill={A} />
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15Z" />
    </>
  ),
  sun: (
    <>
      <circle className="bi-b" cx="12" cy="12" r="3.6" fill={A} />
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M5.6 18.4l1.3-1.3M17.1 6.9l1.3-1.3" />
    </>
  ),
  moon: (
    <>
      <circle className="bi-b" cx="17.5" cy="6" r="1.2" fill={A} />
      <path d="M19.5 14.6A8 8 0 1 1 9.4 4.5a6.3 6.3 0 0 0 10.1 10.1Z" />
    </>
  ),
  logout: (
    <>
      <path className="bi-b" d="M16 8.5 19.5 12 16 15.5" stroke={A} strokeWidth="2" />
      <path d="M19.5 12H9.5M13 4.5H7a2.5 2.5 0 0 0-2.5 2.5v10A2.5 2.5 0 0 0 7 19.5h6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h11M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  search: (
    <>
      <circle className="bi-b" cx="10.5" cy="10.5" r="3" fill={A} />
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevronLeft: <path d="m14.5 6-6 6 6 6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  edit: (
    <>
      <path className="bi-b" d="m14.5 6.5 3 3" stroke={A} strokeWidth="2.2" />
      <path d="M4 20l1-4.5L15.6 4.9a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L8.5 19Z" />
    </>
  ),
  alert: (
    <>
      <path className="bi-b" d="M12 9v4.5" stroke={A} strokeWidth="2.2" />
      <path d="M10.3 4.2a2 2 0 0 1 3.4 0l7.4 12.7a2 2 0 0 1-1.7 3H4.6a2 2 0 0 1-1.7-3Z" />
      <path d="M12 16.8h.01" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  clock: (
    <>
      <path className="bi-b" d="M12 7v5l3 2" stroke={A} strokeWidth="2" />
      <circle cx="12" cy="12" r="8.5" />
    </>
  ),
  grid: (
    <>
      <rect className="bi-b" x="13.5" y="4" width="6.5" height="6.5" rx="2" fill={A} />
      <rect x="4" y="4" width="6.5" height="6.5" rx="2" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="2" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2" />
    </>
  ),
  list: (
    <>
      <circle className="bi-b" cx="5" cy="6.5" r="1.6" fill={A} />
      <path d="M9.5 6.5H20M9.5 12H20M9.5 17.5H20M4.5 12h1M4.5 17.5h1" />
    </>
  ),
  layout: (
    <>
      <rect className="bi-b" x="13" y="4" width="7" height="7" rx="2" fill={A} />
      <rect x="4" y="4" width="7" height="16" rx="2.5" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </>
  ),
  clinic: (
    <>
      <path className="bi-b" d="M12 8.5v5M9.5 11h5" stroke={A} strokeWidth="2.2" />
      <path d="M4 20.5V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v14M2.5 20.5h19M10 20.5V17h4v3.5" />
    </>
  ),
  shield: (
    <>
      <path className="bi-b" d="m9 12 2.2 2.2L15.5 10" stroke={A} strokeWidth="2.2" />
      <path d="M12 3 19.5 6v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6Z" />
    </>
  ),
  download: (
    <>
      <path className="bi-b" d="m8 11 4 4 4-4" stroke={A} strokeWidth="2.2" />
      <path d="M12 4v11M4.5 15.5v2A2.5 2.5 0 0 0 7 20h10a2.5 2.5 0 0 0 2.5-2.5v-2" />
    </>
  ),
  receipt: (
    <>
      <path className="bi-b" d="M9 9.5h6M9 13h4" stroke={A} strokeWidth="2" />
      <path d="M6 3.5h12v17l-2.4-1.5-2.4 1.5-2.4-1.5-2.4 1.5L6 20.5Z" />
    </>
  ),
  plans: (
    <>
      <path className="bi-b" d="M12 3.5 14.4 8.6l5.6.6-4.2 3.8 1.2 5.5L12 15.7 7 18.5l1.2-5.5L4 9.2l5.6-.6Z" fill={A} />
      <path d="M12 3.5 14.4 8.6l5.6.6-4.2 3.8 1.2 5.5L12 15.7 7 18.5l1.2-5.5L4 9.2l5.6-.6Z" />
    </>
  ),
  calendarRange: (
    <>
      <path className="bi-b" d="M7 14h10" stroke={A} strokeWidth="2.4" />
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  audit: (
    <>
      <path className="bi-b" d="M8.5 9h7M8.5 12.5h7M8.5 16h4" stroke={A} strokeWidth="2" />
      <path d="M6 3.5h9.5L19 7v13.5H6Z" />
    </>
  ),
  send: (
    <>
      <path className="bi-b" d="M10.5 13.5 20 4" stroke={A} strokeWidth="2" />
      <path d="M20 4 13.5 20.5l-3-7-7-3Z" />
    </>
  ),
  refresh: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />,
  print: (
    <>
      <rect className="bi-b" x="8" y="14" width="8" height="6" rx="1" fill={A} />
      <path d="M7 9V3.5h10V9M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
    </>
  ),
  trash: (
    <>
      <path className="bi-b" d="M10 11v6M14 11v6" stroke={A} strokeWidth="2" />
      <path d="M4.5 6.5h15M9 6.5V4h6v2.5M6.5 6.5l.8 13a1.5 1.5 0 0 0 1.5 1.5h6.4a1.5 1.5 0 0 0 1.5-1.5l.8-13" />
    </>
  ),
  eye: (
    <>
      <circle className="bi-b" cx="12" cy="12" r="2.6" fill={A} />
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18M10.6 6a9.6 9.6 0 0 1 1.4-.1c6 0 9.5 6.1 9.5 6.1a16 16 0 0 1-2.6 3.3M6.4 6.9C3.9 8.6 2.5 12 2.5 12S6 18.4 12 18.4a9 9 0 0 0 4.2-1" />
      <path className="bi-b" d="M10 10.2a2.6 2.6 0 0 0 3.8 3.6" stroke={A} strokeWidth="2" />
    </>
  ),
  lock: (
    <>
      <rect className="bi-b" x="10.5" y="13.5" width="3" height="3.5" rx="1.2" fill={A} />
      <rect x="4.5" y="10" width="15" height="10.5" rx="3" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </>
  ),
  mail: (
    <>
      <path className="bi-b" d="m4 7.5 8 5.5 8-5.5" stroke={A} strokeWidth="2" />
      <rect x="3" y="5" width="18" height="14" rx="3" />
    </>
  ),
  phone: (
    <>
      <path className="bi-b" d="M14.5 4.5a5.5 5.5 0 0 1 5 5" stroke={A} strokeWidth="2" />
      <path d="M8.6 3.8 6.2 4.4a2 2 0 0 0-1.5 2.3c1.2 6.4 6.2 11.4 12.6 12.6a2 2 0 0 0 2.3-1.5l.6-2.4a1.5 1.5 0 0 0-.9-1.7l-2.7-1.1a1.5 1.5 0 0 0-1.7.4l-1 1.2a10 10 0 0 1-4.1-4.1l1.2-1a1.5 1.5 0 0 0 .4-1.7L10.3 4.7a1.5 1.5 0 0 0-1.7-.9Z" />
    </>
  ),
  pin: (
    <>
      <circle className="bi-b" cx="12" cy="10" r="2.6" fill={A} />
      <path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Z" />
    </>
  ),
  pause: (
    <>
      <rect className="bi-b" x="7" y="5" width="3.5" height="14" rx="1.4" fill={A} />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1.4" />
    </>
  ),
  play: (
    <>
      <path className="bi-b" d="M8 5.5v13l10.5-6.5Z" fill={A} />
      <path d="M8 5.5v13l10.5-6.5Z" />
    </>
  ),
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  arrowUpRight: <path d="M7 17 17 7M9 7h8v8" />,
  minus: <path d="M5 12h14" />,
  sparkles: (
    <>
      <path className="bi-b" d="M18 3.5l.8 2.2 2.2.8-2.2.8L18 9.5l-.8-2.2-2.2-.8 2.2-.8Z" fill={A} />
      <path d="M10 5.5l1.7 4.8 4.8 1.7-4.8 1.7L10 18.5l-1.7-4.8L3.5 12l4.8-1.7Z" />
    </>
  ),
  crown: (
    <>
      <path className="bi-b" d="M6 18.5h12" stroke={A} strokeWidth="2.2" />
      <path d="M4 7.5l4 4 4-6 4 6 4-4-1.5 8H5.5Z" />
    </>
  ),
  rotate3d: (
    <>
      <ellipse className="bi-b" cx="12" cy="12" rx="9" ry="3.6" stroke={A} strokeWidth="1.8" />
      <path d="M12 3c2.5 0 4.5 4 4.5 9s-2 9-4.5 9-4.5-4-4.5-9 2-9 4.5-9Z" />
    </>
  ),
  inbox: (
    <>
      <path className="bi-b" d="M3.5 13h4.5l1.5 2.5h5L16 13h4.5" stroke={A} strokeWidth="2" />
      <path d="M5.5 5h13l2 8v5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-5Z" />
    </>
  ),
  wifiOff: (
    <>
      <path d="M3 3l18 18M8.5 16a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4.2-2.5M14.8 10a10 10 0 0 1 4.2 2.5M2 9a15 15 0 0 1 5-3M12 5c3.6 0 7 1.4 10 4" />
      <circle className="bi-b" cx="12" cy="19.5" r="1.4" fill={A} />
    </>
  ),
  login: (
    <>
      <path className="bi-b" d="M10 8.5 13.5 12 10 15.5" stroke={A} strokeWidth="2" />
      <path d="M3.5 12h10M11 4.5h6a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5h-6" />
    </>
  ),
  imageOff: (
    <>
      <path d="M3 3l18 18M21 15V7a2.5 2.5 0 0 0-2.5-2.5H9M3.5 7v10.5A2.5 2.5 0 0 0 6 20h12" />
      <path className="bi-b" d="m6 17 4-4 3 3" stroke={A} strokeWidth="2" />
    </>
  ),
  layers: (
    <>
      <path className="bi-b" d="M12 3.5 21 8l-9 4.5L3 8Z" fill={A} />
      <path d="M12 3.5 21 8l-9 4.5L3 8ZM3 12.5l9 4.5 9-4.5M3 16.5 12 21l9-4.5" />
    </>
  ),
  pauseCircle: (
    <>
      <path className="bi-b" d="M10 9v6M14 9v6" stroke={A} strokeWidth="2.2" />
      <circle cx="12" cy="12" r="8.5" />
    </>
  ),
  checkCircle: (
    <>
      <path className="bi-b" d="m8.5 12 2.5 2.5 4.5-5" stroke={A} strokeWidth="2.2" />
      <circle cx="12" cy="12" r="8.5" />
    </>
  ),
  wallet: (
    <>
      <circle className="bi-b" cx="16.5" cy="13.5" r="1.6" fill={A} />
      <path d="M4 7.5V17a3 3 0 0 0 3 3h12.5V9.5H6a2 2 0 0 1-2-2Zm0 0a2 2 0 0 1 2-2h11.5V9.5" />
    </>
  ),
};

export function BrandIcon({ name, size = 20, className = '', title, ...rest }) {
  const body = ICONS[name];
  if (!body) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`sd-bi ${className}`}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...rest}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id="sd-bi-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2fe0c8" />
          <stop offset="1" stopColor="#1e7bff" />
        </linearGradient>
      </defs>
      {body}
    </svg>
  );
}

export default BrandIcon;
