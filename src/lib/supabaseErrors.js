/**
 * Clasifica los errores de Supabase (PostgREST, Auth, Edge Functions o red) en categorías
 * con un mensaje comprensible para el usuario. Nunca se muestra el mensaje técnico interno.
 *
 * kind: 'network' | 'timeout' | 'auth' | 'forbidden' | 'not_found' | 'validation' | 'unknown'
 */
export function classifyError(err) {
  if (!err) return null;
  if (err.__classified) return err;

  const status = err.status ?? err.context?.status ?? (typeof err.code === 'number' ? err.code : undefined);
  const code = typeof err.code === 'string' ? err.code : '';
  const name = err.name || '';
  const raw = `${err.message || ''} ${err.details || ''}`.toLowerCase();
  let kind = 'unknown';

  if (name === 'TimeoutError' || code === 'TIMEOUT') kind = 'timeout';
  else if (
    name === 'FunctionsFetchError' ||
    name === 'AuthRetryableFetchError' ||
    raw.includes('failed to fetch') ||
    raw.includes('networkerror') ||
    raw.includes('network request failed') ||
    raw.includes('load failed') ||
    (typeof navigator !== 'undefined' && navigator.onLine === false)
  ) kind = 'network';
  else if (status === 401 || code === 'PGRST301' || raw.includes('jwt expired') || raw.includes('invalid jwt') || name === 'AuthSessionMissingError') kind = 'auth';
  else if (status === 403 || code === '42501') kind = 'forbidden';
  else if (status === 404 || code === 'PGRST116') kind = 'not_found';
  else if (status === 400 || status === 422 || code === '23505' || code === '23514' || code === '22P02') kind = 'validation';

  const MESSAGES = {
    network: 'No hay conexión con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.',
    timeout: 'El servidor está tardando más de lo normal. Inténtalo de nuevo en unos segundos.',
    auth: 'Tu sesión ha caducado. Vuelve a iniciar sesión para continuar.',
    forbidden: 'No tienes permiso para realizar esta acción.',
    not_found: 'No se encontró la información solicitada.',
    validation: 'Algunos datos no son válidos. Revísalos e inténtalo de nuevo.',
    unknown: 'Ocurrió un problema inesperado. Inténtalo de nuevo.',
  };

  return {
    __classified: true,
    kind,
    status,
    message: MESSAGES[kind],
    retryable: kind === 'network' || kind === 'timeout' || kind === 'unknown',
    cause: err,
  };
}

/** Rechaza la promesa si no termina en `ms`. Se usa como red de seguridad, no como demora. */
export function withTimeout(promise, ms, signal) {
  let timer;
  let onAbort;
  const interruption = new Promise((_, reject) => {
    onAbort = () => reject(new DOMException('Operación cancelada', 'AbortError'));
    if (signal?.aborted) { onAbort(); return; }
    signal?.addEventListener('abort', onAbort, { once: true });
    if (ms > 0) timer = setTimeout(() => {
      const error = new Error('Tiempo de espera agotado');
      error.name = 'TimeoutError';
      reject(error);
    }, ms);
  });
  return Promise.race([promise, interruption]).finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  });
}

/**
 * Las consultas de supabase-js no lanzan: devuelven { data, error }. Esto convierte ese
 * resultado en datos o en una excepción, para que el estado distinga vacío de fallido.
 */
export function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}
