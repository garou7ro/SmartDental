import React, { useState } from 'react';
import useAuth from '../hooks/useAuth';
import ConversationInbox from '../features/whatsapp/ConversationInbox';
import { WhatsAppConnection, BotSettings, AccessSettings } from '../features/whatsapp/WhatsAppSettings';
import { BrandIcon } from '../components/icons/BrandIcons';
import '../styles/clinic-pages.css';
import '../styles/whatsapp.css';
import '../styles/workflows.css';
export default function ClinicWhatsApp() {
  const { profile } = useAuth();
  const [tab,setTab] = useState('conversations');
  const admin = profile?.role === 'clinic_admin';
  const tabs = [['conversations','Conversaciones'],...(admin ? [['connection','Conexión'],['bot','Reglas del bot'],['access','Asignaciones']] : [])];
  const active = tabs.some(([key]) => key === tab) ? tab : 'conversations';
  return <div className="clinic-page-container cp-page"><header className="cp-page-head wa-head"><span className="wa-head__logo" aria-hidden="true"><BrandIcon name="whatsapp" size={28} /></span><div><span className="odo-kicker">Atención conectada</span><h2>{admin ? 'WhatsApp de tu clínica' : 'Mis conversaciones'}</h2><p>{admin ? 'Una cuenta para tu clínica, con atención humana y automatización supervisada.' : 'Atiende a tus pacientes desde la cuenta de la clínica, con tu identidad profesional.'}</p></div></header><nav className="wf-tabs" aria-label="Secciones de WhatsApp">{tabs.map(([key,label]) => <button key={key} type="button" aria-current={active === key ? 'page' : undefined} className={active === key ? 'is-active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav><div key={`${profile?.id}:${active}`}>{active === 'connection' ? <WhatsAppConnection /> : active === 'bot' ? <BotSettings /> : active === 'access' ? <AccessSettings /> : <ConversationInbox />}</div></div>;
}
