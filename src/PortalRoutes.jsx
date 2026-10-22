import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AuthProvider from './providers/AuthProvider';
import { ThemeContext } from './providers/ThemeProvider';
import { Toaster } from 'sileo';
import 'sileo/styles.css';

// Portal clínico y de plataforma. Se carga bajo demanda desde App.jsx, de modo que la landing
// no descarga Supabase, las notificaciones ni las páginas del panel.
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const PlatformDashboard = lazy(() => import('./pages/PlatformDashboard'));
const ClinicDetailView = lazy(() => import('./pages/ClinicDetailView'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));

// Clinic Pages
const ClinicDashboard = lazy(() => import('./pages/ClinicDashboard'));
const PatientDirectory = lazy(() => import('./pages/PatientDirectory'));
const AgendaCalendar = lazy(() => import('./pages/AgendaCalendar'));
const ClinicInventory = lazy(() => import('./pages/ClinicInventory'));
const ClinicFinances = lazy(() => import('./pages/ClinicFinances'));
const ClinicSettings = lazy(() => import('./pages/ClinicSettings'));
const ClinicPreferences = lazy(() => import('./pages/ClinicPreferences'));
const ClinicOdontograma = lazy(() => import('./pages/ClinicOdontograma'));
const ClinicWhatsApp = lazy(() => import('./pages/ClinicWhatsApp'));
const ClinicWorkspace = lazy(() => import('./pages/ClinicWorkspace'));
const AccountSecurity = lazy(() => import('./components/account/AccountSecurity'));
const ClinicLayout = lazy(() => import('./components/layout/ClinicLayout'));

function ToasterWithTheme() {
  const { theme } = React.useContext(ThemeContext);
  return <Toaster position="top-center" theme={theme} options={{ duration: 7000 }} />;
}

export default function PortalRoutes() {
  return (
    <AuthProvider>
      {/* Sileo physics-based toast notifications container */}
      <ToasterWithTheme />

      <Routes>
        {/* Legal Pages */}
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* Public Login Page */}
        <Route path="/login" element={<Login />} />
        {/* Destino del enlace de recuperación de contraseña */}
        <Route path="/restablecer" element={<ResetPassword />} />

        {/* Platform Admin Dashboard */}
        <Route 
          path="/admin-panel" 
          element={
            <ProtectedRoute requiredRole="platform_admin">
              <PlatformDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Clinic Detail/Management View */}
        <Route 
          path="/admin-panel/clinics/:id" 
          element={
            <ProtectedRoute requiredRole="platform_admin">
              <ClinicDetailView />
            </ProtectedRoute>
          } 
        />

        {/* Clinic Owner/Employee Portal Routes */}
        <Route 
          path="/:clinicSlug" 
          element={
            <ProtectedRoute requiredRole={['clinic_admin', 'assistant']}>
              <ClinicLayout>
                <ClinicDashboard />
              </ClinicLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/:clinicSlug/patients" 
          element={
            <ProtectedRoute requiredRole={['clinic_admin', 'assistant']}>
              <ClinicLayout>
                <PatientDirectory />
              </ClinicLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/:clinicSlug/agenda" 
          element={
            <ProtectedRoute requiredRole={['clinic_admin', 'assistant']}>
              <ClinicLayout>
                <AgendaCalendar />
              </ClinicLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/:clinicSlug/inventory" 
          element={
            <ProtectedRoute requiredRole={['clinic_admin', 'assistant']}>
              <ClinicLayout>
                <ClinicInventory />
              </ClinicLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/:clinicSlug/finances" 
          element={
            <ProtectedRoute requiredRole="clinic_admin">
              <ClinicLayout>
                <ClinicFinances />
              </ClinicLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/:clinicSlug/settings" 
          element={
            <ProtectedRoute requiredRole="clinic_admin">
              <ClinicLayout>
                <ClinicSettings />
              </ClinicLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/:clinicSlug/preferences" 
          element={
            <ProtectedRoute requiredRole="clinic_admin">
              <ClinicLayout>
                <ClinicPreferences />
              </ClinicLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/:clinicSlug/odontograma" 
          element={
            <ProtectedRoute requiredRole={['clinic_admin', 'assistant']}>
              <ClinicLayout>
                <ClinicOdontograma />
              </ClinicLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/:clinicSlug/whatsapp" 
          element={
            <ProtectedRoute requiredRole={['clinic_admin', 'assistant']}>
              <ClinicLayout>
                <ClinicWhatsApp />
              </ClinicLayout>
            </ProtectedRoute>
          } 
        />

        <Route path="/:clinicSlug/workspace" element={
          <ProtectedRoute requiredRole={['clinic_admin', 'assistant']}>
            <ClinicLayout><ClinicWorkspace /></ClinicLayout>
          </ProtectedRoute>
        } />
        <Route path="/:clinicSlug/account" element={
          <ProtectedRoute requiredRole={['clinic_admin', 'assistant']}>
            <ClinicLayout><AccountSecurity /></ClinicLayout>
          </ProtectedRoute>
        } />

        {/* Legacy admin route - redirect to admin-panel */}
        <Route path="/admin" element={<Navigate to="/admin-panel" replace />} />

        {/* Wildcard redirect to Login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
