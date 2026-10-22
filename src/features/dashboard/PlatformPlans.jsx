import React from 'react';
import { Check, Users, Layers3 } from '../../components/icons';

export default function PlatformPlans() {
  const plans = [
    { id: 'basico', name: 'Básico', label: 'Para equipos pequeños', price: 70, staff: 3 },
    { id: 'pro', name: 'Pro', label: 'Para un equipo en crecimiento', price: 100, staff: 8 },
  ];
  return (
    <section className="sd-directory">
      <div className="sd-section-heading">
        <div><span className="sd-eyebrow">Planes comerciales</span><h2>Un plan para cada equipo.</h2><p>Consulta las tarifas y la capacidad de personal de cada plan.</p></div>
      </div>
      <div className="saas-grid-2 sd-plan-cards">
        {plans.map(plan => (
          <article key={plan.id} className={`saas-panel-card sd-commercial-plan ${plan.id === 'pro' ? 'is-pro' : ''}`}>
            <div className="sd-commercial-plan__top"><span className="sd-eyebrow">{plan.label}</span><Layers3 size={24} strokeWidth={1.4} aria-hidden="true" /></div>
            <h3>SmartDental {plan.name}</h3>
            <div className="sd-commercial-plan__price"><span>S/</span><strong>{plan.price}</strong><span>/ mes</span></div>
            <div className="sd-commercial-plan__capacity"><Users size={18} aria-hidden="true" /><span>Hasta <strong>{plan.staff} colaboradores</strong></span></div>
            <ul className="sd-feature-list">
              {['Gestión de pacientes', 'Agenda y citas', 'Odontograma y fichas clínicas'].map(feature => <li key={feature}><Check size={16} aria-hidden="true" />{feature}</li>)}
            </ul>
            <p className="sd-commercial-plan__note">El plan se asigna desde la ficha de cada clínica.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
