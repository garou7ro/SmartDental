import React from 'react';
import useSupabaseQuery from '../../hooks/useSupabaseQuery';
import { unwrap } from '../../lib/supabaseErrors';
import { QueryState, EmptyState, SkeletonTable } from '../../components/ui/Loading';
import { supabase } from '../../lib/supabaseClient';

export default function ClinicDetailAudit({ clinicId }) {
  const query = useSupabaseQuery(
    (signal) => supabase.from('audit_logs').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }).abortSignal(signal).then(unwrap),
    { key: clinicId, enabled: !!clinicId }
  );

  return (
    <div className="saas-panel-card">
      <div className="saas-panel-header">
        <div className="saas-panel-title">
          <h3>Bitácora de Seguridad & Auditoría</h3>
          <p>Eventos administrativos registrados para esta clínica.</p>
        </div>
      </div>

      <div className="saas-table-container">
          <QueryState query={query} skeleton={<SkeletonTable rows={4} cols={4} />} empty={<EmptyState title="No se registran eventos de auditoría para esta clínica." />}>
            {(logs) => (
            <table className="saas-table">
            <thead>
              <tr>
                <th className="saas-th">Fecha & Hora</th>
                <th className="saas-th">Categoría</th>
                <th className="saas-th">Usuario Operador</th>
                <th className="saas-th">Detalle de la Operación</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => {
                const categoryColor = 
                  log.category === 'Security' ? 'var(--saas-error)' : 
                  (log.category === 'Clínica' ? 'var(--saas-accent)' : 'var(--saas-text-muted)');

                return (
                  <tr key={log.id || idx} className="saas-tr">
                    <td className="saas-td" style={{ fontSize: '0.80rem', color: 'var(--saas-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(log.created_at).toLocaleString('es-PE')}
                    </td>
                    <td className="saas-td">
                      <span 
                        style={{
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${categoryColor}`,
                          color: categoryColor,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}
                      >
                        {log.category ? log.category.toUpperCase() : 'SISTEMA'}
                      </span>
                    </td>
                    <td className="saas-td" style={{ fontWeight: 600, color: 'var(--saas-text)' }}>
                      {log.user_email}
                    </td>
                    <td className="saas-td" style={{ color: 'var(--saas-text-muted)', fontSize: '0.84rem' }}>
                      {log.details}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
            )}
          </QueryState>
      </div>
    </div>
  );
}
