import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Mail, MessageCircle } from '../icons';
import { CONTACT_EMAIL, WHATSAPP_DISPLAY, mailtoLink, whatsappLink } from '../../config/contact';
import '../../styles/auth.css';
import '../../styles/legal.css';

/*
 * Plantilla común de Términos y Privacidad: misma identidad que la landing y el login.
 * El índice desplaza la página sin añadir "#" a la URL.
 */
export default function LegalPage({ kind, title, updated, intro, sections }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${title} | SmartDental`;
  }, [title]);

  // resalta en el índice la sección que se está leyendo
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-20% 0px -70% 0px' }
    );
    sections.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [sections]);

  const go = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 24, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  };

  return (
    <div className="sd-legal">
      <header className="sd-legal__top">
        <Link to="/" className="sd-auth__brand" aria-label="SmartDental, ir al inicio">
          <img src="/landing/logo-mark-256.webp" width="30" height="30" alt="" className="sd-auth__logo" />
          <span>SmartDental</span>
        </Link>
        <nav className="sd-legal__nav" aria-label="Principal">
          <Link to="/">Inicio</Link>
          <Link to="/login" className="sd-legal__cta">Ingresar</Link>
        </nav>
      </header>

      <main className="sd-legal__main">
        <div className="sd-legal__hero">
          <div className="sd-legal__switch" role="navigation" aria-label="Documentos legales">
            <Link to="/terms" aria-current={kind === 'terms' ? 'page' : undefined}>Términos</Link>
            <Link to="/privacy" aria-current={kind === 'privacy' ? 'page' : undefined}>Privacidad</Link>
          </div>
          <h1 className="sd-legal__title">{title}</h1>
          <p className="sd-legal__meta">Última actualización: {updated}</p>
          <p className="sd-legal__intro">{intro}</p>
        </div>

        <div className="sd-legal__layout">
          <nav className="sd-legal__toc" aria-label="Contenido del documento">
            <p className="sd-legal__toc-title">Contenido</p>
            <ol>
              {sections.map((s, i) => (
                <li key={s.id}>
                  <button type="button" className={active === s.id ? 'is-active' : ''} aria-current={active === s.id ? 'true' : undefined} onClick={() => go(s.id)}>
                    <span>{String(i + 1).padStart(2, '0')}</span>{s.title}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <article className="sd-legal__article">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="sd-legal__section" aria-labelledby={`${s.id}-h`}>
                <h2 id={`${s.id}-h`}><span>{String(i + 1).padStart(2, '0')}</span>{s.title}</h2>
                {s.body}
              </section>
            ))}

            <aside className="sd-legal__contact" aria-label="Contacto">
              <div>
                <p className="sd-legal__contact-title">¿Tienes dudas sobre este documento?</p>
                <p className="sd-legal__contact-text">Escríbenos y te respondemos personalmente.</p>
              </div>
              <div className="sd-legal__contact-actions">
                <a href={whatsappLink('Hola, tengo una consulta sobre los documentos legales de SmartDental.')} target="_blank" rel="noopener noreferrer" className="sd-legal__btn">
                  <MessageCircle size={16} aria-hidden="true" />WhatsApp {WHATSAPP_DISPLAY}
                </a>
                <a href={mailtoLink({ subject: `Consulta sobre ${title}` })} className="sd-legal__btn sd-legal__btn--ghost">
                  <Mail size={16} aria-hidden="true" />{CONTACT_EMAIL}
                </a>
              </div>
            </aside>
          </article>
        </div>
      </main>

      <footer className="sd-legal__foot">
        <span>© {new Date().getFullYear()} SmartDental</span>
        <Link to="/terms">Términos y condiciones</Link>
        <Link to="/privacy">Política de privacidad</Link>
        <Link to="/login">Ingresar al panel<ArrowUpRight size={13} aria-hidden="true" /></Link>
      </footer>
    </div>
  );
}
