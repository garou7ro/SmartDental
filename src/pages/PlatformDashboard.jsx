import '../styles/admin.css';
import '../styles/admin-experience.css';
import '../styles/panel-shell.css';
import CommandPalette, { openCommandPalette } from '../components/layout/CommandPalette';
import { useNavIndicator, useSpotlight } from '../components/layout/panelEffects';
import { BrandIcon } from '../components/icons/BrandIcons';
import useAuth from '../hooks/useAuth';
import Dialog from '../components/ui/Dialog';
import AccountSecurity from '../components/account/AccountSecurity';
import { BadgeCheck, Building2, CalendarRange, Coins, KeyRound, LayoutGrid, LogOut, Moon, Settings2, ShieldCheck, Sun } from '../components/icons';
import { useAdminSection, useAdminSidebar } from '../components/admin/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { sileo } from 'sileo';
import useTheme from '../hooks/useTheme';

// Modular Feature Components
import PlatformOverview from '../features/dashboard/PlatformOverview';
import PlatformClinics from '../features/dashboard/PlatformClinics';
import PlatformSubscriptions from '../features/dashboard/PlatformSubscriptions';
import PlatformBilling from '../features/dashboard/PlatformBilling';
import PlatformPlans from '../features/dashboard/PlatformPlans';
import PlatformOperations from '../features/dashboard/PlatformOperations';
import PlatformSettings from '../features/dashboard/PlatformSettings';
import CreateClinicModal from '../features/dashboard/CreateClinicModal';
import useSupabaseQuery from '../hooks/useSupabaseQuery';
import { invokeFunction } from '../lib/api';
import { ErrorState, LoadingBar, SkeletonCards, SkeletonTable } from '../components/ui/Loading';

const NAV_GROUPS = [
  { title: 'General', items: [
    { id: 'overview', label: 'Dashboard', icon: LayoutGrid },
    { id: 'clinics', label: 'Clínicas dentales', icon: Building2 },
  ] },
  { title: 'Facturación y negocio', items: [
    { id: 'subscriptions', label: 'Suscripciones', icon: CalendarRange },
    { id: 'payments', label: 'Facturas y pagos', icon: BadgeCheck },
    { id: 'plans', label: 'Planes comerciales', icon: Coins },
  ] },
  { title: 'Operaciones', items: [
    { id: 'operations', label: 'Operaciones y auditoría', icon: ShieldCheck },
    { id: 'settings', label: 'Configuración global', icon: Settings2 },
  ] },
  { title: 'Mi cuenta', items: [
    { id: 'account', label: 'Contraseña y acceso', icon: KeyRound },
  ] },
];
const SECTION_TITLES = {
  overview: 'Resumen de negocio',
  clinics: 'Gestión de clínicas',
  subscriptions: 'Suscripciones',
  payments: 'Facturas y pagos',
  plans: 'Planes y tarifas',
  operations: 'Operaciones y auditoría',
  settings: 'Parámetros de la plataforma',
  account: 'Mi cuenta',
};
const SECTION_GROUP = Object.fromEntries(NAV_GROUPS.flatMap(({ title, items }) => items.map(({ id }) => [id, title])));

function PlatformDashboard() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useAdminSection(['overview', 'clinics', 'subscriptions', 'payments', 'plans', 'operations', 'settings', 'account']);
  const { profile, session } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useAdminSidebar(isSidebarOpen, setIsSidebarOpen);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [pendingClinicId, setPendingClinicId] = useState(null);
  const mutationRef = useRef(false);

  const navigate = useNavigate();
  const shellRef = useRef(null);
  const navRef = useRef(null);

  useEffect(() => {
    document.title = `${SECTION_TITLES[activeTab]} · Administración | SmartDental`;
  }, [activeTab]);

  const needsClinics = ['overview', 'clinics', 'subscriptions', 'operations'].includes(activeTab);

  // Clínicas (esencial para el panel) e indicadores globales (secundarios, no bloquean)
  const clinicsQuery = useSupabaseQuery((signal) => invokeFunction('manage-clinics', { action: 'list' }, { signal }).then((d) => d?.clinics ?? []), { key: 'clinics', enabled: needsClinics });
  const kpisQuery = useSupabaseQuery((signal) => invokeFunction('clinic-kpis', { action: 'global' }, { signal }), { key: 'kpis', enabled: activeTab === 'overview' });
  const clinics = clinicsQuery.data ?? [];
  const fetchClinics = () => clinicsQuery.refetch();
  const fetchKpis = () => kpisQuery.refetch();

  const addAuditLog = async (category, details) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email;
      if (!email) return;
      await supabase.from('audit_logs').insert({
        category,
        user_email: email,
        details,
        clinic_id: null
      });
    } catch (err) {
      console.error('Error logging action:', err);
    }
  };

  const handleCreateClinic = async (formData) => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    setCreateLoading(true);
    const toastId = sileo.show({ type: 'loading', title: 'Registrando Clínica', description: `Registrando ${formData.nombre}...` });

    try {
      const { data, error } = await supabase.functions.invoke('manage-clinics', {
        body: {
          action: 'create',
          nombre: formData.nombre,
          direccion: formData.direccion,
          telefono: formData.telefono,
          email: formData.email,
          plan: formData.plan,
          nombre_propietario: formData.nombre_propietario
        }
      });

      sileo.dismiss(toastId);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Upload logo if selected
      if (formData.logo && data.clinic?.id) {
        const logoToast = sileo.show({ type: 'loading', title: 'Logotipo de Marca', description: 'Subiendo logotipo...' });
        try {
          const fileExt = formData.logo.name.split('.').pop();
          const filePath = `${data.clinic.id}/logo.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('clinic-logos')
            .upload(filePath, formData.logo, { upsert: true });

          if (uploadError) throw uploadError;
          {
            const { data: urlData } = supabase.storage
              .from('clinic-logos')
              .getPublicUrl(filePath);

            await invokeFunction('manage-clinics', { action: 'update', id: data.clinic.id, logo_url: urlData.publicUrl });
          }
          sileo.dismiss(logoToast);
        } catch (logoErr) {
          sileo.dismiss(logoToast);
          sileo.warning({ title: 'Clínica registrada sin logotipo', description: 'No se pudo guardar el logotipo. Los datos de la clínica sí se registraron.' });
        }
      }

      sileo.success({ title: 'Clínica Creada', description: `${formData.nombre} se registró correctamente.` });
      await addAuditLog('Clínica', `Clínica registrada: ${formData.nombre}`);

      if (data.adminUser) {
        setGeneratedCredentials({
          clinicName: formData.nombre,
          email: data.adminUser.email,
          password: data.adminUser.password
        });
      }

      setShowCreateModal(false);
      fetchClinics();
      fetchKpis();
    } catch (err) {
      sileo.dismiss(toastId);
      sileo.error({ title: 'Fallo al Registrar', description: err.message || 'No se pudo crear la clínica.' });
    } finally {
      mutationRef.current = false;
      setCreateLoading(false);
    }
  };

  const toggleClinicStatus = async (clinic) => {
    if (mutationRef.current) return;
    if (!window.confirm(`¿${clinic.status === 'active' ? 'Suspender' : 'Activar'} la clínica ${clinic.nombre}?`)) return;
    mutationRef.current = true;
    setPendingClinicId(clinic.id);
    const newStatus = clinic.status === 'active' ? 'suspended' : 'active';
    const actionName = newStatus === 'suspended' ? 'suspend' : 'activate';
    const toastId = sileo.show({
      type: 'loading',
      title: newStatus === 'suspended' ? 'Suspendiendo' : 'Activando',
      description: `Alterando estado operativo de ${clinic.nombre}...`
    });

    try {
      const { data, error } = await supabase.functions.invoke('manage-clinics', {
        body: { action: actionName, id: clinic.id }
      });
      sileo.dismiss(toastId);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      sileo.success({
        title: newStatus === 'suspended' ? 'Servicio Suspendido' : 'Servicio Restaurado',
        description: `La clínica ${clinic.nombre} ha cambiado de estado.`
      });

      await addAuditLog('Security', `Estado de clínica alterado (${clinic.nombre} -> ${newStatus})`);
      fetchClinics();
      fetchKpis();
    } catch (err) {
      sileo.dismiss(toastId);
      sileo.error({ title: 'Error de Transición', description: err.message || 'No se pudo alterar el estado.' });
    } finally {
      mutationRef.current = false;
      setPendingClinicId(null);
    }
  };

  const handleSignOut = async () => {
    const toastId = sileo.show({ type: 'loading', title: 'Cerrando Sesión', description: 'Cerrando sesión de forma segura...' });
    try {
      await addAuditLog('Auth', 'Firma de administrador cerrada voluntariamente.');
      await supabase.auth.signOut();
      sileo.dismiss(toastId);
      navigate('/login', { replace: true });
    } catch {
      sileo.dismiss(toastId);
      navigate('/login', { replace: true });
    }
  };

  const NAV_ICON = { overview: 'layout', clinics: 'clinic', subscriptions: 'calendarRange', payments: 'checkCircle', plans: 'plans', operations: 'shield', settings: 'preferences', account: 'key' };
  const paletteItems = [
    ...NAV_GROUPS.flatMap(({ title, items }) => items.map(({ id, label }) => ({
      id: `nav-${id}`, group: 'Ir a', label, hint: title, icon: NAV_ICON[id], run: () => setActiveTab(id),
    }))),
    { id: 'act-clinica', group: 'Acciones', label: 'Registrar nueva clínica', icon: 'plus', run: () => setShowCreateModal(true) },
    { id: 'act-tema', group: 'Acciones', label: theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro', icon: theme === 'dark' ? 'sun' : 'moon', run: () => toggleTheme() },
    { id: 'act-salir', group: 'Acciones', label: 'Cerrar sesión', icon: 'logout', run: handleSignOut },
  ];
  const searchClinics = async (q) => {
    const term = q.trim().toLocaleLowerCase('es');
    if (term.length < 2) return [];
    let list = clinicsQuery.data;
    if (!list) { try { list = (await invokeFunction('manage-clinics', { action: 'list' }))?.clinics ?? []; } catch { list = []; } }
    return list.filter((c) => [c.nombre, c.email, c.direccion].some((v) => String(v || '').toLocaleLowerCase('es').includes(term))).slice(0, 8).map((c) => ({
      id: `cli-${c.id}`, group: 'Clínicas', label: c.nombre, hint: `${c.plan === 'pro' ? 'Pro' : 'Básico'} · ${c.status === 'active' ? 'Activa' : 'Suspendida'}`,
      avatar: c.nombre.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase(),
      run: () => navigate(`/admin-panel/clinics/${c.id}`),
    }));
  };
  useSpotlight(shellRef);
  useNavIndicator(navRef, activeTab);

  return (
    <div className="saas-theme saas-container sd-admin" ref={shellRef}>
      <div className="panel-ambient" aria-hidden="true"><i /><i /><i /></div>
      <span className="panel-route-bar" key={`route-${activeTab}`} aria-hidden="true" />
      <CommandPalette items={paletteItems} loadExtra={searchClinics} placeholder="Busca una sección, acción o clínica…" />
      {isSidebarOpen && <div className="saas-sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* Obsidian Brand Sidebar */}
      <aside id="admin-sidebar" ref={sidebarRef} aria-label="Navegación de administración" className={`saas-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <button type="button" className="sd-sidebar-close" onClick={() => setIsSidebarOpen(false)} aria-label="Cerrar navegación">Cerrar ×</button>
        <div className="saas-sidebar-brand">
          <img src="/landing/logo-mark-256.webp" alt="SmartDental Logo" className="saas-brand-logo" />
          <div className="saas-brand-text">SmartDental</div>
        </div>

        <nav className="saas-sidebar-nav" ref={navRef}>
          {NAV_GROUPS.map(({ title, items }) => (
            <React.Fragment key={title}>
              <div className="saas-nav-title">{title}</div>
              {items.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-current={activeTab === id ? 'page' : undefined}
                  className={`saas-nav-link ${activeTab === id ? 'active' : ''}`}
                  onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
                >
                  <Icon className="saas-nav-icon" size={18} strokeWidth={1.75} aria-hidden="true" />
                  <span>{label}</span>
                  {activeTab === id && <span className="saas-nav-active-dot" />}
                </button>
              ))}
            </React.Fragment>
          ))}
        </nav>

        <div className="saas-sidebar-footer">
          <span className="sd-user-avatar" aria-hidden="true">{(profile?.email || session?.user?.email || 'A').slice(0, 1).toUpperCase()}</span>
          <div className="saas-user-info">
            <span className="saas-user-email">{profile?.email || session?.user?.email || 'Administrador'}</span>
            <span className="saas-user-role">Administrador Global</span>
          </div>
          <button className="saas-logout-btn" onClick={handleSignOut} aria-label="Cerrar sesión" title="Cerrar Sesión" style={{ padding: '6px' }}>
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main id="admin-content" className="saas-main">
        {/* Sticky Header */}
        <header className="saas-main-header">
          <div className="saas-header-actions" style={{ gap: '12px' }}>
            <button aria-label="Abrir navegación" aria-expanded={isSidebarOpen} aria-controls="admin-sidebar" className="saas-mobile-toggle" onClick={() => setIsSidebarOpen(true)}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <div className="saas-header-title">
              <span className="sd-crumb">Administración <span aria-hidden="true">/</span> {SECTION_GROUP[activeTab]}</span>
              <h1>{SECTION_TITLES[activeTab]}</h1>
            </div>
          </div>

          <div className="saas-header-actions" style={{ gap: '14px' }}>
            <button type="button" className="panel-search-btn" onClick={openCommandPalette} aria-label="Buscar (Ctrl+K)"><BrandIcon name="search" size={17} /><span>Buscar</span><kbd>Ctrl K</kbd></button>
            <div className="header-status-pill">
              <span className="header-live-dot" />
              <span>{new Date().toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
            </div>
            <button type="button" className="saas-theme-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'} title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}>
              {theme === 'dark' ? <Sun key="sun" size={18} aria-hidden="true" /> : <Moon key="moon" size={18} aria-hidden="true" />}
            </button>
          </div>
        </header>

        {/* Dynamic Panels */}
        <div className="saas-body">
          <LoadingBar active={clinicsQuery.isRefreshing || kpisQuery.isRefreshing} />
          {clinicsQuery.isError && clinicsQuery.data && <ErrorState compact error={clinicsQuery.error} onRetry={fetchClinics} title="No se pudo actualizar la lista de clínicas" />}
          {needsClinics && clinicsQuery.isLoading ? (
            <div className="sd-page-skeleton">
              <SkeletonCards count={4} label="Cargando consola de plataforma" />
              <SkeletonTable rows={6} cols={5} label="Cargando clínicas" />
            </div>
          ) : needsClinics && clinicsQuery.isError && !clinicsQuery.data ? (
            <ErrorState error={clinicsQuery.error} onRetry={fetchClinics} title="No se pudieron cargar las clínicas" />
          ) : (
            <div className="sd-view" key={activeTab}>
              {activeTab === 'overview' && (
                <PlatformOverview kpisQuery={kpisQuery} clinics={clinics} name={profile?.nombre_completo} onCreateClinic={() => setShowCreateModal(true)} />
              )}

              {activeTab === 'clinics' && (
                <PlatformClinics 
                  clinics={clinics}
                  pendingClinicId={pendingClinicId}
                  onNavigateToClinic={(id) => navigate(`/admin-panel/clinics/${id}`)}
                  onToggleClinicStatus={toggleClinicStatus}
                  onCreateClinicClick={() => setShowCreateModal(true)}
                />
              )}

              {activeTab === 'subscriptions' && (
                <PlatformSubscriptions clinics={clinics} />
              )}

              {activeTab === 'payments' && (
                <PlatformBilling />
              )}

              {activeTab === 'plans' && (
                <PlatformPlans />
              )}

              {activeTab === 'operations' && (
                <PlatformOperations 
                  clinics={clinics} 
                  onAddAuditLog={addAuditLog} 
                />
              )}

              {activeTab === 'account' && <AccountSecurity />}

              {activeTab === 'settings' && (
                <PlatformSettings onAddAuditLog={addAuditLog} />
              )}
            </div>
          )}
        </div>
      </main>

      {/* MODAL: REGISTRAR CLINICA */}
      {showCreateModal && <CreateClinicModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        onCreateClinic={handleCreateClinic}
        createLoading={createLoading}
      />}

      {/* Credentials display modal */}
      {generatedCredentials && (
        <Dialog label="Credenciales de la clínica" onClose={() => setGeneratedCredentials(null)}>
          <div className="saas-modal-card" style={{ maxWidth: '400px' }}>
            <div className="saas-modal-header">
              <h3>Credenciales de la Clínica</h3>
              <button className="saas-modal-close" aria-label="Cerrar credenciales" onClick={() => setGeneratedCredentials(null)}>×</button>
            </div>
            <div className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--saas-text-muted)' }}>
                Se ha generado automáticamente la cuenta de administrador para <strong>{generatedCredentials.clinicName}</strong>. 
                Por favor, copia la contraseña temporal y compártela de forma segura:
              </p>
              
              <div className="saas-form-group">
                <label className="saas-label" htmlFor="generated-email">Correo Electrónico</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    readOnly 
                    className="saas-input" 
                    id="generated-email" value={generatedCredentials.email} 
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.9rem' }}
                  />
                  <button 
                    className="saas-btn saas-btn-secondary" 
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(generatedCredentials.email);
                      sileo.success({ title: 'Copiado', description: 'Correo copiado al portapapeles.' }); } catch { sileo.error({ title: 'No se pudo copiar', description: 'Selecciona el correo y cópialo manualmente.' }); }
                    }}
                    style={{ padding: '0 12px' }}
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <div className="saas-form-group">
                <label className="saas-label" htmlFor="generated-password">Contraseña Temporal</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    readOnly 
                    className="saas-input" 
                    id="generated-password" value={generatedCredentials.password} 
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 'bold' }}
                  />
                  <button 
                    className="saas-btn saas-btn-secondary" 
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(generatedCredentials.password);
                      sileo.success({ title: 'Copiado', description: 'Contraseña copiada al portapapeles.' }); } catch { sileo.error({ title: 'No se pudo copiar', description: 'Selecciona la contraseña y cópiala manualmente.' }); }
                    }}
                    style={{ padding: '0 12px' }}
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>
            <div className="saas-modal-footer">
              <button 
                className="saas-btn saas-btn-primary" 
                onClick={() => setGeneratedCredentials(null)}
                style={{ width: '100%', textAlign: 'center' }}
              >
                Entendido, Cerrar
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

export default PlatformDashboard;
