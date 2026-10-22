import React, { useEffect, useState } from 'react';
import { AlertTriangle, Inbox, LogIn, RefreshCw, WifiOff } from '../icons';
import '../../styles/loading.css';

/*
 * Sistema de carga de SmartDental.
 *
 * Reglas de uso
 *  - BrandLoader (fullscreen): solo mientras se decide el acceso (sesión y perfil). Bloquea.
 *  - BrandLoader (inline):     carga inicial de un módulo cuya estructura no se conoce.
 *  - Skeleton*:                cuando la estructura sí se conoce (tablas, tarjetas, fichas).
 *  - LoadingBar:               hay datos en pantalla y se están actualizando.
 *  - Spinner / ButtonLabel:    acciones puntuales (guardar, eliminar, enviar).
 *  - QueryState:               junta lo anterior con los estados vacío y error.
 * El retraso de aparición es solo de presentación (evita parpadeos en respuestas rápidas);
 * el estado real de la operación no se altera.
 */

/** Devuelve true cuando `active` lleva al menos `delay` ms activo. */
export function useDelayedFlag(active, delay = 160) {
  const [show, setShow] = useState(active && delay === 0);
  useEffect(() => {
    if (!active) { setShow(false); return undefined; }
    if (delay === 0) { setShow(true); return undefined; }
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [active, delay]);
  return show;
}

export function BrandLoader({ label = 'Cargando…', hint, fullscreen = false, delay = 160 }) {
  const visible = useDelayedFlag(true, delay);
  return (
    <div
      className={`sd-loader ${fullscreen ? 'sd-loader--full' : ''} ${visible ? 'is-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="sd-loader__mark" aria-hidden="true">
        <span className="sd-loader__ring" />
        <span className="sd-loader__glow" />
        <img src="/landing/logo-mark-256.webp" width="56" height="56" alt="" />
      </div>
      <p className="sd-loader__label">{label}</p>
      {hint && <p className="sd-loader__hint">{hint}</p>}
    </div>
  );
}

export function Spinner({ size = 16, className = '', label }) {
  return (
    <span className={`sd-spinner ${className}`} style={{ '--s': `${size}px` }} role={label ? 'status' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />
  );
}

/** Contenido de un botón con estado de envío: mantiene el ancho y anuncia el cambio. */
export function ButtonLabel({ pending, children, pendingLabel = 'Guardando…' }) {
  return pending ? (
    <span className="sd-btn-pending"><Spinner size={15} />{pendingLabel}</span>
  ) : children;
}

export function LoadingBar({ active, label = 'Actualizando' }) {
  const visible = useDelayedFlag(active, 200);
  return (
    <div className={`sd-bar ${visible ? 'is-active' : ''}`} role={visible ? 'status' : undefined} aria-label={visible ? label : undefined}>
      <span />
    </div>
  );
}

export function Skeleton({ w = '100%', h = 14, r = 8, className = '', style }) {
  return <span className={`sd-skel ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />;
}

export function SkeletonTable({ rows = 6, cols = 4, label = 'Cargando registros' }) {
  return (
    <div className="sd-skel-table" role="status" aria-label={label} aria-busy="true">
      <div className="sd-skel-row is-head">
        {Array.from({ length: cols }, (_, i) => <Skeleton key={i} h={10} w={i === 0 ? '40%' : '55%'} />)}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="sd-skel-row" style={{ '--i': r }}>
          {Array.from({ length: cols }, (_, c) => <Skeleton key={c} h={12} w={c === 0 ? `${70 - ((r * 13) % 30)}%` : `${45 + ((r * 7 + c * 11) % 35)}%`} />)}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 3, height = 96, label = 'Cargando indicadores' }) {
  return (
    <div className="sd-skel-cards" role="status" aria-label={label} aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="sd-skel-card" style={{ minHeight: height, '--i': i }}>
          <Skeleton w="45%" h={10} />
          <Skeleton w="35%" h={26} r={10} />
          <Skeleton w="70%" h={10} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 5, label = 'Cargando' }) {
  return (
    <div className="sd-skel-list" role="status" aria-label={label} aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sd-skel-item" style={{ '--i': i }}>
          <Skeleton w={36} h={36} r={999} />
          <div className="sd-skel-item__text">
            <Skeleton w={`${55 + ((i * 17) % 30)}%`} h={12} />
            <Skeleton w={`${30 + ((i * 11) % 25)}%`} h={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="sd-state">
      <span className="sd-state__icon"><Icon size={22} aria-hidden="true" /></span>
      <p className="sd-state__title">{title}</p>
      {description && <p className="sd-state__desc">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, compact = false, title }) {
  const kind = error?.kind;
  const Icon = kind === 'network' ? WifiOff : kind === 'auth' ? LogIn : AlertTriangle;
  const heading = title || (kind === 'network' ? 'Sin conexión' : kind === 'timeout' ? 'Respuesta lenta' : kind === 'auth' ? 'Sesión caducada' : kind === 'forbidden' ? 'Acceso restringido' : 'No se pudo cargar');
  return (
    <div className={`sd-state is-error ${compact ? 'is-compact' : ''}`} role="alert">
      <span className="sd-state__icon"><Icon size={compact ? 16 : 22} aria-hidden="true" /></span>
      <div className="sd-state__body">
        <p className="sd-state__title">{heading}</p>
        <p className="sd-state__desc">{error?.message || 'Ocurrió un problema inesperado.'}</p>
      </div>
      {onRetry && error?.kind !== 'auth' && error?.kind !== 'forbidden' && (
        <button type="button" className="sd-state__retry" onClick={() => onRetry()}>
          <RefreshCw size={14} aria-hidden="true" />Reintentar
        </button>
      )}
    </div>
  );
}

/**
 * Renderiza el estado de una consulta de useSupabaseQuery:
 *   cargando sin datos → `skeleton`;  error sin datos → ErrorState con reintento;
 *   vacío → `empty`;  con datos → children(data) (+ barra si se actualiza, aviso si falló la recarga).
 */
export function QueryState({ query, skeleton, empty, children, errorTitle }) {
  const { status, data, error, isEmpty, isRefreshing, refetch } = query;
  if (status === 'idle') return null;
  if (status === 'loading' && data === undefined) return skeleton ?? <BrandLoader label="Cargando…" />;
  if (status === 'error' && data === undefined) return <ErrorState error={error} onRetry={refetch} title={errorTitle} />;
  return (
    <>
      <LoadingBar active={isRefreshing} />
      {status === 'error' && <ErrorState compact error={error} onRetry={refetch} title="No se pudo actualizar" />}
      {isEmpty ? empty : children(data)}
    </>
  );
}
