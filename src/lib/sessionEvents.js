// Canal mínimo para que cualquier consulta avise de que la sesión caducó (401 / JWT inválido).
// AuthProvider se suscribe y decide qué hacer (cerrar sesión y volver al login con un aviso).
const listeners = new Set();

export function onSessionExpired(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifySessionExpired() {
  listeners.forEach((fn) => fn());
}
