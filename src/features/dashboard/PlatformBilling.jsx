import React from 'react';
import useSupabaseQuery from '../../hooks/useSupabaseQuery';
import { unwrap } from '../../lib/supabaseErrors';
import { ErrorState, SkeletonTable } from '../../components/ui/Loading';
import { supabase } from '../../lib/supabaseClient';

export default function PlatformBilling() {

  const query = useSupabaseQuery(
    (signal) => supabase.from('suscripcion_pagos').select('*, clinics(nombre)').order('fecha_cobro', { ascending: false }).abortSignal(signal).then(unwrap),
    { key: 'platform-billing', enabled: true }
  );
  const payments = query.data ?? [];

  return (
    <div className="saas-panel-card">
      <div className="saas-panel-header">
        <div className="saas-panel-title">
          <h3>Historial de Transacciones de Plataforma</h3>
          <p>Registro de pagos por suscripción facturados a las clínicas dentales</p>
        </div>
      </div>

      <div className="saas-table-container">
        {query.isLoading ? (
          <SkeletonTable rows={4} cols={4} label="Cargando transacciones" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : payments.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--saas-text-muted)' }}>
            No se han registrado transacciones de facturación.
          </div>
        ) : (
          <table className="saas-table">
            <thead>
              <tr>
                <th className="saas-th">Factura</th>
                <th className="saas-th">Clínica</th>
                <th className="saas-th">Fecha de Cobro</th>
                <th className="saas-th">Monto</th>
                <th className="saas-th">Medio de Pago</th>
                <th className="saas-th">Estado</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="saas-tr">
                  <td className="saas-td" style={{ fontWeight: 600, color: 'var(--saas-accent)' }}>{p.factura_code}</td>
                  <td className="saas-td" style={{ fontWeight: 500 }}>{p.clinics?.nombre || 'Clínica Eliminada'}</td>
                  <td className="saas-td">{new Date(p.fecha_cobro).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="saas-td" style={{ fontWeight: 600 }}>S/ {Number(p.monto).toFixed(2)}</td>
                  <td className="saas-td" style={{ color: 'var(--saas-text-muted)' }}>{p.medio_pago}</td>
                  <td className="saas-td">
                    <span className={`saas-pill ${p.estado === 'paid' ? 'active' : p.estado === 'pending' ? 'warning' : 'suspended'}`}>
                      {p.estado === 'paid' ? 'Cobrado' : p.estado === 'pending' ? 'Pendiente' : 'Fallido'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
