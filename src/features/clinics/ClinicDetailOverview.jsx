import React from 'react';
import { Users, CalendarClock, Wallet, ShieldCheck, Pencil, KeyRound } from '../../components/icons';
import { QueryState, SkeletonCards, SkeletonTable, EmptyState } from '../../components/ui/Loading';
import CountUp from '../../components/ui/CountUp';

const currency = (n) => Number(n).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });

export default function ClinicDetailOverview({ clinic, kpisQuery, usersQuery, actionPending = false, onResetPasswordClick, onEditClinicClick }) {
  const plan = clinic.plan === 'pro' ? 'Pro' : clinic.plan === 'basico' ? 'Básico' : clinic.plan || 'Sin plan registrado';
  return (
    <div className="sd-directory">
      <div className="saas-grid-2">
        <section className="saas-panel-card">
          <div className="saas-panel-header"><div className="saas-panel-title"><h3>Datos de la clínica</h3><p>Información de registro y contacto.</p></div><button className="saas-btn saas-btn-secondary" onClick={onEditClinicClick}><Pencil size={14} aria-hidden="true" />Editar</button></div>
          <dl className="sd-detail-fields">
            {[[ 'Nombre', clinic.nombre ], [ 'Dirección', clinic.direccion ], [ 'Correo', clinic.email ], [ 'Teléfono', clinic.telefono ], [ 'Plan asignado', plan ], [ 'Fecha de registro', clinic.created_at ? new Date(clinic.created_at).toLocaleDateString('es-PE') : null ]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Sin registrar'}</dd></div>)}
          </dl>
        </section>
        <section className="saas-panel-card">
          <div className="saas-panel-title"><span className="sd-eyebrow">Cuenta responsable</span><h3>Administración de la clínica</h3><p>La cuenta responsable del consultorio.</p></div>
          <QueryState query={usersQuery} skeleton={<SkeletonTable rows={2} cols={2} />} empty={<EmptyState title="Sin equipo registrado" />} errorTitle="No se pudo cargar el administrador">
            {(users) => {
              const admin = users.find(user => user.role === 'clinic_admin');
              return admin ? <div className="sd-directory"><div className="sd-admin-account-mark"><ShieldCheck size={24} aria-hidden="true" /><span>Administración</span></div><dl className="sd-detail-fields"><div><dt>Administrador</dt><dd>{admin.nombre_completo || 'Sin nombre registrado'}</dd></div><div><dt>Correo</dt><dd>{admin.email}</dd></div></dl><button className="saas-btn saas-btn-secondary" disabled={actionPending} onClick={() => onResetPasswordClick(admin)}><KeyRound size={15} aria-hidden="true" />Restablecer contraseña</button></div> : <EmptyState title="Sin administrador asignado" />;
            }}
          </QueryState>
        </section>
      </div>
    </div>
  );
}
