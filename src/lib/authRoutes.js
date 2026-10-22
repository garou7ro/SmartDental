/** Ruta de inicio según el rol del perfil (misma regla que usaba el login). */
export function clinicSlug(name) {
  return name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : 'mi-clinica';
}

export function homePathFor(profile) {
  if (!profile) return '/login';
  if (profile.role === 'platform_admin') return '/admin-panel';
  if (profile.role === 'clinic_admin' || profile.role === 'assistant') return `/${clinicSlug(profile.clinic_name)}`;
  return '/login';
}
