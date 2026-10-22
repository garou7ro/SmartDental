import '../styles/admin.css';
import '../styles/admin-experience.css';
import '../styles/panel-shell.css';
import CommandPalette, { openCommandPalette } from '../components/layout/CommandPalette';
import { useNavIndicator, useSpotlight } from '../components/layout/panelEffects';
import { BrandIcon } from '../components/icons/BrandIcons';
import useAuth from '../hooks/useAuth';
import Dialog from '../components/ui/Dialog';
import RemoteImage from '../components/ui/RemoteImage';
import { ArrowLeft, Building2, DatabaseBackup, LayoutGrid, MapPin, Mail, Phone, Pencil, Pause, Play, ReceiptText, ScrollText, Sun, Moon, UsersRound } from '../components/icons';
import { useAdminSection, useAdminSidebar } from '../components/admin/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { sileo } from 'sileo';
import useTheme from '../hooks/useTheme';

// Modular Feature Components
import ClinicDetailOverview from '../features/clinics/ClinicDetailOverview';
import ClinicDetailStaff from '../features/clinics/ClinicDetailStaff';
import ClinicDetailBackups from '../features/clinics/ClinicDetailBackups';
import ClinicDetailBilling from '../features/clinics/ClinicDetailBilling';
import ClinicDetailAudit from '../features/clinics/ClinicDetailAudit';
import EditClinicModal from '../features/clinics/EditClinicModal';
import CreateUserModal from '../features/clinics/CreateUserModal';
import EditUserModal from '../features/clinics/EditUserModal';
import useSupabaseQuery from '../hooks/useSupabaseQuery';
import { invokeFunction } from '../lib/api';
import { BrandLoader, ErrorState, QueryState, SkeletonCards, SkeletonTable, LoadingBar, EmptyState } from '../components/ui/Loading';

const DETAIL_NAV = [
  { id: 'overview', label: 'Resumen', icon: LayoutGrid },
  { id: 'staff', label: 'Equipo', icon: UsersRound },
  { id: 'billing', label: 'Suscripción', icon: ReceiptText },
  { id: 'audit', label: 'Auditoría', icon: ScrollText },
];
const DETAIL_TITLES = {
  overview: 'Resumen de la clínica',
  staff: 'Equipo y accesos',
  backups: 'Exportación de datos',
  billing: 'Suscripción',
  audit: 'Bitácora de auditoría',
};

function ClinicDetailView() {
  const { theme, toggleTheme } = useTheme();
  const { id: clinicId } = useParams();
  const navigate = useNavigate();
  const shellRef = useRef(null);
  const navRef = useRef(null);
  useSpotlight(shellRef);

  const [activeTab, setActiveTab] = useAdminSection(['overview', 'staff', 'billing', 'audit']);
  const { profile, session } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useAdminSidebar(isSidebarOpen, setIsSidebarOpen);

  // Queries
  const clinicQuery = useSupabaseQuery(
    (signal) => invokeFunction('manage-clinics', { action: 'get', id: clinicId }, { signal }).then((d) => d.clinic), 
    { key: clinicId, enabled: !!clinicId }
  );
  const usersQuery = useSupabaseQuery(
    (signal) => invokeFunction('manage-users', { action: 'list', clinic_id: clinicId }, { signal }).then((d) => d?.users ?? []), 
    { key: clinicId, enabled: !!clinicId && ['overview', 'staff', 'backups'].includes(activeTab) }
  );
  const kpisQuery = useSupabaseQuery(
    (signal) => invokeFunction('clinic-kpis', { action: 'clinic', clinic_id: clinicId }, { signal }), 
    { key: clinicId, enabled: false }
  );

  const clinic = clinicQuery.data ?? null;
  useNavIndicator(navRef, `${activeTab}|${clinic ? 'ready' : 'loading'}`);
  const users = usersQuery.data ?? [];

  useEffect(() => {
    const sectionTitles = {
      overview: 'Resumen',
      staff: 'Equipo',
      backups: 'Exportación',
      billing: 'Suscripción',
      audit: 'Auditoría',
    };
    document.title = `${sectionTitles[activeTab]} · ${clinic?.nombre || 'Clínica'} | SmartDental`;
  }, [activeTab, clinic?.nombre]);

  const fetchClinic = () => clinicQuery.refetch();
  const fetchUsers = () => usersQuery.refetch();

  // Modals Toggles
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditClinic, setShowEditClinic] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Loading States
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [resetPasswordCreds, setResetPasswordCreds] = useState(null);
  const mutationRef = useRef(false);
  const [actionPending, setActionPending] = useState(false);

  // Deletion States
  const [showDeleteUser, setShowDeleteUser] = useState(false);
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState(null);
  const [deleteDataType, setDeleteDataType] = useState('none');
  const [transferToUserId, setTransferToUserId] = useState('');

  const addAuditLog = async (category, details) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email;
      if (!email) return;
      await supabase.from('audit_logs').insert({
        category,
        user_email: email,
        details,
        clinic_id: clinicId
      });
    } catch (err) {
      console.error('Error logging audit action:', err);
    }
  };

  const handleCreateUser = async (formData) => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    setCreateLoading(true);
    const toastId = sileo.show({ type: 'loading', title: 'Creando Usuario', description: `Registrando ${formData.email}...` });

    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'create', 
          email: formData.email, 
          role: formData.role, 
          clinic_id: clinicId,
          nombre_completo: formData.nombre_completo,
          assistant_role: formData.assistant_role
        }
      });
      sileo.dismiss(toastId);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      sileo.success({ title: 'Usuario Creado', description: `${formData.email} registrado con éxito.` });
      await addAuditLog('Security', `Usuario staff registrado: ${formData.email} (${formData.role})`);
      
      if (data.temp_password) setResetPasswordCreds({ email: formData.email, tempPassword: data.temp_password });
      setShowCreateUser(false);
      fetchUsers();
    } catch (err) {
      sileo.dismiss(toastId);
      sileo.error({ title: 'Error', description: err.message || 'No se pudo crear el usuario.' });
    } finally {
      mutationRef.current = false;
      setCreateLoading(false);
    }
  };

  const handleEditClinic = async (formData) => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    setEditLoading(true);
    const toastId = sileo.show({ type: 'loading', title: 'Actualizando Clínica', description: 'Guardando modificaciones...' });

    try {
      const { data, error } = await supabase.functions.invoke('manage-clinics', {
        body: { 
          action: 'update', 
          id: clinicId,
          nombre: formData.nombre,
          direccion: formData.direccion,
          telefono: formData.telefono,
          email: formData.email,
          plan: formData.plan
        }
      });
      sileo.dismiss(toastId);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      sileo.success({ title: 'Datos Actualizados', description: 'La información de la clínica fue modificada.' });
      await addAuditLog('Clínica', `Datos institucionales actualizados para: ${formData.nombre}`);
      
      setShowEditClinic(false);
      fetchClinic();
    } catch (err) {
      sileo.dismiss(toastId);
      sileo.error({ title: 'Error', description: err.message || 'No se pudo actualizar la clínica.' });
    } finally {
      mutationRef.current = false;
      setEditLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (mutationRef.current) return;
    if (!window.confirm(`¿${clinic.status === 'active' ? 'Suspender' : 'Activar'} esta clínica?`)) return;
    mutationRef.current = true;
    setActionPending(true);
    const isCurrentlyActive = clinic.status === 'active';
    const action = isCurrentlyActive ? 'suspend' : 'activate';
    const label = isCurrentlyActive ? 'Suspendiendo' : 'Reactivando';

    const toastId = sileo.show({ type: 'loading', title: `${label} Clínica`, description: 'Actualizando credenciales de inquilino...' });

    try {
      const { data, error } = await supabase.functions.invoke('manage-clinics', {
        body: { action, id: clinicId }
      });
      sileo.dismiss(toastId);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      sileo.success({ 
        title: isCurrentlyActive ? 'Clínica Suspendida' : 'Clínica Reactivada', 
        description: isCurrentlyActive ? 'El estado de la clínica cambió a suspendida.' : 'El estado de la clínica cambió a activa.' 
      });
      await addAuditLog('Security', `Estado alterado: Clínica ${isCurrentlyActive ? 'Suspendida' : 'Reactivada'}`);
      
      fetchClinic();
    } catch (err) {
      sileo.dismiss(toastId);
      sileo.error({ title: 'Error', description: err.message || 'No se pudo cambiar el estado.' });
    } finally { mutationRef.current = false; setActionPending(false); }
  };

  const handleEditUser = async (formData) => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    setEditUserLoading(true);
    const toastId = sileo.show({ type: 'loading', title: 'Modificando Acceso', description: 'Actualizando credenciales...' });

    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'update', 
          id: selectedUser.id,
          email: formData.email,
          status: formData.status,
          nombre_completo: formData.nombre_completo,
          assistant_role: formData.assistant_role
        }
      });
      sileo.dismiss(toastId);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      sileo.success({ title: 'Acceso Actualizado', description: `Modificaciones guardadas para ${formData.email}.` });
      await addAuditLog('Security', `Perfil de usuario editado: ${formData.email} (Estado: ${formData.status})`);
      
      setShowEditUser(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      sileo.dismiss(toastId);
      sileo.error({ title: 'Error', description: err.message || 'No se pudo editar el usuario.' });
    } finally {
      mutationRef.current = false;
      setEditUserLoading(false);
    }
  };

  const handleResetPassword = async (userItem) => {
    if (mutationRef.current) return;
    if (!window.confirm(`¿Generar una nueva contraseña para ${userItem.email}? La anterior dejará de funcionar.`)) return;
    mutationRef.current = true;
    setActionPending(true);
    const toastId = sileo.show({ type: 'loading', title: 'Restableciendo Acceso', description: 'Generando clave provisional...' });

    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'update', id: userItem.id, reset_password: true }
      });
      sileo.dismiss(toastId);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (!data.temp_password) throw new Error('La respuesta no contiene una contraseña temporal. No se ha mostrado ninguna credencial.');
      setResetPasswordCreds({
        email: userItem.email,
        tempPassword: data.temp_password
      });

      sileo.success({ 
        title: 'Contraseña Provisional Generada', 
        description: `Nueva clave asignada para ${userItem.email}.`
      });

      await fetchUsers();
      await addAuditLog('Security', `Contraseña restablecida de forma manual para: ${userItem.email}`);
    } catch (err) {
      sileo.dismiss(toastId);
      sileo.error({ title: 'Error al Restablecer', description: err.message || 'No se pudo actualizar la contraseña.' });
    } finally { mutationRef.current = false; setActionPending(false); }
  };

  const handleDeleteUserClick = (userItem) => {
    setSelectedUserForDelete(userItem);
    setDeleteDataType('none');
    setTransferToUserId('');
    setShowDeleteUser(true);
  };

  const handleDeleteUser = async (e) => {
    e.preventDefault();
    if (!selectedUserForDelete || mutationRef.current) return;
    mutationRef.current = true;

    setDeleteUserLoading(true);
    const toastId = sileo.show({ type: 'loading', title: 'Eliminando Usuario', description: `Procesando eliminación de ${selectedUserForDelete.email}...` });

    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'delete',
          id: selectedUserForDelete.id
        }
      });

      sileo.dismiss(toastId);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      sileo.success({ title: 'Usuario Eliminado', description: 'El usuario y su configuración fueron eliminados de forma segura.' });
      
      let actionText = 'sin alteración de citas';
      if (deleteDataType === 'transfer') {
        const target = users.find(u => u.id === transferToUserId);
        actionText = `transferido a ${target?.email || transferToUserId}`;
      } else if (deleteDataType === 'delete') {
        actionText = 'borrado permanente de citas';
      }
      
      await addAuditLog('Security', `Usuario staff eliminado: ${selectedUserForDelete.email}. Acción de datos: ${actionText}`);
      
      setShowDeleteUser(false);
      setSelectedUserForDelete(null);
      fetchUsers();
    } catch (err) {
      sileo.dismiss(toastId);
      sileo.error({ title: 'Error al Eliminar', description: err.message || 'No se pudo eliminar el usuario.' });
    } finally {
      mutationRef.current = false;
      setDeleteUserLoading(false);
    }
  };

  if (clinicQuery.isLoading || clinicQuery.status === 'idle') {
    return (
      <div className="saas-theme saas-container sd-admin">
        <BrandLoader label="Cargando la ficha de la clínica" />
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="saas-theme saas-container sd-admin" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '24px' }}>
        <ErrorState error={clinicQuery.error} onRetry={fetchClinic} title="No se pudo cargar la clínica" />
        <button type="button" className="sd-gate__link" onClick={() => navigate('/admin-panel?section=clinics')}>Volver a la consola</button>
      </div>
    );
  }

  const isActive = clinic.status === 'active';
  const isPro = clinic.plan === 'pro';

  const DETAIL_ICON = { overview: 'layout', staff: 'team', backups: 'download', billing: 'receipt', audit: 'audit' };
  const paletteItems = [
    ...DETAIL_NAV.map(({ id, label }) => ({ id: `nav-${id}`, group: clinic.nombre, label, icon: DETAIL_ICON[id], run: () => setActiveTab(id) })),
    { id: 'go-dir', group: 'Ir a', label: 'Directorio de clínicas', icon: 'clinic', run: () => navigate('/admin-panel?section=clinics') },
    { id: 'go-home', group: 'Ir a', label: 'Resumen de la plataforma', icon: 'layout', run: () => navigate('/admin-panel') },
    { id: 'act-tema', group: 'Acciones', label: theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro', icon: theme === 'dark' ? 'sun' : 'moon', run: () => toggleTheme() },
  ];

  return (
    <div className="saas-theme saas-container sd-admin" ref={shellRef}>
      <div className="panel-ambient" aria-hidden="true"><i /><i /><i /></div>
      <span className="panel-route-bar" key={`route-${activeTab}`} aria-hidden="true" />
      <CommandPalette items={paletteItems} placeholder="Busca una sección o acción…" />
      {isSidebarOpen && <div className="saas-sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}

      {/* Sidebar navigation */}
      <aside id="admin-sidebar" ref={sidebarRef} aria-label="Navegación de administración" className={`saas-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <button type="button" className="sd-sidebar-close" onClick={() => setIsSidebarOpen(false)} aria-label="Cerrar navegación">Cerrar ×</button>
        <div className="saas-sidebar-brand sd-detail-brand">
          <button type="button" className="sd-back-btn" onClick={() => navigate('/admin-panel?section=clinics')} aria-label="Volver al directorio de clínicas">
            <ArrowLeft size={16} aria-hidden="true" />
          </button>
          <img src="/landing/logo-mark-256.webp" alt="" className="saas-brand-logo" />
          <div className="sd-detail-brand__text">
            <span>Expediente</span>
            <small>Gestión de clínica</small>
          </div>
        </div>

        <div className="sd-detail-identity">
          <div className="sd-detail-identity__logo">
            <RemoteImage src={clinic.logo_url} alt="" width="100%" height="100%" fallback={<Building2 size={22} aria-hidden="true" />} />
          </div>
          <div className="sd-detail-identity__copy">
            <strong>{clinic.nombre}</strong>
            <div>
              <span className={`saas-pill ${clinic.status}`}>
                {isActive ? 'Activa' : clinic.status === 'suspended' ? 'Suspendida' : 'Sin estado registrado'}
              </span>
              <span className={`sd-role-tag ${isPro ? 'is-pro' : ''}`}>
                {clinic.plan === 'pro' ? 'Pro' : clinic.plan === 'basico' ? 'Básico' : 'Sin plan registrado'}
              </span>
            </div>
          </div>
        </div>

        <nav className="saas-sidebar-nav" ref={navRef}>
          <div className="saas-nav-title">Clínica</div>
          {DETAIL_NAV.map(({ id, label, icon: Icon }) => (
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
        </nav>

        <div className="saas-sidebar-footer">
          <span className="sd-user-avatar" aria-hidden="true">{(profile?.email || session?.user?.email || 'A').slice(0, 1).toUpperCase()}</span>
          <div className="saas-user-info">
            <span className="saas-user-email">{profile?.email || session?.user?.email || 'Administrador'}</span>
            <span className="saas-user-role">Administrador Global</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main id="admin-content" className="saas-main">
        <header className="saas-main-header">
          <div className="saas-header-actions" style={{ gap: '12px' }}>
            <button aria-label="Abrir navegación" aria-expanded={isSidebarOpen} aria-controls="admin-sidebar" className="saas-mobile-toggle" onClick={() => setIsSidebarOpen(true)}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="saas-header-title">
              <span className="sd-crumb">Clínicas <span aria-hidden="true">/</span> {clinic.nombre}</span>
              <h1>{DETAIL_TITLES[activeTab]}</h1>
            </div>
          </div>
          <div className="saas-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button type="button" className="panel-search-btn" onClick={openCommandPalette} aria-label="Buscar (Ctrl+K)"><BrandIcon name="search" size={17} /><span>Buscar</span><kbd>Ctrl K</kbd></button>
            <button type="button" className="saas-theme-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'} title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}>
              {theme === 'dark' ? <Sun key="sun" size={18} aria-hidden="true" /> : <Moon key="moon" size={18} aria-hidden="true" />}
            </button>
            <button type="button" className="saas-btn saas-btn-secondary" onClick={() => navigate('/admin-panel?section=clinics')}>
              <ArrowLeft size={15} aria-hidden="true" />Directorio
            </button>
          </div>
        </header>

        <div className="saas-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <LoadingBar active={clinicQuery.isRefreshing} />
          {clinicQuery.isError && <ErrorState compact error={clinicQuery.error} onRetry={fetchClinic} title="No se pudo actualizar la ficha" />}
          <section className="saas-panel-card sd-clinic-hero" aria-label="Ficha de la clínica">
            <div className="sd-overview-hero__aurora" aria-hidden="true"><i /><i /><i /></div>
            <div className="sd-clinic-hero__identity">
              <RemoteImage className="sd-clinic-hero__logo" src={clinic.logo_url} alt="" width={72} height={72} fallback={<Building2 size={32} strokeWidth={1.4} aria-hidden="true" />} />
              <div className="sd-clinic-hero__name">
                <span className="sd-eyebrow">Expediente de clínica</span>
                <h2>{clinic.nombre}</h2>
                <div className="sd-clinic-hero__badges">
                  <span className={`saas-pill ${clinic.status}`}>
                    {isActive ? 'Activa' : clinic.status === 'suspended' ? 'Suspendida' : 'Sin estado registrado'}
                  </span>
                  <span className={`sd-role-tag ${isPro ? 'is-pro' : ''}`}>
                    {clinic.plan === 'pro' ? 'Plan Pro' : clinic.plan === 'basico' ? 'Plan Básico' : 'Sin plan registrado'}
                  </span>
                </div>
              </div>
            </div>
            <div className="sd-clinic-hero__contacts">
              <span><MapPin size={15} aria-hidden="true" />{clinic.direccion || 'Sin dirección registrada'}</span>
              <span><Mail size={15} aria-hidden="true" />{clinic.email || 'Sin correo registrado'}</span>
              <span><Phone size={15} aria-hidden="true" />{clinic.telefono || 'Sin teléfono registrado'}</span>
            </div>
            <div className="sd-clinic-hero__actions">
              <button className="saas-btn saas-btn-secondary" disabled={actionPending} onClick={() => setShowEditClinic(true)}>
                <Pencil size={15} aria-hidden="true" />Editar clínica
              </button>
              <button className={`saas-btn saas-btn-secondary ${isActive ? 'sd-danger-action' : ''}`} disabled={actionPending} onClick={handleToggleStatus}>
                {isActive ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
                {isActive ? 'Suspender acceso' : 'Reactivar acceso'}
              </button>
            </div>
          </section>

          {/* Each module owns its loading, empty and error states. */}
          <div className="sd-view sd-view--stack" key={activeTab}>
          {activeTab === 'overview' && (
            <ClinicDetailOverview clinic={clinic} kpisQuery={kpisQuery} usersQuery={usersQuery} actionPending={actionPending}
              onResetPasswordClick={handleResetPassword} onEditClinicClick={() => setShowEditClinic(true)} />
          )}

          {activeTab === 'staff' && (
            <QueryState query={usersQuery} skeleton={<SkeletonTable rows={5} cols={5} />} errorTitle="No se pudo cargar el equipo"
              empty={<ClinicDetailStaff users={[]} onCreateUserClick={() => setShowCreateUser(true)} />}>
              {(staff) => <ClinicDetailStaff actionPending={actionPending} users={staff} onCreateUserClick={() => setShowCreateUser(true)}
                onEditUserClick={(user) => { setSelectedUser(user); setShowEditUser(true); }}
                onResetPasswordClick={handleResetPassword} onDeleteUserClick={handleDeleteUserClick} />}
            </QueryState>
          )}



          {activeTab === 'billing' && (
            <ClinicDetailBilling 
              clinicId={clinicId} 
              plan={clinic.plan} 
            />
          )}

          {activeTab === 'audit' && (
            <ClinicDetailAudit clinicId={clinicId} />
          )}
          </div>
        </div>
      </main>

      {/* MODALS */}
      {showEditClinic && <EditClinicModal 
        isOpen={showEditClinic} 
        onClose={() => setShowEditClinic(false)} 
        clinic={clinic} 
        onEditClinic={handleEditClinic} 
        editLoading={editLoading} 
      />}

      {showCreateUser && <CreateUserModal 
        isOpen={showCreateUser} 
        onClose={() => setShowCreateUser(false)} 
        onCreateUser={handleCreateUser} 
        createLoading={createLoading} 
      />}

      {showEditUser && <EditUserModal 
        isOpen={showEditUser} 
        onClose={() => setShowEditUser(false)} 
        user={selectedUser} 
        onEditUser={handleEditUser} 
        editUserLoading={editUserLoading} 
      />}

      {/* Delete Confirmation Modal */}
      {showDeleteUser && (
        <Dialog label="Eliminar colaborador" busy={deleteUserLoading} onClose={() => setShowDeleteUser(false)}>
          <div className="saas-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="saas-modal-header">
              <h3>Eliminar Usuario Staff</h3>
              <button className="saas-modal-close" aria-label="Cerrar confirmación" disabled={deleteUserLoading} onClick={() => setShowDeleteUser(false)}>×</button>
            </div>
            <form onSubmit={handleDeleteUser}>
              <div className="saas-modal-body">
                <p style={{ color: 'var(--saas-text)', fontSize: '0.9rem', marginBottom: '14px' }}>
                  ¿Estás seguro de que deseas eliminar permanentemente a <strong style={{ color: 'var(--saas-error)' }}>{selectedUserForDelete?.email}</strong>?
                </p>
<p>Las asignaciones y la información clínica deben gestionarse antes de eliminar una cuenta. Puedes suspender su acceso conservando sus registros.</p>
              </div>
              <div className="saas-modal-footer">
                <button type="button" className="saas-btn saas-btn-secondary press-feedback" disabled={deleteUserLoading} onClick={() => setShowDeleteUser(false)}>
                  Cancelar
                </button>
                <button type="submit" className="saas-btn saas-btn-danger press-feedback" disabled={deleteUserLoading}>
                  {deleteUserLoading ? 'Eliminando...' : 'Eliminar Permanentemente'}
                </button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* Temp Password Reveal Modal */}
      {resetPasswordCreds && (
        <Dialog label="Credenciales temporales" onClose={() => setResetPasswordCreds(null)}>
          <div className="saas-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div className="saas-modal-header" style={{ justifyContent: 'center' }}>
              <h3>Credenciales Provisionales</h3>
            </div>
            <div className="saas-modal-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--saas-text-muted)' }}>
                Se ha asignado una clave temporal para <strong>{resetPasswordCreds.email}</strong>. Compártela con el usuario:
              </p>
              <div style={{ padding: '14px', background: 'rgba(0, 242, 254, 0.08)', borderRadius: '12px', border: '1px solid rgba(0, 242, 254, 0.2)', margin: '14px 0' }}>
                <span style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.1em' }}>
                  {resetPasswordCreds.tempPassword}
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--saas-text-muted)' }}>
                Esta contraseña se muestra una sola vez. Pide al usuario que la cambie desde su cuenta.
              </p>
            </div>
            <div className="saas-modal-footer" style={{ justifyContent: 'center' }}>
              <button 
                className="saas-btn saas-btn-primary press-feedback" 
                onClick={async () => {
                  try { await navigator.clipboard.writeText(resetPasswordCreds.tempPassword);
                  sileo.info({ title: 'Copiado', description: 'Contraseña copiada al portapapeles.' });
                  setResetPasswordCreds(null);
                  } catch { sileo.error({ title: 'No se pudo copiar', description: 'Selecciona la contraseña y cópiala manualmente.' }); }
                }}
              >
                Copiar y cerrar
              </button>
              <button className="saas-btn saas-btn-secondary" onClick={() => setResetPasswordCreds(null)}>Cerrar</button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

export default ClinicDetailView;
