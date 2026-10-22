import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, CalendarDays, ArrowUpRight, CircleCheck, CirclePause, Plus } from '../../components/icons';
import { QueryState, SkeletonCards, EmptyState } from '../../components/ui/Loading';
import CountUp from '../../components/ui/CountUp';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function PlatformOverview({ clinics = [], kpisQuery, name, onCreateClinic }) {
  const active = clinics.filter(clinic => clinic.status === 'active');
  const plans = [
    { key: 'basico', label: 'Básico', count: active.filter(clinic => clinic.plan === 'basico').length },
    { key: 'pro', label: 'Pro', count: active.filter(clinic => clinic.plan === 'pro').length },
  ];
  const otherPlans = active.filter(clinic => !['basico', 'pro'].includes(clinic.plan)).length;
  if (otherPlans) plans.push({ key: 'other', label: 'Otros o sin plan', count: otherPlans });
  // Omite tratamientos como «Dr.» o «Dra.» para saludar por el nombre.
  const firstName = String(name || '').trim().split(/\s+/).find((w) => !/^(dr|dra|lic|od|cd|mg|sr|sra)\.?$/i.test(w));
  const today = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <section className="sd-directory">
      <div className="sd-section-heading sd-overview-hero">
        <div className="sd-overview-hero__aurora" aria-hidden="true"><i /><i /><i /></div>
        <div>
          <span className="sd-eyebrow">{today}</span>
          <h2>{greeting()}{firstName ? `, ${firstName}` : ''}.</h2>
          <p>Tu red de clínicas, sus equipos y la actividad de la plataforma, en una sola vista.</p>
          <div className="sd-hero-actions">
            <Link className="saas-btn saas-btn-secondary sd-hero-link" to="/admin-panel?section=clinics">Explorar clínicas <ArrowUpRight size={16} aria-hidden="true" /></Link>
            {onCreateClinic && <button type="button" className="saas-btn saas-btn-primary sd-hero-link" onClick={onCreateClinic}><Plus size={16} aria-hidden="true" />Nueva clínica</button>}
          </div>
        </div>
        <div className="sd-overview-art" aria-hidden="true">
          <span className="sd-overview-art__orbit"><i /></span>
          <span className="sd-overview-art__tile"><img src="/landing/logo-mark-256.webp" alt="" width="64" height="64" /></span>
          <span className="sd-overview-art__caption">TU RED DE CLÍNICAS</span>
        </div>
      </div>

      <div className="sd-admin-metrics">
        {[
          [Building2, 'Clínicas registradas', clinics.length, 'Directorio de la plataforma'],
          [CircleCheck, 'Clínicas activas', active.length, 'Con acceso habilitado'],
          [CirclePause, 'Clínicas suspendidas', clinics.filter(clinic => clinic.status === 'suspended').length, 'Con acceso suspendido'],
        ].map(([Icon, label, count, description], i) => (
          <div className="sd-admin-metric" key={label} style={{ '--d': `${i * 70}ms` }}>
            <div className="sd-metric-top"><span>{label}</span><Icon size={18} aria-hidden="true" /></div>
            <strong><CountUp value={count} /></strong>
            <small>{description}</small>
          </div>
        ))}
      </div>

      <div className="saas-grid-2 sd-overview-grid">
        <div className="saas-panel-card">
          <div className="saas-panel-title">
            <span className="sd-eyebrow">Distribución</span><h3>Planes de clínicas activas</h3>
            <p>Asignaciones registradas; no representan pagos confirmados.</p>
          </div>
          {active.length ? (
            <div className="sd-plan-list">
              {plans.map((plan, i) => (
                <div key={plan.key}>
                  <div>
                    <span>{plan.label}</span>
                    <strong>{plan.count} {plan.count === 1 ? 'clínica' : 'clínicas'}</strong>
                  </div>
                  <div
                    className={`sd-plan-bar is-${plan.key}`}
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={active.length}
                    aria-valuenow={plan.count}
                    aria-label={`Clínicas activas en plan ${plan.label}`}
                    style={{ '--p': plan.count / active.length, '--d': `${200 + i * 120}ms` }}
                  ><i /></div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin clínicas activas"
              description="La distribución aparecerá cuando haya clínicas con estado activo."
            />
          )}
        </div>
      </div>
    </section>
  );
}
