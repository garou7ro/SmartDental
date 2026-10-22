import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { homePathFor } from '../lib/authRoutes';
import { BrandLoader, ErrorState } from './ui/Loading';

/*
 * Decide qué mostrar en una ruta protegida según el estado de acceso:
 *   initializing / loading_profile → loader de marca (aún no se sabe; nunca se muestra el login)
 *   error                           → error recuperable con reintento (la sesión se conserva)
 *   signed_out                      → login, recordando a dónde quería ir el usuario
 *   rol no permitido                → su propia página de inicio (sin bucles con el login)
 * Es solo navegación: los permisos reales los aplica Supabase (RLS y Edge Functions).
 */
function ProtectedRoute({ children, requiredRole }) {
  const { status, profile, error, retryProfile, signOut } = useAuth();
  const location = useLocation();

  if (status === 'initializing') {
    return <BrandLoader fullscreen label="Comprobando tu sesión" />;
  }
  if (status === 'loading_profile') {
    return <BrandLoader fullscreen label="Preparando tu consultorio" hint="Cargando tu perfil y permisos." />;
  }
  if (status === 'error') {
    return (
      <div className="sd-gate">
        <ErrorState error={error} onRetry={retryProfile} title="No pudimos cargar tu perfil" />
        <button type="button" className="sd-gate__link" onClick={signOut}>Cerrar sesión</button>
      </div>
    );
  }
  if (status === 'signed_out' || !profile) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowed.includes(profile.role)) {
      const home = homePathFor(profile);
      return <Navigate to={home === location.pathname ? '/login' : home} replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
