import React, { useState } from 'react';
import { BrandIcon } from '../components/icons/BrandIcons';
import '../styles/clinic-pages.css';
import useAuth from '../hooks/useAuth';
import { sileo } from 'sileo';
import useSupabaseQuery from '../hooks/useSupabaseQuery';
import useAsyncAction from '../hooks/useAsyncAction';
import { invokeFunction } from '../lib/api';
import { whatsappLink } from '../config/contact';
import { ButtonLabel, EmptyState, ErrorState, LoadingBar, SkeletonTable } from '../components/ui/Loading';

/* ─── Vector SVG Icons ─── */

export default function ClinicSettings() {
  const { profile } = useAuth();

  // User Creation State
  const [showAddUser, setShowAddUser] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [assistantRole, setAssistantRole] = useState('odontologo');

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // User Deletion State
  const [showDeleteUser, setShowDeleteUser] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState(null);
  const [deleteDataType, setDeleteDataType] = useState('none'); // 'none' | 'transfer' | 'delete'
  const [transferToUserId, setTransferToUserId] = useState('');

  const isOwner = profile?.role === 'clinic_admin';

  // Equipo de la clínica (Edge Function manage-users, que aplica los permisos en el servidor)
  const usersQuery = useSupabaseQuery(
    () => invokeFunction('manage-users', { action: 'list', clinic_id: profile.clinic_id }).then((d) => d?.users ?? []),
    { key: profile?.clinic_id, enabled: !!profile?.clinic_id && isOwner }
  );
  const users = usersQuery.data ?? [];
  const fetchData = () => usersQuery.refetch();

  const createAction = useAsyncAction((body) => invokeFunction('manage-users', body));
  const createLoading = createAction.pending;

  const deleteAction = useAsyncAction((body) => invokeFunction('manage-users', body));
  const deleteLoading = deleteAction.pending;
  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim() || !password.trim()) {
      sileo.warning({ title: 'Campos requeridos', description: 'Por favor completa todos los campos del usuario.' });
      return;
    }

    const res = await createAction.run({
      action: 'create',
      email: email.trim(),
      password: password.trim(),
      nombre_completo: fullName.trim(),
      clinic_id: profile.clinic_id,
      role: 'assistant',
      assistant_role: 'odontologo'
    });
    if (res.skipped) return;
    if (!res.ok) {
      // el servidor explica límites de plan o correos repetidos; se muestra su mensaje si existe
      sileo.error({ title: 'No se pudo crear el acceso', description: res.error.cause?.serverMessage || res.error.message });
      return;
    }
    sileo.success({ title: 'Miembro agregado', description: `Se creó la cuenta para ${fullName.trim()}.` });
    setEmail(''); setPassword(''); setFullName(''); setShowAddUser(false);
    fetchData();
  };

  const handleDeleteUser = async (e) => {
    e.preventDefault();
    if (!selectedUserForDelete) return;

    const res = await deleteAction.run({
      action: 'delete',
      id: selectedUserForDelete.id
    });

    if (res.skipped) return;
    if (!res.ok) {
      sileo.error({ 
        title: 'No se pudo eliminar el usuario', 
        description: res.error.cause?.serverMessage || res.error.message 
      });
      return;
    }

    sileo.success({ 
      title: 'Usuario Eliminado', 
      description: 'El colaborador y sus datos han sido procesados de forma segura.' 
    });
    setShowDeleteUser(false);
    setSelectedUserForDelete(null);
    fetchData();
  };

  const planLabel = profile?.clinic_plan ? `Plan ${profile.clinic_plan.charAt(0).toUpperCase()}${profile.clinic_plan.slice(1)}` : 'Tu plan';

  if (!isOwner) {
    return (
      <div className="clinic-page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="glass-panel" style={{ maxWidth: '500px', padding: '40px 30px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-main)' }}>Acceso Restringido</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
            La gestión del personal y el plan de facturación de la clínica solo está disponible para el administrador principal.
          </p>
        </div>
      </div>
    );
  }

  const isPro = profile?.clinic_plan === 'pro';
  const seatLimit = isPro ? 8 : 3;
  const seatsUsed = users.length;
  const roleOf = (u) => (u.role === 'clinic_admin' ? 'Titular' : u.assistant_role === 'odontologo' ? 'Odontólogo' : 'Recepción');
  const initials = (u) => (u.nombre_completo || u.email || 'U').replace(/^(dra?|lic)\.?\s+/i, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <div className="clinic-page-container cp-page">
      <header className="cp-page-head">
        <div>
          <span className="odo-kicker">Equipo y plan</span>
          <h2>Tu equipo, con los accesos justos</h2>
          <p>{seatsUsed} de {seatLimit} usuarios · plan {isPro ? 'Pro' : 'Básico'}</p>
        </div>
        <button type="button" onClick={() => setShowAddUser(true)} className="saas-btn saas-btn-primary cp-cta" disabled={seatsUsed >= seatLimit} title={seatsUsed >= seatLimit ? 'Alcanzaste el límite de usuarios de tu plan' : undefined}>
          <BrandIcon name="patientAdd" size={18} />Agregar miembro
        </button>
      </header>

      <section className={`set-plan ${isPro ? 'is-pro' : ''}`}>
        <div className="set-plan__main">
          <span className="odo-kicker">Plan actual</span>
          <h3>{planLabel}</h3>
          <p>{isPro
            ? 'Hasta 8 usuarios, asistente Denti en el panel y respuestas con IA a tus pacientes por WhatsApp.'
            : 'Hasta 3 usuarios, asistente Denti en el panel y menú automático de WhatsApp.'}</p>
        </div>
        <div className="set-plan__seats" aria-label={`${seatsUsed} de ${seatLimit} usuarios en uso`}>
          <div className="set-plan__dots">{Array.from({ length: seatLimit }, (_, i) => <i key={i} className={i < seatsUsed ? 'is-on' : ''} style={{ '--i': i }} />)}</div>
          <small>{seatsUsed} de {seatLimit} usuarios</small>
        </div>
        <div className="set-plan__price"><b>S/ {isPro ? '100' : '70'}</b><span>al mes</span></div>
        <button type="button" onClick={() => setShowUpgradeModal(true)} className="saas-btn saas-btn-secondary"><BrandIcon name="plans" size={16} />Gestionar plan</button>
      </section>

      <LoadingBar active={usersQuery.isRefreshing} />
      {usersQuery.isError && usersQuery.data && <ErrorState compact error={usersQuery.error} onRetry={fetchData} title="No se pudo actualizar" />}
      {usersQuery.isLoading || usersQuery.status === 'idle' ? (
        <SkeletonTable rows={3} cols={4} label="Cargando equipo" />
      ) : usersQuery.isError && !usersQuery.data ? (
        <ErrorState error={usersQuery.error} onRetry={fetchData} title="No se pudo cargar el equipo" />
      ) : usersQuery.isEmpty ? (
        <EmptyState title="Aún no hay usuarios en tu equipo" description="Crea accesos para tu equipo con «Agregar miembro»." />
      ) : (
        <ul className="set-team">
          {users.map((u, i) => {
            const owner = u.role === 'clinic_admin';
            return (
              <li key={u.id} className={`set-member ${owner ? 'is-owner' : ''}`} style={{ '--i': i }}>
                <span className="cp-avatar is-lg" aria-hidden="true">{initials(u)}</span>
                <div className="set-member__main">
                  <strong>{u.nombre_completo || u.email.split('@')[0]}{u.id === profile.id && <em> (tú)</em>}</strong>
                  <small>{u.email}</small>
                </div>
                <span className={`set-role is-${owner ? 'owner' : u.assistant_role === 'odontologo' ? 'dentist' : 'front'}`}>{roleOf(u)}</span>
                {!owner && u.id !== profile.id ? (
                  <button type="button" className="cp-close set-remove" aria-label={`Quitar acceso de ${u.nombre_completo || u.email}`} title="Quitar acceso y reasignar datos"
                    onClick={() => { setSelectedUserForDelete(u); setDeleteDataType('none'); setTransferToUserId(''); setShowDeleteUser(true); }}>
                    <BrandIcon name="trash" size={17} />
                  </button>
                ) : <span className="set-member__lock" title="La cuenta titular no se puede eliminar"><BrandIcon name="shield" size={17} /></span>}
              </li>
            );
          })}
        </ul>
      )}

      {/* ── MODAL: AGREGAR USUARIO ── */}
      {showAddUser && (
        <div className="saas-modal-overlay">
          <div className="saas-modal-card" style={{ maxWidth: '480px' }}>
            <div className="saas-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>Registrar Miembro de Staff</h3>
              <button className="saas-modal-close" onClick={() => setShowAddUser(false)}>✕</button>
            </div>
            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '24px' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nombre Completo *</label>
                <input type="text" className="form-input" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Ej. Dr. Marcelo Espinoza" style={{ paddingLeft: '16px' }} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Correo Electrónico *</label>
                <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required placeholder="dr.espinoza@smartdental.pe" style={{ paddingLeft: '16px' }} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Contraseña Inicial *</label>
                <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={{ paddingLeft: '16px' }} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Especialidad / Rol en Clínica *</label>
                <select className="form-input" value={assistantRole} onChange={e => setAssistantRole(e.target.value)} style={{ background: 'var(--bg-primary)', color: 'var(--text-main)', paddingLeft: '16px' }}>
                  <option value="odontologo">Odontólogo Especialista</option>
                  
                </select>
              </div>

              <div style={{ display: 'flex', gap: '14px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddUser(false)} className="saas-btn saas-btn-secondary press-feedback" style={{ flex: 1, padding: '12px' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={createLoading} className="saas-btn saas-btn-primary press-feedback" style={{ flex: 1, padding: '12px' }}>
                  <ButtonLabel pending={createLoading} pendingLabel="Creando…">Crear Acceso</ButtonLabel>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: SUSCRIPCIÓN PRO ── */}
      {showUpgradeModal && (
        <div className="saas-modal-overlay">
          <div className="saas-modal-card" style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div className="saas-modal-header" style={{ justifyContent: 'center', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{planLabel}</h3>
              <button className="saas-modal-close" style={{ position: 'absolute', right: '16px' }} onClick={() => setShowUpgradeModal(false)}>✕</button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
                Los cambios y renovaciones de plan se coordinan con el equipo de SmartDental. Escríbenos y te ayudamos.
              </p>

              <a
                href={whatsappLink(`Hola, soy de ${profile?.clinic_name || 'mi consultorio'} y quiero consultar por mi plan de SmartDental.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="saas-btn saas-btn-primary press-feedback"
                style={{ display: 'block', width: '100%', padding: '12px', marginBottom: '10px', textDecoration: 'none' }}
              >
                Consultar por WhatsApp
              </a>
              <button onClick={() => setShowUpgradeModal(false)} className="saas-btn saas-btn-secondary press-feedback" style={{ width: '100%', padding: '10px' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ELIMINAR USUARIO DE FORMA SEGURA ── */}
      {showDeleteUser && selectedUserForDelete && (
        <div className="saas-modal-overlay">
          <div className="saas-modal-card" style={{ maxWidth: '480px' }}>
            <div className="saas-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Eliminar Miembro del Equipo
              </h3>
              <button className="saas-modal-close" onClick={() => setShowDeleteUser(false)}>✕</button>
            </div>
            <form onSubmit={handleDeleteUser} style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '24px' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.90rem', lineHeight: '1.5' }}>
                ¿Estás seguro de que deseas retirar los accesos a <strong style={{ color: 'var(--text-main)' }}>{selectedUserForDelete.nombre_completo || selectedUserForDelete.email}</strong>?
              </p>

<p>Las asignaciones y la información clínica deben gestionarse antes de eliminar una cuenta. Puedes suspender su acceso conservando sus registros.</p>
              <div style={{ display: 'flex', gap: '14px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowDeleteUser(false)} 
                  className="saas-btn saas-btn-secondary press-feedback" 
                  style={{ flex: 1, padding: '12px' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={deleteLoading} 
                  className="saas-btn press-feedback" 
                  style={{ 
                    flex: 1, 
                    padding: '12px',
                    background: '#ef4444',
                    color: '#fff',
                    fontWeight: 800,
                    borderRadius: '12px'
                  }}
                >
                  <ButtonLabel pending={deleteLoading} pendingLabel="Eliminando…">Eliminar de Forma Segura</ButtonLabel>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
