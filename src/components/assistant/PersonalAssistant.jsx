import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useAsyncAction from '../../hooks/useAsyncAction';
import { invokeFunction } from '../../lib/api';
import { ButtonLabel, ErrorState } from '../ui/Loading';
import AssistantMark from './AssistantMark';
import { BrandIcon } from '../icons/BrandIcons';
import '../../styles/workflows.css';
const when = value => value ? new Date(value).toLocaleString('es-PE',{dateStyle:'medium',timeStyle:'short'}) : '';
export const workflow = (action,payload={}) => invokeFunction('appointment-workflow',{action,payload});
export function WorkflowResult({ data, kind, onConfirmed }) {
  const { profile } = useAuth();
  const action = useAsyncAction((name,payload) => workflow(name,payload));
  const [result,setResult] = useState(null);
  const current = result || data || {};
  const rows = current.results || current.appointments || [];
  const pending = !!current.action_id && !result && ['pending_confirmation','pending_approval','proposed'].includes(current.status);
  const reschedule = kind === 'reschedule' || current.operation === 'reschedule' || current.kind === 'reschedule' || current.action_type === 'reschedule' || Array.isArray(current.changes);
  const confirm = async () => {
    const response = await action.run(reschedule ? 'confirm_reschedule' : 'confirm_cancel',{action_id:current.action_id,confirm:true,...(reschedule && profile?.role === 'clinic_admin' ? {admin_approved:true} : {})});
    if(response.ok) {
      let confirmed=response.data;
      setResult(confirmed);
      if(confirmed?.results?.some(row => row.notification_status === 'pending')) {
        try {
          const dispatch=await invokeFunction('whatsapp-conversations',{action:'dispatch-action',action_id:current.action_id});
          confirmed={...confirmed,results:confirmed.results.map(row => {const notification=dispatch.notifications?.find(n=>n.appointment_id===row.appointment_id);return notification ? {...row,notification_status:notification.status} : row;})};
          setResult(confirmed);
        } catch { /* The durable outbox remains pending; appointment results are unchanged. */ }
      }
      onConfirmed?.(confirmed);
    }
  };
  return <section className="wf-preview" aria-label="Resumen de la operación"><header><strong>{reschedule ? 'Propuesta de reprogramación' : 'Resumen de cancelación'}</strong><span className="cp-pill">{current.status === 'pending_approval' ? 'Pendiente de aprobación' : current.status === 'pending_confirmation' ? 'Requiere confirmación' : current.status === 'executed' ? 'Operación procesada' : current.status || 'Vista previa'}</span></header>
    {reschedule && <p>La cita original se mantiene hasta confirmar el nuevo horario y obtener la aprobación requerida.</p>}
    {current.requires_patient_acceptance && <p>Esperando la aceptación del paciente. Su cita original permanece vigente.</p>}
    {current.requires_admin_approval && <p>Esta operación necesita aprobación del administrador.</p>}
    <ul>{rows.map((row,index) => <li key={row.appointment_id || row.id || index}><strong>{row.paciente_nombre || row.patient_name || `Cita ${index+1}`}</strong><span>{when(row.fecha_hora || row.start_at || row.new_start)}</span>{row.status && <span>Cita: {({cancelled:'cancelada',rescheduled:'reprogramada',failed:'sin cambiar',proposed:'propuesta; cita original sin cambiar',unchanged:'sin cambiar'})[row.status] || row.status}</span>}{row.notification_status && <span>Notificación: {({pending:'pendiente de envío',sent:'enviada',failed:'fallida',unknown:'por confirmar',not_requested:'no solicitada'})[row.notification_status] || row.notification_status}</span>}{row.error && <span className="wf-warning">{row.error}</span>}</li>)}</ul>
    {action.error && <ErrorState compact error={action.error} title="La operación no pudo confirmarse" />}
    {pending && <div className="wf-actions"><button type="button" className="saas-btn saas-btn-primary" disabled={action.pending} onClick={confirm}><ButtonLabel pending={action.pending}>{current.requires_patient_acceptance && <p>Esperando la aceptación del paciente. Su cita original permanece vigente.</p>}
    {current.requires_admin_approval && profile?.role !== 'clinic_admin' ? 'Solicitar aprobación' : reschedule ? 'Confirmar reprogramación' : 'Confirmar cancelación'}</ButtonLabel></button></div>}
    {result && <p className="wf-muted">El estado de cada cita es independiente del envío de su notificación.</p>}
  </section>;
}
export default function PersonalAssistant({ compact=false }) {
  const { profile } = useAuth();
  const { clinicSlug } = useParams();
  const [instruction,setInstruction] = useState('');
  const [messages,setMessages] = useState([]);
  const action = useAsyncAction(text => invokeFunction('nlp-assistant',{action:'parse',instruction:text}));
  const last = useRef(null);
  useEffect(() => {setMessages([]);setInstruction('');},[profile?.id,profile?.clinic_id]);
  useEffect(() => {last.current?.scrollIntoView?.({block:'nearest'});},[messages]);
  const send = async event => {
    event.preventDefault();if(!instruction.trim() || action.pending)return;
    const text=instruction.trim();setInstruction('');setMessages(items => [...items,{sender:'user',text}]);
    const result=await action.run(text);
    if(!result.skipped)setMessages(items => [...items,{sender:'assistant',text:result.ok ? result.data?.message || 'Consulta procesada.' : result.error.message,response:result.ok ? result.data : null,error:!result.ok}]);
  };
  return <section className={`wf-assistant ${compact ? 'is-compact' : ''}`} aria-label="Asistente personal"><header className="wf-assistant-head"><AssistantMark size={40} state={action.pending ? 'thinking' : 'idle'} /><div><span className="odo-kicker">Tu asistente personal</span><h2>Denti</h2><p>{profile?.role === 'clinic_admin' ? 'Gestiona tu clínica con confirmaciones claras.' : 'Tus citas, tus pacientes y tus permisos.'}</p></div></header>
    <div className="wf-assistant-log" role="log" aria-live="polite">{!messages.length && <div className="wf-assistant-welcome"><h3>¿Qué necesitas resolver?</h3><p>Consulta tu agenda o prepara un cambio. Revisarás las citas afectadas antes de confirmar una operación.</p><div className="wf-suggestions">{['Muéstrame mis citas de hoy','Cancela mis citas restantes de hoy y avisa a mis pacientes','Busca horarios para reprogramar mis citas de mañana durante la próxima semana'].map(text => <button type="button" key={text} onClick={() => setInstruction(text)}>{text}</button>)}</div></div>}
      {messages.map((item,index) => <article key={index} className={`wf-assistant-message ${item.sender === 'user' ? 'is-user' : ''} ${item.error ? 'is-error' : ''}`}><strong>{item.sender === 'user' ? 'Tú' : 'Denti'}</strong><p>{item.text}</p>{item.response?.type === 'preview' && <WorkflowResult data={item.response.data} kind={item.response.kind || item.response.data?.kind} />}{item.response?.type === 'appointments' && <ul>{(item.response.data?.appointments || []).map(appointment => <li key={appointment.id}>{appointment.paciente_nombre || 'Paciente asignado'} · {when(appointment.fecha_hora)} · {appointment.estado}</li>)}</ul>}{item.response?.type === 'slots' && <div><p className="wf-muted">Son alternativas disponibles al consultar. No representan reservas.</p><ul>{(item.response.data?.slots || []).slice(0,20).map(slot => <li key={`${slot.doctor_id}:${slot.start}`}>{when(slot.start)} — {when(slot.end)}</li>)}</ul><Link className="saas-btn saas-btn-secondary" to={`/${clinicSlug}/workspace`}>Elegir propuesta en mi espacio</Link></div>}{item.response?.type === 'conversation' && <Link to={`/${clinicSlug}/whatsapp`} className="saas-btn saas-btn-secondary">Abrir mis conversaciones</Link>}</article>)}
      {action.pending && <p role="status">Consultando información autorizada…</p>}<div ref={last} />
    </div><form className="wf-assistant-form" onSubmit={send}><label htmlFor={compact ? 'assistant-compact' : 'assistant-workspace'}>Instrucción para Denti</label><div><textarea id={compact ? 'assistant-compact' : 'assistant-workspace'} value={instruction} onChange={e => setInstruction(e.target.value)} maxLength={4000} rows={2} placeholder="Por ejemplo: muéstrame mis citas de hoy" disabled={action.pending} /><button className="saas-btn saas-btn-primary" type="submit" disabled={action.pending || !instruction.trim()} aria-label="Enviar instrucción"><BrandIcon name="send" size={18} /></button></div></form>
  </section>;
}
