import React from 'react';
import useSupabaseQuery from '../../hooks/useSupabaseQuery';
import { unwrap } from '../../lib/supabaseErrors';
import { QueryState, EmptyState, SkeletonTable } from '../../components/ui/Loading';
import { supabase } from '../../lib/supabaseClient';

export default function ClinicDetailBilling({ clinicId, plan }) {
  const query = useSupabaseQuery(
    (signal) => supabase.from('suscripcion_pagos').select('*').eq('clinic_id', clinicId).order('fecha_cobro', { ascending: false }).abortSignal(signal).then(unwrap),
    { key: clinicId, enabled: !!clinicId }
  );
  const isPro = plan === 'pro';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* ── Subscription Plan Card ── */}
      <div className="saas-panel-card" style={{ borderLeft: '4px solid var(--saas-accent)' }}>
        <div className="saas-panel-header" style={{ marginBottom: '14px' }}>
          <div className="saas-panel-title">
            <h3>Suscripción de la clínica</h3>
            <p>Plan registrado y cobros de suscripción.</p>
          </div>
        </div>

        <div className="liquid-glass-kpi-strip" style={{ marginBottom: 0 }}>
          <div className="liquid-glass-kpi-item">
            <span className="liquid-glass-kpi-label">Plan Contratado</span>
            <div className="liquid-glass-kpi-val" style={{ fontSize: '1.25rem' }}>
              {isPro ? 'SmartDental Pro' : 'SmartDental Básico'}
            </div>
            <span className="liquid-glass-kpi-sub">{isPro ? 'Hasta 8 empleados staff' : 'Hasta 3 empleados staff'}</span>
          </div>

          <div className="liquid-glass-kpi-item">
            <span className="liquid-glass-kpi-label">Tarifa Recurrente</span>
            <div className="liquid-glass-kpi-val" style={{ color: 'var(--saas-accent)' }}>
              {isPro ? 'S/ 100.00' : 'S/ 70.00'}
            </div>
            <span className="liquid-glass-kpi-sub">Tarifa del plan registrado</span>
          </div>

          <div className="liquid-glass-kpi-item">
            <span className="liquid-glass-kpi-label">Ciclo de Facturación</span>
            <div className="liquid-glass-kpi-val" style={{ fontSize: '1.15rem' }}>
              Mensual
            </div>
            <span className="liquid-glass-kpi-sub">Gestión comercial por contacto</span>
          </div>
        </div>
      </div>

      {/* ── Transaction History Table ── */}
      <div className="saas-panel-card">
        <div className="saas-panel-header">
          <div className="saas-panel-title">
            <h3>Cobros registrados</h3>
            <p>Historial de cobros de suscripción registrados para esta clínica</p>
          </div>
        </div>

        <div className="saas-table-container">
          <QueryState query={query} skeleton={<SkeletonTable rows={4} cols={5} />} empty={<EmptyState title="No se registran cobros para esta clínica." />}>
            {(payments) => (
            <table className="saas-table">
              <thead>
                <tr>
                  <th className="saas-th">N° Comprobante</th>
                  <th className="saas-th">Fecha de Cobro</th>
                  <th className="saas-th">Medio de Pago</th>
                  <th className="saas-th">Estado</th>
                  <th className="saas-th" style={{ textAlign: 'right' }}>Monto Facturado</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="saas-tr">
                    <td className="saas-td" style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                      {p.factura_code || 'No registrado'}
                    </td>
                    <td className="saas-td" style={{ color: 'var(--saas-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(p.fecha_cobro || p.created_at).toLocaleDateString('es-PE')}
                    </td>
                    <td className="saas-td">{p.medio_pago || 'No registrado'}</td>
                    <td className="saas-td">
                      <span className={`saas-pill ${p.estado === 'paid' ? 'active' : 'suspended'}`}>
                        {p.estado === 'paid' ? 'Pagado' : (p.estado === 'pending' ? 'Pendiente' : 'Rechazado')}
                      </span>
                    </td>
                    <td className="saas-td" style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--saas-text)' }}>
                      S/ {Number(p.monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </QueryState>
        </div>
      </div>
    </div>
  );
}
