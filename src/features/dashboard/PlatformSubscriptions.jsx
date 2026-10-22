import React from 'react';
import { CircleCheck, Wallet } from '../../components/icons';
import { EmptyState } from '../../components/ui/Loading';

const rates = { basico: 70, pro: 100 };
const money = amount => amount.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });

export default function PlatformSubscriptions({ clinics = [] }) {
  const active = clinics.filter(clinic => clinic.status === 'active');
  const knownPlans = active.filter(clinic => rates[clinic.plan] != null);
  const total = knownPlans.reduce((sum, clinic) => sum + rates[clinic.plan], 0);
  return (
    <section className="sd-directory">
      <div className="sd-section-heading">
        <div><span className="sd-eyebrow">Suscripciones</span><h2>Una visión de tus planes activos.</h2><p>Estado de las clínicas y estimación mensual según su plan asignado.</p></div>
      </div>
      <div className="sd-admin-metrics sd-admin-metrics--pair">
        <div className="sd-admin-metric"><div className="sd-metric-top"><span>Clínicas activas</span><CircleCheck size={18} aria-hidden="true" /></div><strong>{active.length}<span className="sd-metric-denominator"> / {clinics.length}</span></strong><small>Del total de clínicas registradas</small></div>
        <div className="sd-admin-metric"><div className="sd-metric-top"><span>Tarifa mensual estimada</span><Wallet size={18} aria-hidden="true" /></div><strong>{money(total)}</strong><small>{knownPlans.length} clínicas activas con tarifa conocida. No equivale a pagos recibidos.</small></div>
      </div>
      <div className="saas-panel-card">
        <div className="sd-panel-intro"><div><span className="sd-eyebrow">Detalle</span><h3>Planes asignados</h3></div><span className="sd-count-tag">{clinics.length} clínicas</span></div>
        {!clinics.length ? <EmptyState title="Sin clínicas registradas" description="Los planes asignados aparecerán aquí al registrar una clínica." /> : (
          <div className="saas-table-container" tabIndex={0} role="region" aria-label="Planes asignados; desplaza horizontalmente para ver todas las columnas">
            <table className="saas-table">
              <caption className="sd-sr-only">Planes asignados por clínica</caption>
              <thead><tr>{['Clínica', 'Plan', 'Tarifa mensual', 'Estado de la clínica'].map(label => <th scope="col" className="saas-th" key={label}>{label}</th>)}</tr></thead>
              <tbody>{clinics.map(clinic => <tr key={clinic.id} className="saas-tr">
                <td className="saas-td"><strong>{clinic.nombre}</strong></td>
                <td className="saas-td">{clinic.plan === 'pro' ? 'Pro' : clinic.plan === 'basico' ? 'Básico' : 'Sin plan conocido'}</td>
                <td className="saas-td sd-date">{rates[clinic.plan] != null ? money(rates[clinic.plan]) : 'Sin tarifa registrada'}</td>
                <td className="saas-td"><span className={`saas-pill ${clinic.status}`}>{clinic.status === 'active' ? 'Activa' : clinic.status === 'suspended' ? 'Suspendida' : 'Sin estado registrado'}</span></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
