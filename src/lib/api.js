import { supabase } from './supabaseClient';

/**
 * Invoca una Edge Function y devuelve sus datos, o lanza un error con `status` y el mensaje
 * del servidor (`serverMessage`) para que classifyError pueda distinguir red, sesión y permisos.
 */
export async function invokeFunction(name, body, { signal } = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body, signal });
  if (error) {
    let payload = null;
    try { payload = await error.context?.json?.(); } catch { /* sin cuerpo JSON */ }
    const e = new Error(payload?.error || error.message);
    e.name = error.name;
    e.status = error.context?.status;
    e.serverMessage = payload?.error;
    throw e;
  }
  if (data?.error) {
    const e = new Error(data.error);
    e.status = 400;
    e.serverMessage = data.error;
    throw e;
  }
  return data;
}
