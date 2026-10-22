import React, { useState } from 'react';
import useSupabaseQuery from '../../hooks/useSupabaseQuery';
import { unwrap } from '../../lib/supabaseErrors';
import { ErrorState, SkeletonList, SkeletonTable } from '../../components/ui/Loading';
import { supabase } from '../../lib/supabaseClient';
import { sileo } from 'sileo';

export default function PlatformOperations({ clinics, onAddAuditLog }) {
  // Tickets y bitácora son independientes: si una falla, la otra se sigue mostrando
  const ticketsQuery = useSupabaseQuery(
    (signal) => supabase.from('support_tickets').select('*, clinics(nombre)').order('created_at', { ascending: false }).abortSignal(signal).then(unwrap),
    { key: 'tickets' }
  );
  const logsQuery = useSupabaseQuery(
    (signal) => supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).abortSignal(signal).then(unwrap),
    { key: 'logs' }
  );
  const tickets = ticketsQuery.data ?? [];
  const logs = logsQuery.data ?? [];
  const [searchQuery, setSearchQuery] = useState('');
  
  const [remoteClinicId, setRemoteClinicId] = useState('');
  const [remoteRole, setRemoteRole] = useState('clinic_admin');
  const [generatedToken, setGeneratedToken] = useState('');

  const fetchTicketsAndLogs = () => {
    ticketsQuery.refetch();
    logsQuery.refetch();
  };

  const handleGenerateRemoteToken = async (e) => {
    e.preventDefault();
    if (!remoteClinicId) {
      sileo.warning({ title: 'Seleccione Clínica', description: 'Debe seleccionar una clínica para generar el token.' });
      return;
    }

    const token = `token_remoto_${Math.random().toString(36).substring(2, 10).toUpperCase()}_${Date.now()}`;
    setGeneratedToken(token);
    
    const targetClinicName = clinics.find(c => c.id === remoteClinicId)?.nombre || 'Clínica';
    sileo.success({
      title: 'Acceso Autorizado',
      description: `Firma digital creada para soporte en ${targetClinicName}.`
    });

    if (onAddAuditLog) {
      await onAddAuditLog('Support', `Llave de soporte emitida para clínica: ${targetClinicName} (${remoteRole})`);
      fetchTicketsAndLogs(); // Refresh immediately
    }
  };

  const handleResolveTicket = async (ticketId, ticketCode) => {
    const toastId = sileo.show({ type: 'loading', title: 'Resolviendo', description: `Actualizando ticket ${ticketCode}...` });
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: 'resolved' })
        .eq('id', ticketId);

      sileo.dismiss(toastId);
      if (error) throw error;

      sileo.success({
        title: 'Incidencia Resuelta',
        description: `El ticket ${ticketCode} ha sido marcado como resuelto.`
      });

      if (onAddAuditLog) {
        await onAddAuditLog('Support', `Ticket de soporte marcado como RESUELTO: ${ticketCode}`);
      }

      fetchTicketsAndLogs();
    } catch (err) {
      sileo.dismiss(toastId);
      sileo.error({
        title: 'Error',
        description: err.message || 'No se pudo resolver el ticket.'
      });
    }
  };

  // Filter logs based on search query
  const filteredLogs = logs.filter(log => {
    const term = searchQuery.toLowerCase();
    return (
      log.user_email.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term) ||
      log.category.toLowerCase().includes(term)
    );
  });

  // KPI counters
  const openTicketsCount = tickets.filter(t => t.status === 'open').length;
  const totalAuditLogs = logs.length;
  const supportKeysGenerated = logs.filter(l => l.details.includes('Llave de soporte') || l.details.includes('remoto')).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Operation Metrics Grid */}
      <div className="saas-grid-3">
        <div className="saas-panel-card" style={{ borderLeft: '4px solid var(--saas-error)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--saas-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Incidencias Activas</span>
          <div className="saas-stat-value" style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            {openTicketsCount}
            <span className="saas-pill suspended" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>Pendientes</span>
          </div>
        </div>

        <div className="saas-panel-card" style={{ borderLeft: '4px solid var(--saas-accent)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--saas-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Llaves de Soporte</span>
          <div className="saas-stat-value" style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            {supportKeysGenerated}
            <span className="saas-pill active" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>Emitidas</span>
          </div>
        </div>

        <div className="saas-panel-card" style={{ borderLeft: '4px solid var(--saas-success)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--saas-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Eventos Auditados</span>
          <div className="saas-stat-value" style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            {totalAuditLogs}
            <span className="saas-pill active" style={{ fontSize: '0.68rem', padding: '2px 8px', backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--saas-success)' }}>Bitácora</span>
          </div>
        </div>
      </div>

      {/* 2. Operations Split Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Side: Support and Remote Access */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Remote Access Card */}
          <div className="saas-panel-card">
            <div className="saas-panel-header" style={{ marginBottom: '16px' }}>
              <div className="saas-panel-title">
                <h3>Consola de Acceso Remoto</h3>
                <p>Emite llaves temporales de auditoría para suplantar roles y resolver problemas en clínicas</p>
              </div>
            </div>

            <form onSubmit={handleGenerateRemoteToken} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="saas-form-group" style={{ flex: 1.5, minWidth: '220px', marginBottom: 0 }}>
                <label className="saas-label">Clínica Dental</label>
                <select className="saas-input saas-select" value={remoteClinicId} onChange={(e) => setRemoteClinicId(e.target.value)}>
                  <option value="">Seleccione clínica...</option>
                  {clinics.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div className="saas-form-group" style={{ flex: 1, minWidth: '160px', marginBottom: 0 }}>
                <label className="saas-label">Nivel de Permisos</label>
                <select className="saas-input saas-select" value={remoteRole} onChange={(e) => setRemoteRole(e.target.value)}>
                  <option value="clinic_admin">Clínica Dueño (Admin)</option>
                  <option value="assistant">Clínica Asistente (Staff)</option>
                </select>
              </div>

              <button type="submit" className="saas-btn saas-btn-primary" style={{ height: '42px', padding: '0 20px' }}>
                Generar Llave
              </button>
            </form>

            {generatedToken && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: 'rgba(0, 242, 254, 0.03)',
                borderRadius: '12px',
                border: '1px dashed var(--saas-accent)'
              }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--saas-text-muted)', display: 'block', marginBottom: '6px' }}>
                  Firma digital activa (Válida por 15 minutos en logs de sesión):
                </span>
                <code style={{ fontSize: '0.85rem', color: 'var(--saas-accent)', wordBreak: 'break-all', fontWeight: 'bold' }}>
                  {generatedToken}
                </code>
              </div>
            )}
          </div>

          {/* Incidents / Tickets Card */}
          <div className="saas-panel-card">
            <div className="saas-panel-header" style={{ marginBottom: '16px' }}>
              <div className="saas-panel-title">
                <h3>Incidencias y Reportes de Asistencia</h3>
                <p>Lista de tickets activos generados desde el módulo de soporte de las clínicas</p>
              </div>
            </div>

            <div className="saas-table-container">
              {ticketsQuery.isLoading ? (
                <SkeletonTable rows={4} cols={4} label="Cargando tickets" />
              ) : ticketsQuery.isError ? (
                <ErrorState error={ticketsQuery.error} onRetry={ticketsQuery.refetch} />
              ) : tickets.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--saas-text-muted)' }}>
                  No se registran solicitudes de asistencia.
                </div>
              ) : (
                <table className="saas-table">
                  <thead>
                    <tr>
                      <th className="saas-th">Código</th>
                      <th className="saas-th">Clínica</th>
                      <th className="saas-th">Asunto</th>
                      <th className="saas-th">Prioridad</th>
                      <th className="saas-th">Estado</th>
                      <th className="saas-th" style={{ textAlign: 'right' }}>Operación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map(ticket => (
                      <tr key={ticket.id} className="saas-tr">
                        <td className="saas-td" style={{ fontWeight: 600 }}>{ticket.ticket_code}</td>
                        <td className="saas-td" style={{ fontWeight: 500 }}>
                          {ticket.clinics?.nombre || 'Clínica Inactiva'}
                        </td>
                        <td className="saas-td">{ticket.subject}</td>
                        <td className="saas-td">
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: ticket.priority === 'high' ? 'var(--saas-error)' : 
                                   ticket.priority === 'medium' ? 'var(--saas-warning)' : 'var(--saas-text-muted)'
                          }}>
                            {ticket.priority.toUpperCase()}
                          </span>
                        </td>
                        <td className="saas-td">
                          <span className={`saas-pill ${ticket.status === 'open' ? 'suspended' : 'active'}`}>
                            {ticket.status === 'open' ? 'Abierto' : 'Resuelto'}
                          </span>
                        </td>
                        <td className="saas-td" style={{ textAlign: 'right' }}>
                          {ticket.status === 'open' ? (
                            <button
                              onClick={() => handleResolveTicket(ticket.id, ticket.ticket_code)}
                              className="saas-btn saas-btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                            >
                              Resolver
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.76rem', color: 'var(--saas-success)' }}>✓ Cerrado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* Right Side: Security Audit Feed */}
        <div className="saas-panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="saas-panel-header" style={{ borderBottom: '1px solid var(--saas-border)', paddingBottom: '16px' }}>
            <div className="saas-panel-title">
              <h3>Trazabilidad y Bitácora de Seguridad</h3>
              <p>Historial auditado de modificaciones y accesos de la consola en tiempo real</p>
            </div>
          </div>

          {/* Search bar inside audit */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Buscar por usuario o acción..."
              className="saas-input"
              style={{ fontSize: '0.82rem', padding: '8px 12px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }}>
            {logsQuery.isLoading ? (
              <SkeletonList rows={5} label="Cargando bitácora" />
            ) : logsQuery.isError ? (
              <ErrorState compact error={logsQuery.error} onRetry={logsQuery.refetch} />
            ) : filteredLogs.length === 0 ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--saas-text-muted)', fontSize: '0.82rem' }}>
                No se encontraron registros de trazabilidad.
              </div>
            ) : (
              filteredLogs.map(log => (
                <div key={log.id} style={{
                  padding: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  borderRadius: '10px',
                  border: '1px solid var(--saas-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: log.category === 'Security' ? 'rgba(239, 68, 68, 0.12)' :
                                      log.category === 'Support' ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255,255,255,0.06)',
                      color: log.category === 'Security' ? 'var(--saas-error)' :
                             log.category === 'Support' ? 'var(--saas-accent)' : 'var(--saas-text-muted)'
                    }}>
                      {log.category.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--saas-text-muted)' }}>
                      {new Date(log.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--saas-text-muted)', margin: 0 }}>{log.details}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--saas-text-muted)' }}>
                    <span>{log.user_email}</span>
                    <span>{new Date(log.created_at).toLocaleDateString('es-PE')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
