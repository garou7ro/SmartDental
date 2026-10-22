import { useCallback, useEffect, useRef, useState } from 'react';
import { classifyError, withTimeout } from '../lib/supabaseErrors';
import { notifySessionExpired } from '../lib/sessionEvents';

/**
 * Estado explícito de una consulta remota.
 *
 *   status: 'idle' | 'loading' | 'success' | 'error'
 *   data:   último resultado válido (se conserva durante una recarga para no vaciar la pantalla)
 *   isRefreshing: hay datos en pantalla y se están actualizando
 *   isEmpty: la consulta terminó bien y no devolvió resultados (no es un error)
 *
 * Garantías:
 *   - cada ejecución recibe un AbortSignal; la anterior se cancela al empezar una nueva
 *   - una respuesta antigua nunca sobrescribe a una más reciente (contador de solicitudes)
 *   - nada se actualiza tras desmontar el componente
 *   - si cambia la `key` (por ejemplo, otro usuario o clínica) se descartan los datos previos
 *   - el estado siempre termina en success o error (con tiempo máximo de seguridad)
 */
export default function useSupabaseQuery(fetcher, { key, enabled = true, timeout = 20000, isEmpty } = {}) {
  const [state, setState] = useState({ status: enabled ? 'loading' : 'idle', data: undefined, error: null, isRefreshing: false, queryKey: key });
  const reqId = useRef(0);
  const ctrl = useRef(null);
  const mounted = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(key);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const currentKey = useRef(key);
  currentKey.current = key;

  const run = useCallback(async ({ keepData = true } = {}) => {
    if (!mounted.current || !enabledRef.current) return undefined;
    const runKey = currentKey.current;
    const id = ++reqId.current;
    ctrl.current?.abort();
    const controller = new AbortController();
    ctrl.current = controller;
    setState((s) => ({
      queryKey: runKey,
      status: keepData && s.queryKey === runKey && s.data !== undefined ? 'success' : 'loading',
      data: keepData && s.queryKey === runKey ? s.data : undefined,
      error: null,
      isRefreshing: keepData && s.queryKey === runKey && s.data !== undefined,
    }));
    try {
      const data = await withTimeout(fetcherRef.current(controller.signal), timeout, controller.signal);
      if (!mounted.current || id !== reqId.current || currentKey.current !== runKey || !enabledRef.current) return undefined;
      setState({ status: 'success', data, error: null, isRefreshing: false, queryKey: runKey });
      return data;
    } catch (err) {
      if (!mounted.current || id !== reqId.current || currentKey.current !== runKey || !enabledRef.current) return undefined;
      if (controller.signal.aborted && err?.name === 'AbortError') return undefined; // sustituida por otra
      const error = classifyError(err);
      if (error.kind === 'timeout') controller.abort();
      if (error.kind === 'auth') notifySessionExpired();
      setState((s) => ({ status: 'error', data: s.data, error, isRefreshing: false, queryKey: runKey }));
      return undefined;
    }
  }, [timeout]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      ctrl.current?.abort();
    };
  }, []);

  useEffect(() => {
    const keyChanged = keyRef.current !== key;
    keyRef.current = key;
    if (!enabled) {
      ctrl.current?.abort();
      reqId.current += 1;
      setState({ status: 'idle', data: undefined, error: null, isRefreshing: false, queryKey: key });
      return;
    }
    run({ keepData: !keyChanged });
  }, [key, enabled, run]);

  // Nunca exponer datos de la clave anterior, ni durante el render anterior al efecto.
  const visible = !enabled
    ? { status: 'idle', data: undefined, error: null, isRefreshing: false }
    : state.queryKey !== key
      ? { status: 'loading', data: undefined, error: null, isRefreshing: false }
      : state;
  const data = visible.data;
  const empty = data !== undefined && visible.status !== 'loading' && (isEmpty ? isEmpty(data) : Array.isArray(data) ? data.length === 0 : data == null);


  return {
    ...visible,
    isLoading: visible.status === 'loading',
    isError: visible.status === 'error',
    isSuccess: visible.status === 'success',
    isEmpty: empty,
    refetch: run,
    // permite actualizar los datos localmente tras una escritura confirmada
    setData: useCallback((updater) => {
      if (!mounted.current || !enabledRef.current) return;
      setState((s) => s.queryKey === currentKey.current ? { ...s, data: typeof updater === 'function' ? updater(s.data) : updater } : s);
    }, []),
  };
}
