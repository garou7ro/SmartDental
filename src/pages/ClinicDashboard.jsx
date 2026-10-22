import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, CalendarClock, CalendarDays, FileText, MessageCircle, Sparkles, Users, Wallet } from '../components/icons';
import useAuth from '../hooks/useAuth';
import useSupabaseQuery from '../hooks/useSupabaseQuery';
import { invokeFunction } from '../lib/api';
import { EmptyState, ErrorState, LoadingBar, Skeleton, SkeletonCards, SkeletonTable } from '../components/ui/Loading';
import CountUp from '../components/ui/CountUp';
import '../styles/admin.css';
import '../styles/admin-experience.css';

const currency = (n) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function ClinicDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const clinicSlug = profile?.clinic_name
    ? profile.clinic_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : 'mi-clinica';

  // KPIs reales de la clínica (Edge Function clinic-kpis). Sin datos inventados.
  const kpiQuery = useSupabaseQuery(
    () => invokeFunction('clinic-kpis', { action: 'clinic', clinic_id: profile?.clinic_id }),
    { key: profile?.clinic_id, enabled: !!profile?.clinic_id }
  );
  const kpis = kpiQuery.data;

  if (kpiQuery.isLoading || kpiQuery.status === 'idle') {
    return (
      <div className="clinic-page-container sd-page-skeleton">
        <Skeleton w={260} h={34} r={10} />
        <SkeletonCards count={4} height={130} label="Cargando indicadores de la clínica" />
        <SkeletonTable rows={5} cols={5} label="Cargando pacientes recientes" />
      </div>
    );
  }

  if (kpiQuery.isError && !kpis) {
    return (
      <div className="clinic-page-container">
        <ErrorState error={kpiQuery.error} onRetry={kpiQuery.refetch} title="No se pudo cargar el resumen clínico" />
      </div>
    );
  }

  const isOwner = profile?.role === 'clinic_admin';
  const isPro = kpis?.plan === 'pro';
  // Omite tratamientos como «Dr.» o «Dra.» para saludar por el nombre.
  const firstName = String(profile?.nombre_completo || profile?.email?.split('@')[0] || '').trim().split(/\s+/).find((w) => !/^(dr|dra|lic|od|cd|mg|sr|sra)\.?$/i.test(w));
  const today = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  const appointments = kpis?.appointment_count ?? 0;
  const pending = kpis?.pending_appointments ?? 0;
  const go = (suffix) => navigate(`/${clinicSlug}${suffix}`);

  const metrics = [
    { icon: Users, label: 'Pacientes', value: kpis?.patient_count ?? 0, note: 'Fichas registradas en tu consultorio' },
    { icon: CalendarDays, label: 'Citas registradas', value: appointments, note: `${pending} pendientes · ${Math.max(0, appointments - pending)} atendidas` },
    isOwner
      ? { icon: Wallet, label: 'Ingresos registrados', value: kpis?.total_revenue ?? null, format: currency, note: 'Movimientos de caja chica' }
      : { icon: CalendarClock, label: 'Citas pendientes', value: pending, note: 'Por confirmar o atender' },
  ];

  return (
    <div className="clinic-page-container sd-clinic-home">
      <LoadingBar active={kpiQuery.isRefreshing} />
      {kpiQuery.isError && <ErrorState compact error={kpiQuery.error} onRetry={kpiQuery.refetch} title="No se pudo actualizar" />}

      <section className="sd-section-heading sd-overview-hero">
        <div className="sd-overview-hero__aurora" aria-hidden="true"><i /><i /><i /></div>
        <div>
          <span className="sd-eyebrow">{today}</span>
          <h2>{greeting()}{firstName ? `, ${firstName}` : ''}.</h2>
          <p>
            {isOwner ? 'Así va hoy' : 'Tu jornada en'} <strong>{kpis?.clinic_name || profile?.clinic_name || 'tu consultorio'}</strong>: agenda, pacientes y mensajes en un solo lugar.
          </p>
          <div className="sd-hero-actions">
            <button type="button" className="saas-btn saas-btn-primary sd-hero-link" onClick={() => go('/agenda')}><CalendarDays size={16} aria-hidden="true" />Abrir agenda</button>
            <button type="button" className="saas-btn saas-btn-secondary sd-hero-link" onClick={() => go('/patients')}><Users size={16} aria-hidden="true" />Pacientes</button>
            <button type="button" className="saas-btn saas-btn-secondary sd-hero-link sd-hero-link--wa" onClick={() => go('/whatsapp')}><MessageCircle size={16} aria-hidden="true" />WhatsApp</button>
          </div>
        </div>
        <div className="sd-overview-art" aria-hidden="true">
          <span className="sd-overview-art__orbit"><i /></span>
          <span className="sd-overview-art__tile"><img src="/landing/logo-mark-256.webp" alt="" width="64" height="64" /></span>
          <span className="sd-overview-art__caption">{isPro ? 'PLAN PRO' : 'PLAN BÁSICO'}</span>
        </div>
      </section>

      <div className="sd-admin-metrics">
        {metrics.map(({ icon: Icon, label, value, note, format }) => (
          <div className="sd-admin-metric" key={label}>
            <div className="sd-metric-top"><span>{label}</span><Icon size={18} aria-hidden="true" /></div>
            <strong>{value == null ? '—' : <CountUp value={Number(value)} format={format} />}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>

      <div className="clinic-main-grid">
        <section className="saas-panel-card">
          <div className="saas-panel-header">
            <div className="saas-panel-title">
              <span className="sd-eyebrow">Últimos registros</span>
              <h3>{isOwner ? 'Pacientes recientes' : 'Pacientes en atención'}</h3>
              <p>Las fichas más recientes de tu consultorio.</p>
            </div>
            <button type="button" onClick={() => go('/patients')} className="saas-btn saas-btn-secondary">
              Ver todos <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          </div>

          {!kpis?.recent_patients?.length ? (
            <EmptyState icon={Users} title="Aún no hay pacientes" description="Los pacientes que registres aparecerán aquí." />
          ) : (
            <div className="saas-table-container" tabIndex={0} role="region" aria-label="Pacientes recientes">
              <table className="saas-table">
                <thead>
                  <tr>
                    <th scope="col" className="saas-th">Paciente</th>
                    <th scope="col" className="saas-th">Documento</th>
                    <th scope="col" className="saas-th">Teléfono</th>
                    <th scope="col" className="saas-th">Tratamiento</th>
                    <th scope="col" className="saas-th"><span className="sd-sr-only">Acción</span></th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.recent_patients.map((p) => (
                    <tr key={p.id} className="saas-tr">
                      <td className="saas-td">
                        <div className="sd-person">
                          <span className="sd-person-avatar is-admin" aria-hidden="true">{(p.nombre || 'P').charAt(0).toUpperCase()}</span>
                          <div><strong>{p.nombre}</strong></div>
                        </div>
                      </td>
                      <td className="saas-td sd-date">{p.dni || '—'}</td>
                      <td className="saas-td">{p.telefono || '—'}</td>
                      <td className="saas-td"><span className="sd-role-tag">{p.tratamiento || 'Sin tratamiento asignado'}</span></td>
                      <td className="saas-td" style={{ textAlign: 'right' }}>
                        <button type="button" onClick={() => go('/patients')} className="saas-btn saas-btn-secondary sd-icon-button" aria-label={`Abrir ficha de ${p.nombre}`}>
                          <FileText size={15} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="saas-panel-card sd-wa-card">
          <div className="sd-wa-card__head">
            <span className="sd-wa-card__icon"><MessageCircle size={20} aria-hidden="true" /></span>
            <div>
              <span className="sd-eyebrow">Mensajería</span>
              <h3>WhatsApp del consultorio</h3>
            </div>
          </div>
          <p>
            {isPro
              ? 'Con el plan Pro, la IA redacta respuestas cordiales a los mensajes de tus pacientes y deja la conversación registrada para tu equipo.'
              : 'Con el plan Básico, un menú automático responde a tus pacientes y comparte el horario que publiques.'}
          </p>
          <dl className="sd-wa-card__facts">
            <div><dt>Respuestas</dt><dd>{isPro ? 'Redactadas con IA' : 'Menú automático'}</dd></div>
            <div><dt>Asistente del panel</dt><dd><Sparkles size={13} aria-hidden="true" />Solo consulta</dd></div>
          </dl>
          <button type="button" onClick={() => go('/whatsapp')} className="saas-btn sd-wa-card__cta">
            <MessageCircle size={16} aria-hidden="true" />Abrir consola de WhatsApp
          </button>
        </aside>
      </div>
    </div>
  );
}
