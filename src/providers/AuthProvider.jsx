import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { classifyError, withTimeout } from '../lib/supabaseErrors';
import { onSessionExpired } from '../lib/sessionEvents';
import { invokeFunction } from '../lib/api';

export const AuthContext = createContext();

/*
 * Estado de acceso, explícito:
 *   'initializing'    aún no se sabe si hay sesión (nunca equivale a "sin sesión")
 *   'signed_out'      no hay sesión
 *   'loading_profile' hay sesión y se está cargando el perfil (rol, clínica, estado)
 *   'ready'           sesión y perfil disponibles
 *   'error'           hay sesión pero el perfil no se pudo cargar por un fallo recuperable
 *                     (red, tiempo de espera): se ofrece reintentar sin cerrar la sesión
 *
 * Los errores definitivos del perfil (token inválido, perfil inexistente, cuenta suspendida)
 * cierran la sesión y dejan un aviso (`notice`) para el login. La autorización real sigue en
 * Supabase (RLS) y en la Edge Function; este estado solo decide qué pantalla mostrar.
 */

const PROFILE_TIMEOUT = 15000;

async function requestProfile() {
  try {
    const data = await withTimeout(invokeFunction('manage-users', { action: 'get-profile' }), PROFILE_TIMEOUT);
    return data.user;
  } catch (err) {
    // la función responde 403 con { error } para perfiles inexistentes o suspendidos
    if (err.status === 400 && err.serverMessage) err.status = 403;
    throw err;
  }
}

function definitiveNotice(err) {
  const msg = (err.serverMessage || '').toLowerCase();
  if (msg.includes('suspend') || msg.includes('inactiva')) return 'Tu cuenta está suspendida. Contacta con el administrador de tu consultorio.';
  if (msg.includes('perfil no encontrado')) return 'Tu usuario no tiene un perfil asignado. Contacta con el administrador.';
  return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';
}

export default function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'initializing', session: null, profile: null, error: null });
  const [notice, setNotice] = useState(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const loadToken = useRef(0);       // descarta respuestas de perfil de una sesión anterior
  const inflight = useRef(null);     // { userId, promise } evita pedir el perfil dos veces

  const loadProfile = useCallback(async (session, { force = false, silent = false } = {}) => {
    const userId = session.user.id;
    if (!force && inflight.current?.userId === userId) return inflight.current.promise;
    const token = ++loadToken.current;
    // silent: el perfil ya está en pantalla y solo se actualiza (no vuelve a bloquear la app)
    if (!silent) setState((s) => ({ status: 'loading_profile', session, profile: s.profile?.id === userId ? s.profile : null, error: null }));
    const promise = (async () => {
      try {
        const profile = await requestProfile();
        if (token !== loadToken.current) return;
        if (profile?.status === 'suspended') {
          const e = new Error('suspended');
          e.status = 403;
          e.serverMessage = 'suspendida';
          throw e;
        }
        setState({ status: 'ready', session, profile, error: null });
      } catch (err) {
        if (token !== loadToken.current) return;
        const error = classifyError(err);
        if (error.kind === 'auth' || error.kind === 'forbidden' || error.kind === 'not_found') {
          setNotice(definitiveNotice(err));
          loadToken.current += 1;
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          setState({ status: 'signed_out', session: null, profile: null, error: null });
        } else if (!silent) {
          setState({ status: 'error', session, profile: null, error });
        }
      } finally {
        if (inflight.current?.promise === promise) inflight.current = null;
      }
    })();
    inflight.current = { userId, promise };
    return promise;
  }, []);

  useEffect(() => {
    // onAuthStateChange emite INITIAL_SESSION al suscribirse: es la única fuente de verdad.
    // Las llamadas a Supabase se difieren fuera del callback (recomendación de supabase-js).
    let active = true;
    const scheduled = new Set();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const task = setTimeout(() => {
        scheduled.delete(task);
        if (!active) return;
        const cur = stateRef.current;
        if (event === 'SIGNED_OUT' || !session) {
          loadToken.current += 1;
          inflight.current = null;
          setState({ status: 'signed_out', session: null, profile: null, error: null });
          return;
        }
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          // SIGNED_IN también se emite al volver a la pestaña: no recargar el mismo perfil
          if (cur.status === 'ready' && cur.profile?.id === session.user.id) {
            setState((s) => ({ ...s, session }));
            return;
          }
          loadProfile(session);
          return;
        }
        // TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY: solo se actualiza la sesión
        setState((s) => ({ ...s, session }));
      }, 0);
      scheduled.add(task);
    });
    return () => {
      active = false;
      scheduled.forEach(clearTimeout);
      subscription.unsubscribe();
      loadToken.current += 1;
      inflight.current = null;
    };
  }, [loadProfile]);

  // Una consulta respondió 401: la sesión caducó en el servidor.
  useEffect(() => onSessionExpired(() => {
    if (stateRef.current.status === 'signed_out') return;
    setNotice('Tu sesión ha caducado. Vuelve a iniciar sesión.');
    loadToken.current += 1;
    inflight.current = null;
    supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    setState({ status: 'signed_out', session: null, profile: null, error: null });
  }), []);

  const signIn = useCallback(async (email, password) => {
    setNotice(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const e = classifyError(error);
      if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) {
        e.kind = 'credentials';
        e.message = 'El correo o la contraseña no son correctos.';
      } else if (error.code === 'email_not_confirmed') {
        e.kind = 'unconfirmed';
        e.message = 'Tu correo aún no está confirmado. Revisa tu bandeja de entrada.';
      } else if (error.status === 429) {
        e.kind = 'rate';
        e.message = 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.';
      }
      throw e;
    }
    return data;
  }, []);

  const signOut = useCallback(async () => {
    loadToken.current += 1;
    inflight.current = null;
    setState({ status: 'signed_out', session: null, profile: null, error: null });
    await supabase.auth.signOut().catch(() => supabase.auth.signOut({ scope: 'local' }).catch(() => {}));
  }, []);

  const retryProfile = useCallback(() => {
    const s = stateRef.current.session;
    if (s) return loadProfile(s, { force: true });
    return undefined;
  }, [loadProfile]);

  const refreshProfile = useCallback(() => {
    const s = stateRef.current;
    if (!s.session) return undefined;
    return loadProfile(s.session, { force: true, silent: s.status === 'ready' });
  }, [loadProfile]);

  const value = useMemo(() => ({
    status: state.status,
    session: state.session,
    user: state.session?.user ?? null,
    profile: state.profile,
    error: state.error,
    notice,
    clearNotice: () => setNotice(null),
    // compatibilidad: true mientras no se puede decidir qué mostrar
    loading: state.status === 'initializing' || state.status === 'loading_profile',
    signIn,
    signOut,
    retryProfile,
    refreshProfile,
  }), [state, notice, signIn, signOut, retryProfile, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
