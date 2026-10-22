import React, { useMemo, useState } from 'react';
import { Users, Search, Plus, Pencil, KeyRound, Trash2, X } from '../../components/icons';
import { EmptyState } from '../../components/ui/Loading';

const roleLabel = user => user.role === 'clinic_admin'
  ? 'Administrador'
  : user.assistant_role === 'odontologo' ? 'Odontólogo'
    : user.assistant_role === 'recepcionista' ? 'Recepcionista' : 'Sin función registrada';

export default function ClinicDetailStaff({ users = [], actionPending = false, onCreateUserClick, onEditUserClick, onResetPasswordClick, onDeleteUserClick }) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return users.filter(user => (
      (role === 'all' || (role === 'clinic_admin' ? user.role === role : user.assistant_role === role))
      && [user.nombre_completo, user.email].some(value => String(value || '').toLocaleLowerCase('es').includes(term))
    ));
  }, [users, search, role]);

  return (
    <section className="sd-directory">
      <div className="sd-section-heading sd-section-heading--compact">
        <div>
          <span className="sd-eyebrow">Personas y permisos</span>
          <h2>El equipo detrás de cada atención.</h2>
          <p>Administra los accesos de odontólogos, recepción y dirección.</p>
        </div>
        <button className="saas-btn saas-btn-primary" disabled={actionPending} onClick={onCreateUserClick}>
          <Plus size={17} aria-hidden="true" />Nuevo colaborador
        </button>
      </div>
      <div className="saas-panel-card sd-staff-panel">
        <div className="sd-panel-intro">
          <div><span className="sd-eyebrow">Equipo</span><h3>Colaboradores de la clínica</h3></div>
          <span className="sd-count-tag"><Users size={14} aria-hidden="true" />{users.length} {users.length === 1 ? 'persona' : 'personas'}</span>
        </div>
        <div className="sd-directory-tools">
          <div className="sd-search">
            <Search size={18} aria-hidden="true" />
            <label className="sd-sr-only" htmlFor="staff-search">Buscar por nombre o correo</label>
            <input id="staff-search" className="saas-input" type="search" placeholder="Buscar por nombre o correo…" value={search} onChange={event => setSearch(event.target.value)} />
            {search && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearch('')}><X size={16} aria-hidden="true" /></button>}
          </div>
          <div className="sd-select-filter">
            <label htmlFor="staff-role">Función</label>
            <select id="staff-role" className="saas-input saas-select" value={role} onChange={event => setRole(event.target.value)}>
              <option value="all">Todas las funciones</option>
              <option value="clinic_admin">Administración</option>
              <option value="odontologo">Odontología</option>
              <option value="recepcionista">Recepción anterior</option>
            </select>
          </div>
        </div>
        <p className="sd-results" role="status">{filtered.length} {filtered.length === 1 ? 'colaborador encontrado' : 'colaboradores encontrados'}</p>
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title={users.length ? 'Sin coincidencias' : 'Un equipo por construir'}
            description={users.length ? 'Prueba otro nombre, correo o función.' : 'Registra al primer colaborador para administrar su acceso desde aquí.'}
            action={users.length ? <button className="saas-btn saas-btn-secondary" onClick={() => { setSearch(''); setRole('all'); }}>Restablecer filtros</button> : undefined} />
        ) : (
          <div className="saas-table-container" tabIndex={0} role="region" aria-label="Equipo de la clínica; desplaza horizontalmente para ver las acciones">
            <table className="saas-table sd-staff-table">
              <caption className="sd-sr-only">Colaboradores de la clínica</caption>
              <thead><tr>{['Colaborador', 'Función', 'Estado', 'Fecha de alta', 'Acciones'].map(label => <th key={label} scope="col" className="saas-th">{label}</th>)}</tr></thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id} className="saas-tr">
                    <td className="saas-td">
                      <div className="sd-person">
                        <span className={`sd-person-avatar ${user.role === 'clinic_admin' ? 'is-admin' : ''}`} aria-hidden="true">{(user.nombre_completo || user.email || '?').charAt(0).toUpperCase()}</span>
                        <div><strong>{user.nombre_completo || 'Sin nombre registrado'}</strong><small>{user.email || 'Sin correo registrado'}</small></div>
                      </div>
                    </td>
                    <td className="saas-td"><span className="sd-role-tag">{roleLabel(user)}</span></td>
                    <td className="saas-td"><span className={`saas-pill ${user.status}`}>{user.status === 'active' ? 'Activo' : user.status === 'suspended' ? 'Suspendido' : 'Sin estado registrado'}</span></td>
                    <td className="saas-td sd-date">{user.created_at ? new Date(user.created_at).toLocaleDateString('es-PE') : 'Sin fecha registrada'}</td>
                    <td className="saas-td">
                      <div className="sd-row-actions">
                        <button className="saas-btn saas-btn-secondary" disabled={actionPending} aria-label={`Modificar ${user.nombre_completo || user.email}`} onClick={() => onEditUserClick(user)}><Pencil size={15} aria-hidden="true" />Editar</button>
                        <button className="saas-btn saas-btn-secondary sd-icon-button" disabled={actionPending} aria-label={`Restablecer contraseña de ${user.nombre_completo || user.email}`} title="Restablecer contraseña" onClick={() => onResetPasswordClick(user)}><KeyRound size={16} aria-hidden="true" /></button>
                        <button className="saas-btn saas-btn-secondary sd-icon-button sd-danger-action" disabled={actionPending} aria-label={`Eliminar ${user.nombre_completo || user.email}`} title="Eliminar colaborador" onClick={() => onDeleteUserClick(user)}><Trash2 size={16} aria-hidden="true" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
