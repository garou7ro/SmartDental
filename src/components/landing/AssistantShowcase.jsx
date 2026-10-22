import React, { useEffect, useId, useRef, useState } from 'react';
import AssistantMark from '../assistant/AssistantMark';
import { BrandIcon } from '../icons/BrandIcons';

/*
 * Conversaciones de ejemplo del asistente. Reflejan lo que hace el sistema:
 * - En el panel (supabase/functions/nlp-assistant): responde consultas sobre citas, pacientes y
 *   totales; no crea, cancela ni modifica registros.
 * - En WhatsApp (supabase/functions/whatsapp-webhook): plan Básico con menú automático y horario
 *   publicado; plan Pro con respuestas redactadas por IA que no inventan precios ni citas.
 */
const CHATS = {
  panel: {
    title: 'Denti · asistente del panel',
    status: 'Solo consulta',
    lines: [
      ['me', '¿Cuántas citas tengo mañana?'],
      ['ai', 'Mañana tienes 6 citas. La primera es a las 09:00 con Sofía Pérez (ortodoncia).'],
      ['me', '¿Alguna sigue pendiente de confirmar?'],
      ['ai', 'Sí, una: Raúl Medina, a las 10:00, consulta general.'],
    ],
  },
  whatsapp: {
    title: 'WhatsApp del consultorio',
    status: 'Plan Pro · IA',
    lines: [
      ['them', 'Hola, ¿me pueden atender por un dolor de muela?'],
      ['ai', '¡Hola! Lamento la molestia. Un miembro del equipo revisará tu mensaje y te escribirá para coordinar la atención. 🦷'],
      ['them', 'Gracias, quedo atento.'],
    ],
  },
};

const FEATURES = [
  {
    icon: 'search',
    title: 'Pregunta como hablas',
    text: 'Escribe en lenguaje natural y obtén datos de tu agenda, tus pacientes y sus totales al instante.',
  },
  {
    icon: 'shield',
    title: 'Consulta, no decide por ti',
    text: 'El asistente del panel no crea, cancela ni modifica registros. Verifica la información antes de usarla.',
  },
  {
    icon: 'whatsapp',
    title: 'Tus pacientes, atendidos en WhatsApp',
    text: 'Con el plan Básico, un menú automático comparte tu horario. Con el Pro, la IA redacta respuestas cordiales y deriva al equipo.',
  },
];

function Conversation({ chat, playing, reduced, id, labelledBy }) {
  const [shown, setShown] = useState(reduced ? chat.lines.length : 0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (reduced) {
      setShown(chat.lines.length);
      return undefined;
    }
    setShown(0);
    if (!playing) return undefined;
    let cancelled = false;
    const timers = [];
    let at = 350;
    chat.lines.forEach(([who], i) => {
      if (who === 'ai') {
        timers.push(setTimeout(() => !cancelled && setTyping(true), at));
        at += 1100;
      }
      timers.push(setTimeout(() => {
        if (cancelled) return;
        setTyping(false);
        setShown(i + 1);
      }, at));
      at += 650;
    });
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      setTyping(false);
    };
  }, [chat, playing, reduced]);

  return (
    <ol id={id} role="tabpanel" tabIndex={0} aria-labelledby={labelledBy} className="sdl-ai__log" aria-label={`Conversación de ejemplo: ${chat.title}`}>
      {chat.lines.map(([who, text], i) => (
        <li key={i} className={`sdl-ai__msg is-${who} ${i < shown ? 'is-in' : ''}`} aria-hidden={i >= shown}>
          {who === 'ai' && <AssistantMark size={26} />}
          <p>{text}</p>
        </li>
      ))}
      {typing && (
        <li className="sdl-ai__msg is-ai is-in is-typing" aria-hidden="true">
          <AssistantMark size={26} state="thinking" />
          <p><i /><i /><i /></p>
        </li>
      )}
    </ol>
  );
}

export default function AssistantShowcase({ reducedMotion = false }) {
  const [tab, setTab] = useState('panel');
  const [playing, setPlaying] = useState(false);
  const ref = useRef(null);
  const showcaseId = useId();

  const handleTabKeyDown = (event) => {
    const tabs = [...event.currentTarget.querySelectorAll('[role="tab"]')];
    const current = tabs.indexOf(event.target.closest('[role="tab"]'));
    if (current < 0) return;
    let next = current;
    if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    tabs[next]?.focus();
    tabs[next]?.click();
  };

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) {
      setPlaying(true);
      return undefined;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setPlaying(true);
        io.disconnect();
      }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const chat = CHATS[tab];

  return (
    <div className="sdl-ai" ref={ref}>
      <ul className="sdl-ai__features">
        {FEATURES.map(({ icon, title, text }, i) => (
          <li key={title} data-reveal style={{ '--d': `${i * 90}ms` }}>
            <span className="sdl-card__icon"><BrandIcon name={icon} size={20} /></span>
            <div>
              <h3 className="sdl-h3 sdl-h3--xs">{title}</h3>
              <p className="sdl-body">{text}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="sdl-ai__stage" data-reveal>
        <div className="sdl-ai__glow" aria-hidden="true" />
        <div className="sdl-ai__window">
          <div className="sdl-ai__bar">
            <AssistantMark size={42} state="idle" />
            <div>
              <p className="sdl-ai__title">{chat.title}</p>
              <p className="sdl-ai__status"><span className="sdl-hero__dot" aria-hidden="true" />{chat.status}</p>
            </div>
            <div className="sdl-ai__tabs" role="tablist" aria-label="Elegir conversación de ejemplo" onKeyDown={handleTabKeyDown}>
              {[['panel', 'Panel'], ['whatsapp', 'WhatsApp']].map(([id, label]) => (
                <button
                  key={id}
                  id={`${showcaseId}-${id}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  aria-controls={`${showcaseId}-${id}-conversation`}
                  tabIndex={tab === id ? 0 : -1}
                  className={tab === id ? 'is-active' : ''}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Conversation
            key={tab}
            chat={chat}
            playing={playing}
            reduced={reducedMotion}
            id={`${showcaseId}-${tab}-conversation`}
            labelledBy={`${showcaseId}-${tab}-tab`}
          />
          <div className="sdl-ai__composer" aria-hidden="true">
            <span>{tab === 'panel' ? 'Pregúntale a Denti…' : 'Mensaje del paciente…'}</span>
            <i><BrandIcon name="send" size={15} /></i>
          </div>
        </div>
        <span className="sdl-tag">Conversación de ejemplo</span>
      </div>
    </div>
  );
}
