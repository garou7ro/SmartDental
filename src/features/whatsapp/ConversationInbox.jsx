import React, { useEffect, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import useSupabaseQuery from '../../hooks/useSupabaseQuery';
import useAsyncAction from '../../hooks/useAsyncAction';
import { invokeFunction } from '../../lib/api';
import { ErrorState, EmptyState, Skeleton, ButtonLabel } from '../../components/ui/Loading';
import { BrandIcon } from '../../components/icons/BrandIcons';

export const MESSAGE_STATUS = { pending: 'Pendiente de envío', sending: 'Enviando', sent: 'Enviado a WhatsApp', delivered: 'Entregado', read: 'Leído', failed: 'No enviado', unknown: 'Envío por confirmar', received: 'Recibido' };
export const AUTHOR_KIND = { patient: 'Paciente', bot: 'Bot de la clínica', clinic_admin: 'Administrador', worker: 'Trabajador', doctor: 'Profesional', clinic: 'Equipo de la clínica' };
const request = (action, values = {}, signal) => invokeFunction('whatsapp-conversations', { action, ...values }, { signal });
const when = (value) => value ? new Date(value).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '';

export default function ConversationInbox() {
  const { profile } = useAuth();
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [assignment, setAssignment] = useState({ patient_id: '', doctor_id: '' });
  const sendKey = useRef(null);
  const userKey = `${profile?.clinic_id}:${profile?.id}`;
  const list = useSupabaseQuery((signal) => request('list', {}, signal), { key: userKey, enabled: !!profile?.clinic_id });
  const detail = useSupabaseQuery((signal) => request('messages', { conversation_id: selected }, signal), { key: `${userKey}:${selected}`, enabled: !!selected });
  const action = useAsyncAction((name, values) => request(name, values));
  const conversations = list.data?.conversations || [];
  const conversation = detail.data?.conversation;
  const messages = detail.data?.messages || [];
  const isAdmin = profile?.role === 'clinic_admin';
  const scope = useSupabaseQuery((signal) => invokeFunction('whatsapp-settings', { action: 'permissions-get' }, { signal }), { key: userKey, enabled: isAdmin });

  useEffect(() => { setSelected(null); setDraft(''); sendKey.current = null; }, [userKey]);
  useEffect(() => { setDraft(''); setNotice(''); sendKey.current = null; }, [selected]);
  // Poll through the scoped endpoint. No clinic-wide realtime payload is retained.
  useEffect(() => {
    const timer = setInterval(() => { list.refetch(); if (selected) detail.refetch(); }, 15000);
    return () => clearInterval(timer);
  }, [selected, userKey, list.refetch, detail.refetch]);
  const perform = async (name, values = {}) => {
    setNotice('');
    const result = await action.run(name, { conversation_id: selected, ...values });
    if (result.ok) { await detail.refetch(); await list.refetch(); if(name === 'assign' && result.data?.conversation?.id) setSelected(result.data.conversation.id); }
    return result;
  };
  const send = async (event) => {
    event.preventDefault();
    if (!draft.trim() || action.pending) return;
    sendKey.current ||= crypto.randomUUID();
    const result = await perform('send', { message_text: draft.trim(), idempotency_key: sendKey.current });
    if (result.ok) {
      const status = result.data?.message?.status || result.data?.status || 'pending';
      setNotice(MESSAGE_STATUS[status] || 'Solicitud registrada. Consulta el estado del mensaje.');
      setDraft(''); sendKey.current = null;
    }
  };
  return <div className={`wa-inbox ${selected ? 'has-selection' : ''}`}>
    <aside className="wa-threads" aria-label="Conversaciones autorizadas">
      <div className="wf-toolbar"><h3>Conversaciones</h3><button className="saas-btn saas-btn-secondary" onClick={() => list.refetch()} disabled={list.isRefreshing}>Actualizar</button></div>
      <label className="wf-search"><span>Buscar paciente</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre o teléfono" /></label>
      {list.isLoading ? <Skeleton h={220} /> : list.isError ? <ErrorState compact error={list.error} onRetry={list.refetch} /> : !conversations.length ? <EmptyState title="Sin conversaciones asignadas" description="Aquí aparecerán únicamente las conversaciones que puedes atender." /> :
        <div className="wa-thread-list">{conversations.filter(c => `${c.patient_name || ''} ${c.patient_phone || ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(c => <button key={c.id} type="button" className={`wa-thread ${selected === c.id ? 'is-active' : ''}`} onClick={() => setSelected(c.id)} aria-pressed={selected === c.id}>
          <span className="cp-avatar" aria-hidden="true">{(c.patient_name || 'P').slice(0, 1)}</span><span className="wa-thread__main"><strong>{c.patient_name || c.patient_phone || 'Paciente'}</strong><small>{c.mode === 'human' ? 'Atención humana · bot en pausa' : 'Automatización disponible'}</small></span>
        </button>)}</div>}
    </aside>
    <section className="wa-conv" aria-label="Mensajes de la conversación">
      {!selected ? <EmptyState title="Elige una conversación" description="Cada conversación tiene un ámbito de atención. Compartir un paciente no comparte automáticamente su historial." /> : detail.isLoading ? <Skeleton h={320} /> : detail.isError ? <ErrorState error={detail.error} onRetry={detail.refetch} title="No se puede abrir esta conversación" /> : <>
        <header className="wa-conv__head"><button type="button" className="saas-btn saas-btn-secondary wf-back" onClick={() => setSelected(null)}>Volver</button><div><strong>{conversation?.patient_name || conversation?.patient_phone || 'Conversación'}</strong><small>{conversation?.mode === 'human' ? 'Atención humana · respuestas automáticas detenidas' : 'Bot disponible según las reglas de la clínica'}</small></div>
          <button className="saas-btn saas-btn-secondary" disabled={action.pending} onClick={() => perform(conversation?.mode === 'human' ? 'resume' : 'takeover')}><ButtonLabel pending={action.pending}>{conversation?.mode === 'human' ? 'Reanudar bot' : 'Atender personalmente'}</ButtonLabel></button>
        </header>
        <div className="wa-conv__log" role="log" aria-live="polite" aria-label="Historial autorizado">
          {!messages.length && <p className="wf-muted">Aún no hay mensajes en este ámbito de atención.</p>}
          {messages.map(message => <article key={message.id} className={`wf-message ${message.author_kind === 'patient' || message.sender === 'patient' ? 'is-in' : 'is-out'}`}>
            <header><strong>{AUTHOR_KIND[message.author_kind] || AUTHOR_KIND[message.sender] || 'Equipo'}</strong>{message.author_name && <span> · {message.author_name}</span>}</header>
            <p>{message.message_text}</p><footer><time dateTime={message.created_at}>{when(message.created_at)}</time><span>{MESSAGE_STATUS[message.status] || 'Estado no disponible'}</span></footer>
            {message.error_code && <small role="status">{message.error_message || 'El envío no se completó. Revisa la conexión o la ventana de atención de WhatsApp.'}</small>}
            {message.status === 'failed' && <button className="saas-btn saas-btn-secondary" disabled={action.pending} onClick={() => perform('retry', { message_id: message.id })}>Reintentar envío</button>}
            {message.status === 'unknown' && <small>No reenvíes este mensaje hasta confirmar su estado para evitar duplicados.</small>}
          </article>)}
        </div>
        {action.error && <ErrorState compact error={action.error} title="No se pudo confirmar la operación" />}
        {notice && <p className="wf-notice" role="status">{notice}</p>}
        <form className="wa-composer" onSubmit={send}><label className="wf-sr-only" htmlFor="wa-message-draft">Mensaje al paciente</label><textarea id="wa-message-draft" value={draft} onChange={e => { setDraft(e.target.value); sendKey.current = null; }} maxLength={4000} placeholder={conversation?.mode === 'human' ? 'Escribe tu respuesta…' : 'Activa la atención humana para responder'} disabled={action.pending || conversation?.mode !== 'human'} rows={2} /><button type="submit" aria-label="Enviar mensaje por WhatsApp" disabled={action.pending || !draft.trim() || conversation?.mode !== 'human'}><BrandIcon name="send" size={18} /></button></form>
        <p className="wa-composer__hint">El envío usa el número de la clínica e identifica a quien responde. Solo una confirmación de WhatsApp cambia el estado a enviado.</p>
        {isAdmin && <details className="wf-assignment"><summary>Ámbito y profesional responsable</summary><form className="cp-form" onSubmit={async e => { e.preventDefault(); await perform('assign', assignment); }}><label className="cp-field"><span>Paciente</span><select value={assignment.patient_id} onChange={e => setAssignment(s => ({ ...s, patient_id: e.target.value }))} required><option value="">Seleccionar paciente</option>{(scope.data?.patients || []).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label><label className="cp-field"><span>Profesional</span><select value={assignment.doctor_id} onChange={e => setAssignment(s => ({ ...s, doctor_id: e.target.value }))} required><option value="">Seleccionar profesional</option>{(scope.data?.doctors || []).map(p => <option key={p.id} value={p.id}>{p.nombre_completo || p.email}</option>)}</select></label><p className="wf-muted">Se abrirá una conversación del odontólogo. El historial general no se comparte; permanece en administración.</p><button className="saas-btn saas-btn-secondary" disabled={action.pending}>Abrir conversación del odontólogo</button></form></details>}
      </>}
    </section>
  </div>;
}
