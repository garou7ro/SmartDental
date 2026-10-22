import { useCallback, useEffect, useRef, useState } from 'react';
import { classifyError, withTimeout } from '../lib/supabaseErrors';
import { notifySessionExpired } from '../lib/sessionEvents';

/**
 * Estado de una operación de escritura (guardar, eliminar, enviar…), independiente por instancia.
 *   const save = useAsyncAction(async (values) => unwrap(await supabase.from('x').insert(values)));
 *   await save.run(values)  → devuelve { ok, data, error }
 *   save.pending            → para deshabilitar el botón y mostrar el indicador local
 * Evita envíos duplicados: mientras está pendiente, una nueva llamada se ignora.
 */
export default function useAsyncAction(action, { timeout = 30000 } = {}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const actionRef = useRef(action);
  actionRef.current = action;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const run = useCallback(async (...args) => {
    if (busy.current) return { ok: false, skipped: true };
    busy.current = true;
    setPending(true);
    setError(null);
    // Un timeout no cancela una escritura remota. Mantener la guardia hasta
    // que la promesa real termine evita enviar la misma operación dos veces.
    let operation;
    try { operation = Promise.resolve(actionRef.current(...args)); }
    catch (err) { operation = Promise.reject(err); }
    const release = () => {
      busy.current = false;
      if (mounted.current) setPending(false);
    };
    operation.then(release, release);
    try {
      const data = await withTimeout(operation, timeout);
      return { ok: true, data };
    } catch (err) {
      const e = classifyError(err);
      if (e.kind === 'timeout') {
        e.message = 'La operación sigue pendiente de confirmación. No la repitas; comprueba el resultado antes de volver a intentarlo.';
        e.retryable = false;
      }
      if (e.kind === 'auth') notifySessionExpired();
      if (mounted.current) setError(e);
      return { ok: false, error: e, uncertain: e.kind === 'timeout' };
    }
  }, [timeout]);

  return { run, pending, error, reset: useCallback(() => setError(null), []) };
}
