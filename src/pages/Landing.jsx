import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Mail,
  Menu,
  MessageCircle,
  Package,
  UserRoundCog,
  Users,
  Wallet,
  X,
} from '../components/icons';
import { CONTACT_EMAIL, WHATSAPP_DISPLAY, mailtoLink, whatsappLink } from '../config/contact';
import {
  SplitWords,
  prefersReducedMotion,
  useAnchorScroll,
  usePointerEffects,
  useScrollProgressVars,
  useSmoothScroll,
} from '../components/landing/motion';

import BrandIntro, { shouldShowIntro } from '../components/landing/BrandIntro';
import OdontogramShowcase from '../components/landing/OdontogramShowcase';
import ModuleMockup from '../components/landing/ModuleMockups';
import AssistantShowcase from '../components/landing/AssistantShowcase';
import '../styles/Landing.css';

// three.js y el modelo del molar se descargan después del primer pintado.
const HeroScene = lazy(() => import('../components/landing/HeroScene'));

/* ─── Iconos propios ─────────────────────────────────────────────────── */

function WhatsAppIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41" />
    </svg>
  );
}

/* ─── Contenido (basado en funcionalidades verificadas en el panel) ──── */

// Datos reales: 6 módulos, plan Básico S/ 70, plan Pro hasta 8 usuarios, sistema web.
const HERO_FACTS = [
  { value: '6', label: 'módulos' },
  { value: 'S/ 70', label: 'desde, al mes' },
  { value: '8', label: 'usuarios en Pro' },
  { value: '100%', label: 'web' },
];

const SITUATIONS = [
  {
    icon: CalendarDays,
    pain: 'Las citas están repartidas entre un cuaderno, el celular y el chat.',
    help: 'Registra cada cita con su paciente, profesional, motivo y notas, y revísalas en calendario o en lista.',
  },
  {
    icon: Users,
    pain: 'La información de cada paciente está en lugares distintos.',
    help: 'Su ficha reúne los datos del paciente y su odontograma, para que tengas el contexto antes de atender.',
  },
  {
    icon: Package,
    pain: 'Te enteras de que un insumo se acabó justo cuando lo necesitas.',
    help: 'Define un stock mínimo para cada insumo y el inventario te señala los que quedaron por debajo.',
  },
];

const MODULES = [
  {
    tag: 'Agenda',
    icon: CalendarDays,
    title: 'Tu día, claro de un vistazo.',
    text: 'Crea citas con paciente, profesional, fecha, hora y motivo. Añade notas y cambia entre la vista de calendario y la de lista.',
    facts: [['2 vistas', 'calendario y lista'], ['Notas', 'en cada cita']],
    ui: 'agenda',
  },
  {
    tag: 'Inventario',
    icon: Package,
    title: 'Sabe qué se está acabando antes de que falte.',
    text: 'Registra tus insumos con su cantidad y un stock mínimo propio, anota cada salida y revisa cuáles quedaron por debajo del mínimo.',
    facts: [['Mínimo', 'propio por insumo'], ['Aviso', 'de stock bajo']],
    ui: 'inventario',
  },
  {
    tag: 'Caja',
    icon: Wallet,
    title: 'Lleva el registro de lo que ingresa.',
    text: 'Anota cada ingreso con su concepto y vincúlalo al paciente cuando corresponda. Consulta el total y el detalle de movimientos.',
    facts: [['Ingresos', 'por concepto'], ['Total', 'y detalle']],
    ui: 'caja',
  },
  {
    tag: 'Equipo y permisos',
    icon: UserRoundCog,
    title: 'Los accesos de tu equipo, organizados.',
    text: 'Administra los accesos de las personas de tu consultorio y consulta el personal registrado desde un mismo lugar.',
    facts: [['3 / 8', 'usuarios según plan'], ['2 roles', 'titular y asistente']],
    ui: 'equipo',
  },
];

const STEPS = [
  { title: 'Escríbenos', text: 'Por WhatsApp o correo, cuéntanos cómo trabaja tu consultorio y cuántas personas usarían el sistema.' },
  { title: 'Resolvemos tus dudas', text: 'Te explicamos cómo funciona SmartDental y te ayudamos a elegir el plan que se ajusta a tu consultorio.' },
  { title: 'Activamos tu cuenta', text: 'Coordinamos contigo la activación y los accesos de tu equipo. Nada se contrata de forma automática.' },
];

const TRUST = [
  { icon: CalendarDays, title: 'Conoce el panel', text: 'Consulta cómo se organizan la agenda, los pacientes y los insumos antes de decidir.' },
  { icon: UserRoundCog, title: 'Pensado para tu equipo', text: 'Cuéntanos cuántas personas trabajan contigo y qué necesita cada una para su día a día.' },
  { icon: MessageCircle, title: 'Una conversación directa', text: 'Las consultas y la activación se coordinan por WhatsApp o correo, sin formularios de pago.' },
];

const PLANS = [
  {
    id: 'basico',
    name: 'Básico',
    price: '70',
    audience: 'Para el odontólogo independiente y consultorios en crecimiento.',
    items: [
      'Hasta 3 usuarios del equipo',
      'Agenda, pacientes y odontograma 2D y 3D',
      'Inventario, caja chica y permisos por rol',
      'Asistente de consulta en el panel y menú automático en WhatsApp',
    ],
    message: 'Hola, me interesa el plan Básico de SmartDental (S/ 70 al mes) para mi consultorio. ¿Podrían darme más información?',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '100',
    audience: 'Para consultorios con más equipo que quieren atender WhatsApp con IA.',
    items: [
      'Hasta 8 usuarios del equipo',
      'Agenda, pacientes, odontograma, inventario y caja',
      'Respuestas con IA a tus pacientes en WhatsApp',
    ],
    message: 'Hola, me interesa el plan Pro de SmartDental (S/ 100 al mes) para mi consultorio. ¿Podrían darme más información?',
    featured: true,
  },
];

const FAQS = [
  { q: '¿Qué es SmartDental?', a: 'Es un sistema web para gestionar un consultorio odontológico: agenda de citas, fichas de pacientes con odontograma, inventario de insumos, registro de caja y usuarios para tu equipo.' },
  { q: '¿Para quién está pensado?', a: 'Para odontólogos independientes y consultorios que quieren tener su información ordenada en un solo lugar. El plan Básico admite hasta 3 usuarios del equipo y el Pro, hasta 8.' },
  { q: '¿Qué hace el asistente con IA?', a: 'En el panel responde preguntas sobre tus citas, pacientes y totales, sin crear, cancelar ni modificar registros. En WhatsApp, el plan Básico responde con un menú automático y tu horario publicado; el Pro redacta respuestas cordiales con IA y deriva al equipo lo que requiere atención.' },
  { q: '¿Necesito instalar algo?', a: 'No. SmartDental funciona desde el navegador. Solo necesitas conexión a internet y el usuario que te asignamos al activar tu cuenta.' },
  { q: '¿Cuánto cuesta?', a: 'El plan Básico cuesta S/ 70 al mes y el plan Pro, S/ 100 al mes. Escríbenos para confirmar las condiciones vigentes y coordinar la activación.' },
  { q: '¿Cómo se contrata?', a: 'Por ahora no hay compra en línea. Nos escribes por WhatsApp o correo, resolvemos tus dudas y coordinamos contigo la activación de tu cuenta.' },
  { q: '¿Qué ocurre después de contactar?', a: 'Revisamos contigo qué necesitas, te explicamos los módulos y confirmamos las condiciones antes de coordinar el acceso.' },
  { q: '¿Puedo ver el sistema antes de decidir?', a: 'Escríbenos por WhatsApp o correo y te contamos qué opciones hay para conocer el panel antes de decidir.' },
];

const NAV = [
  { id: 'odontograma', label: 'Odontograma' },
  { id: 'plataforma', label: 'Plataforma' },
  { id: 'asistente', label: 'Asistente IA' },
  { id: 'como-funciona', label: 'Cómo funciona' },
  { id: 'seguridad', label: 'Conócenos' },
  { id: 'planes', label: 'Planes' },
  { id: 'preguntas', label: 'Preguntas' },
];

/* ─── Hooks ──────────────────────────────────────────────────────────── */

// Añade .is-visible a los elementos [data-reveal] cuando entran en pantalla.
function useReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const items = root.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}

/* ─── Piezas ─────────────────────────────────────────────────────────── */

function SectionIntro({ tag, title, text }) {
  return (
    <div className="sdl-intro" data-reveal>
      <div>
        <p className="sdl-pill">{tag}</p>
        <h2 className="sdl-h2"><SplitWords text={title} /></h2>
      </div>
      {text && <p className="sdl-intro__text">{text}</p>}
    </div>
  );
}

/* ─── Página ─────────────────────────────────────────────────────────── */

export default function Landing() {
  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const finalRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [load3d, setLoad3d] = useState(false);
  const [hero3dReady, setHero3dReady] = useState(false);
  const [reduced] = useState(prefersReducedMotion);
  const [intro, setIntro] = useState(shouldShowIntro);
  const endIntro = useCallback(() => setIntro(false), []);

  useReveal(rootRef);
  useAnchorScroll(rootRef);
  usePointerEffects(rootRef);
  useScrollProgressVars(rootRef);
  useSmoothScroll();

  const onHeroReady = useCallback(() => setHero3dReady(true), []);

  useEffect(() => {
    document.title = 'SmartDental | Software de gestión para consultorios odontológicos';
  }, []);

  // El 3D del hero se monta cuando el navegador queda libre tras el primer pintado.
  useEffect(() => {
    if (navigator.connection?.saveData) return undefined;
    // Con intro, el trabajo pesado (descarga, WebGL, entorno) se hace mientras la cortina cubre la página.
    if (intro) {
      setLoad3d(true);
      return undefined;
    }
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 300));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => setLoad3d(true), { timeout: 1200 });
    return () => cancel(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Barra de contacto móvil: visible después del hero y oculta cuando aparece el CTA final.
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const state = { hero: true, final: false };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.target === heroRef.current) state.hero = e.isIntersecting;
        if (e.target === finalRef.current) state.final = e.isIntersecting;
      });
      setShowStickyCta(!state.hero && !state.final);
    });
    if (heroRef.current) io.observe(heroRef.current);
    if (finalRef.current) io.observe(finalRef.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const waMain = whatsappLink();
  const mailMain = mailtoLink();

  return (
    <div className={`sdl ${intro ? 'is-intro' : ''}`} ref={rootRef}>
      {intro && <BrandIntro onDone={endIntro} />}
      <a className="sdl-skip" href="#contenido">Saltar al contenido</a>

      {/* ═══ Navegación flotante ═══ */}
      <header className={`sdl-header ${scrolled ? 'is-scrolled' : ''} ${menuOpen ? 'is-open' : ''}`}>
        <div className="sdl-header__pill">
          <a href="#inicio" className="sdl-brand" aria-label="SmartDental, ir al inicio">
            <img src="/landing/logo-mark-256.webp" width="30" height="30" alt="" />
            <span>SmartDental</span>
          </a>

          <nav className="sdl-nav" aria-label="Secciones">
            {NAV.map((item) => (
              <a key={item.id} href={`#${item.id}`}>{item.label}</a>
            ))}
          </nav>

          <div className="sdl-header__actions">
            <Link to="/login" className="sdl-link-quiet">Ingresar</Link>
            <a href={waMain} target="_blank" rel="noopener noreferrer" className="sdl-btn sdl-btn--outline sdl-btn--sm" data-cta="whatsapp-header">
              Escríbenos
            </a>
          </div>

          <button
            type="button"
            className="sdl-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="sdl-mobile-menu"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div id="sdl-mobile-menu" className="sdl-mobile-menu" hidden={!menuOpen}>
          <nav aria-label="Secciones">
            {NAV.map((item) => (
              <a key={item.id} href={`#${item.id}`} onClick={() => setMenuOpen(false)}>{item.label}</a>
            ))}
            <Link to="/login" onClick={() => setMenuOpen(false)}>Ingresar al panel</Link>
          </nav>
          <a href={waMain} target="_blank" rel="noopener noreferrer" className="sdl-btn sdl-btn--primary" data-cta="whatsapp-menu">
            <WhatsAppIcon size={18} />
            Conversar por WhatsApp
          </a>
        </div>
      </header>

      <main id="contenido">
        {/* ═══ Hero de vidrio a sangre completa ═══ */}
        <section id="inicio" className={`sdl-hero ${hero3dReady ? 'is-ready' : ''}`} ref={heroRef}>
          <div className="sdl-hero__stage" aria-hidden="true">
            <div className="sdl-hero__poster" />
            {load3d && (
              <Suspense fallback={null}>
                <HeroScene onReady={onHeroReady} reducedMotion={reduced} hold={intro} />
              </Suspense>
            )}
          </div>

          <div className="sdl-container sdl-hero__content">
            <div className="sdl-hero__main">
              <p className="sdl-pill sdl-pill--glass">
                <span className="sdl-hero__dot" aria-hidden="true" />
                Software para consultorios odontológicos
              </p>
              <h1 className="sdl-hero__title">
                <span className="sdl-line"><span>Tu consultorio</span></span>{' '}
                <span className="sdl-line"><span>dental, en orden.</span></span>
              </h1>
              <p className="sdl-hero__lead">
                Agenda, fichas de pacientes, odontograma, inventario y caja en un panel pensado para odontólogos
                independientes y consultorios pequeños.
              </p>
              <div className="sdl-hero__ctas">
                <a href={waMain} target="_blank" rel="noopener noreferrer" className="sdl-btn sdl-btn--primary sdl-btn--lg" data-cta="whatsapp-hero" data-magnetic>
                  <WhatsAppIcon />
                  Conversar por WhatsApp
                </a>
                <a href="#plataforma" className="sdl-btn sdl-btn--glass sdl-btn--lg" data-cta="explorar-hero">
                  Ver la plataforma
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
              </div>
              <p className="sdl-hero__note">
                Se abre WhatsApp con un mensaje listo. ¿Prefieres correo?{' '}
                <a href={mailMain} data-cta="email-hero">{CONTACT_EMAIL}</a>
              </p>
            </div>

            <dl className="sdl-facts">
              {HERO_FACTS.map((f) => (
                <div key={f.label}>
                  <dt>{f.value}</dt>
                  <dd>{f.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ═══ Para quién ═══ */}
        <section id="para-quien" className="sdl-section">
          <div className="sdl-container">
            <SectionIntro
              tag="Para quién es"
              title="Para quien atiende y, además, administra."
              text="Si trabajas por tu cuenta o con un equipo pequeño, quizá reconozcas alguna de estas situaciones."
            />
            <ul className="sdl-cards3">
              {SITUATIONS.map(({ icon: Icon, pain, help }, i) => (
                <li key={pain} className="sdl-card" data-reveal style={{ '--d': `${i * 80}ms` }}>
                  <span className="sdl-card__icon"><Icon size={18} aria-hidden="true" /></span>
                  <p className="sdl-card__pain">{pain}</p>
                  <p className="sdl-card__help">
                    <span className="sdl-mono">Con SmartDental</span>
                    {help}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ═══ Odontograma 3D ═══ */}
        <section id="odontograma" className="sdl-section sdl-section--odo">
          <div className="sdl-container">
            <SectionIntro
              tag="Odontograma"
              title="Cada pieza, en su sitio."
              text="Numeración FDI y estado por pieza dentro de la ficha del paciente. Gira el modelo y selecciona cualquier diente."
            />
            <OdontogramShowcase reducedMotion={reduced} defer={intro} />
          </div>
        </section>

        {/* ═══ Plataforma: tarjetas apiladas ═══ */}
        <section id="plataforma" className="sdl-section">
          <div className="sdl-container">
            <SectionIntro
              tag="Plataforma"
              title="Todo tu consultorio, en un solo panel."
              text="Agenda, inventario, caja y equipo trabajan junto a la ficha del paciente. Cada módulo resuelve una parte concreta del día."
            />
            <ol className="sdl-stack">
              {MODULES.map(({ tag, icon: Icon, title, text, facts, ui }, i) => (
                <li key={tag} className="sdl-module" style={{ '--i': i }}>
                  <div className="sdl-module__copy">
                    <p className="sdl-pill"><Icon size={14} aria-hidden="true" />{tag}</p>
                    <h3 className="sdl-h3">{title}</h3>
                    <p className="sdl-body">{text}</p>
                    <dl className="sdl-module__facts">
                      {facts.map(([v, l]) => (
                        <div key={v}>
                          <dt>{v}</dt>
                          <dd>{l}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div className="sdl-module__visual" data-reveal>
                    <ModuleMockup kind={ui} />
                    <span className="sdl-tag">Vista de ejemplo</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ═══ Asistente con IA ═══ */}
        <section id="asistente" className="sdl-section sdl-section--ai">
          <div className="sdl-container">
            <SectionIntro
              tag="Asistente con IA"
              title="Pregunta. Tu consultorio responde."
              text="Un asistente que entiende lo que escribes y consulta tu información, sin tocar tus registros. Y en WhatsApp, atiende a tus pacientes mientras tú atiendes en el sillón."
            />
            <AssistantShowcase reducedMotion={reduced} />
          </div>
        </section>

        {/* ═══ Cómo funciona ═══ */}
        <section id="como-funciona" className="sdl-section">
          <div className="sdl-container">
            <SectionIntro
              tag="Cómo funciona"
              title="Empezar es una conversación."
              text="No hay formularios de compra ni activaciones automáticas: todo se conversa con el equipo de SmartDental."
            />
            <ol className="sdl-steps" data-progress>
              {STEPS.map((s, i) => (
                <li key={s.title} className="sdl-card sdl-step" data-reveal style={{ '--d': `${i * 90}ms` }}>
                  <span className="sdl-step__num">0{i + 1}</span>
                  <h3 className="sdl-h3 sdl-h3--sm">{s.title}</h3>
                  <p className="sdl-body">{s.text}</p>
                </li>
              ))}
            </ol>
            <div className="sdl-steps__cta" data-reveal>
              <a href={waMain} target="_blank" rel="noopener noreferrer" className="sdl-btn sdl-btn--primary" data-cta="whatsapp-empezar">
                <WhatsAppIcon size={18} />
                Escribir ahora
              </a>
            </div>
          </div>
        </section>

        {/* ═══ Seguridad y permisos ═══ */}
        <section id="seguridad" className="sdl-section">
          <div className="sdl-container sdl-security">
            <div>
              <SectionIntro tag="Hablemos de tu consultorio" title="Conoce la propuesta antes de decidir." />
              <ul className="sdl-trust" data-reveal>
                {TRUST.map(({ icon: Icon, title, text }) => (
                  <li key={title}>
                    <Icon size={18} aria-hidden="true" />
                    <div>
                      <h3 className="sdl-h3 sdl-h3--xs">{title}</h3>
                      <p className="sdl-body">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="sdl-panel" data-reveal>
              <div className="sdl-panel__head">
                <span className="sdl-mono">Roles del panel</span>
                <span className="sdl-tag">Vista de ejemplo</span>
              </div>
              <table className="sdl-roles">
                <thead><tr><th>Módulo</th><th>Titular</th><th>Asistente</th></tr></thead>
                <tbody>
                  {[
                    ['Agenda', 'Completa', 'Citas asignadas'],
                    ['Pacientes y odontograma', 'Completo', 'Pacientes asignados'],
                    ['Inventario', 'Compras y salidas', 'Consulta y salidas'],
                    ['Caja y finanzas', 'Completa', null],
                    ['Equipo y configuración', 'Completa', null],
                  ].map(([module, owner, assistant]) => (
                    <tr key={module}>
                      <th scope="row">{module}</th>
                      <td><span className="sdl-chip is-on"><Check size={14} aria-hidden="true" />{owner}</span></td>
                      <td>{assistant ? <span className="sdl-chip is-partial"><Check size={14} aria-hidden="true" />{assistant}</span> : <span className="sdl-chip is-off">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ═══ Planes ═══ */}
        <section id="planes" className="sdl-section">
          <div className="sdl-container">
            <SectionIntro
              tag="Planes"
              title="Dos planes, el mismo panel."
              text="Precios mensuales en soles. La contratación se coordina por WhatsApp o correo: esta página no procesa pagos."
            />
            <div className="sdl-plans">
              {PLANS.map((plan) => (
                <article key={plan.id} className={`sdl-plan ${plan.featured ? 'is-featured' : ''}`} data-reveal data-tilt>
                  <header>
                    <p className="sdl-mono">{plan.featured ? 'Más completo' : 'Para empezar'}</p>
                    <h3 className="sdl-plan__name">Plan {plan.name}</h3>
                    <p className="sdl-plan__audience">{plan.audience}</p>
                  </header>
                  <p className="sdl-plan__price">
                    <span className="sdl-plan__currency">S/</span>
                    <span className="sdl-plan__amount">{plan.price}</span>
                    <span className="sdl-plan__period">al mes</span>
                  </p>
                  <ul className="sdl-checks">
                    {plan.items.map((item) => (
                      <li key={item}><Check size={15} aria-hidden="true" />{item}</li>
                    ))}
                  </ul>
                  <a
                    href={whatsappLink(plan.message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`sdl-btn ${plan.featured ? 'sdl-btn--primary' : 'sdl-btn--outline'}`}
                    data-cta={`whatsapp-plan-${plan.id}`}
                  >
                    <WhatsAppIcon size={18} />
                    Consultar el plan {plan.name}
                  </a>
                </article>
              ))}
            </div>
            <p className="sdl-plans__foot" data-reveal>
              El asistente de WhatsApp para pacientes está en desarrollo y todavía no forma parte de los planes.
            </p>
          </div>
        </section>

        {/* ═══ Preguntas frecuentes ═══ */}
        <section id="preguntas" className="sdl-section">
          <div className="sdl-container sdl-faq">
            <div className="sdl-faq__head" data-reveal>
              <p className="sdl-pill">Preguntas frecuentes</p>
              <h2 className="sdl-h2"><SplitWords text="Lo que suelen preguntarnos." /></h2>
              <p className="sdl-intro__text">
                ¿No encuentras tu respuesta?{' '}
                <a href={waMain} target="_blank" rel="noopener noreferrer" data-cta="whatsapp-faq">Pregúntanos por WhatsApp</a>.
              </p>
            </div>
            <div className="sdl-faq__list" data-reveal>
              {FAQS.map((f) => (
                <details key={f.q} className="sdl-faq__item">
                  <summary>
                    {f.q}
                    <ChevronDown size={18} aria-hidden="true" />
                  </summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CTA final ═══ */}
        <section className="sdl-final" ref={finalRef}>
          <div className="sdl-container">
            <div className="sdl-final__card" data-reveal data-spotlight>
              <p className="sdl-pill sdl-pill--glass">Hablemos</p>
              <h2 className="sdl-final__title"><SplitWords text="¿Conversamos sobre tu consultorio?" /></h2>
              <p className="sdl-final__text">
                Cuéntanos cómo trabajas hoy y te explicamos cómo SmartDental puede ayudarte a organizarlo.
              </p>
              <div className="sdl-final__ctas">
                <a href={waMain} target="_blank" rel="noopener noreferrer" className="sdl-btn sdl-btn--primary sdl-btn--lg" data-cta="whatsapp-final" data-magnetic>
                  <WhatsAppIcon />
                  Conversar por WhatsApp
                </a>
                <a href={mailMain} className="sdl-btn sdl-btn--glass sdl-btn--lg" data-cta="email-final">
                  <Mail size={18} aria-hidden="true" />
                  Escribir un correo
                </a>
              </div>
              <p className="sdl-final__contact sdl-mono">WhatsApp {WHATSAPP_DISPLAY} · {CONTACT_EMAIL}</p>
            </div>
          </div>
        </section>
      </main>

      {/* ═══ Pie de página ═══ */}
      <footer className="sdl-footer">
        <div className="sdl-container sdl-footer__grid">
          <div className="sdl-footer__brand">
            <a href="#inicio" className="sdl-brand" aria-label="SmartDental, ir al inicio">
              <img src="/landing/logo-mark-256.webp" width="30" height="30" alt="" loading="lazy" />
              <span>SmartDental</span>
            </a>
            <p>Sistema de gestión para consultorios odontológicos.</p>
          </div>
          <nav aria-label="Pie de página">
            <h2 className="sdl-footer__title">Explorar</h2>
            {NAV.map((item) => (
              <a key={item.id} href={`#${item.id}`}>{item.label}</a>
            ))}
          </nav>
          <div>
            <h2 className="sdl-footer__title">Contacto</h2>
            <a href={waMain} target="_blank" rel="noopener noreferrer" data-cta="whatsapp-footer">WhatsApp {WHATSAPP_DISPLAY}<ArrowUpRight size={14} aria-hidden="true" /></a>
            <a href={mailMain} data-cta="email-footer">{CONTACT_EMAIL}</a>
          </div>
          <div>
            <h2 className="sdl-footer__title">SmartDental</h2>
            <Link to="/login">Ingresar al panel</Link>
            <Link to="/terms">Términos y condiciones</Link>
            <Link to="/privacy">Política de privacidad</Link>
          </div>
        </div>
        <div className="sdl-wordmark" data-progress data-progress-start="1" data-progress-end="1" data-text="SmartDental" aria-hidden="true">SmartDental</div>
        <div className="sdl-container sdl-footer__bottom">
          <p>© {new Date().getFullYear()} SmartDental</p>
        </div>
      </footer>

      {/* Barra de contacto móvil */}
      <div className={`sdl-sticky-cta ${showStickyCta ? 'is-visible' : ''}`} aria-hidden={!showStickyCta}>
        <a href={waMain} target="_blank" rel="noopener noreferrer" className="sdl-btn sdl-btn--primary" tabIndex={showStickyCta ? 0 : -1} data-cta="whatsapp-sticky">
          <WhatsAppIcon size={18} />
          Conversar por WhatsApp
        </a>
      </div>
    </div>
  );
}
