import React, { useState } from 'react';
import { ImageOff } from '../icons';
import { Skeleton } from './Loading';

/** Carga real de imágenes (incluido Storage); reserva espacio y ofrece fallback. */
export default function RemoteImage({ src, alt = '', width = 40, height = 40, className = '', style, fallback }) {
  const [loadedSrc, setLoadedSrc] = useState(null);
  const [failedSrc, setFailedSrc] = useState(null);
  const failed = !src || failedSrc === src;
  const loading = !failed && loadedSrc !== src;
  return (
    <span className={`sd-remote-image ${className}`} style={{ width, height, ...style }} aria-busy={loading || undefined}>
      {loading && <Skeleton w="100%" h="100%" r="inherit" />}
      {failed ? (fallback || <ImageOff size={20} role="img" aria-label={alt ? `${alt}: imagen no disponible` : 'Imagen no disponible'} />) : (
        <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" onLoad={() => setLoadedSrc(src)} onError={() => setFailedSrc(src)} style={{ opacity: loading ? 0 : 1 }} />
      )}
    </span>
  );
}
