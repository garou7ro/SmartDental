import PersonalAssistant from '../assistant/PersonalAssistant';
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BrandIcon } from '../icons/BrandIcons';
import AssistantMark from '../assistant/AssistantMark';
import '../../styles/admin.css';
import useAuth from '../../hooks/useAuth';
import useTheme from '../../hooks/useTheme';
import useSupabaseQuery from '../../hooks/useSupabaseQuery';
import useAsyncAction from '../../hooks/useAsyncAction';
import { supabase } from '../../lib/supabaseClient';
import { invokeFunction } from '../../lib/api';
import { unwrap } from '../../lib/supabaseErrors';
import { ErrorState, SkeletonCards, SkeletonList, SkeletonTable } from '../ui/Loading';
import { sileo } from 'sileo';
import '../../styles/clinic-experience.css';
import '../../styles/panel-shell.css';
import CommandPalette, { openCommandPalette } from './CommandPalette';
import { useNavIndicator, useSpotlight } from './panelEffects';

/** Negritas e itálicas simples (**texto**, *texto*) en las respuestas de Denti, sin HTML arbitrario. */
function RichText({ text = '' }) {
  return String(text).replace(/^(\s*)[*-]\s+/gm, '$1• ').split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*\n]+\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export default function ClinicLayout({ children }) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { clinicSlug: urlSlug } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const sidebarRef = useRef(null);
  const shellRef = useRef(null);
  const navRef = useRef(null);
  const menuRef = useRef(null);
  const closeMenuRef = useRef(null);
  const notificationsRef = useRef(null);
  const notificationTriggerRef = useRef(null);
  const assistantRef = useRef(null);
  const assistantTriggerRef = useRef(null);
  const assistantCloseRef = useRef(null);
  const historyRef = useRef(null);
  const clinicId = profile?.clinic_id;
  const userId = profile?.id;
  const clinicSlug = profile?.clinic_name
    ? profile.clinic_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : 'mi-clinica';
  const role = profile?.role;
  const isAdmin = role === 'clinic_admin';
  const roleLabel = isAdmin ? 'Administración de clínica' : profile?.assistant_role === 'odontologo' ? 'Odontólogo' : 'Recepción';
  const recipientFilter = `user_id.is.null,user_id.eq.${userId}`;

  const notifQuery = useSupabaseQuery(
    (signal) => supabase.from('notifications').select('*').eq('clinic_id', clinicId)
      .or(recipientFilter).order('created_at', { ascending: false }).limit(10).abortSignal(signal).then(unwrap),
    { key: `${clinicId}:${userId}`, enabled: !!clinicId && !!userId }
  );
  const notifications = notifQuery.data ?? [];
  // Broadcast rows share one read flag, so unread counts and dismissals stay personal.
  const unreadIds = notifications.filter((item) => !item.read && item.user_id === userId).map((item) => item.id);
  const readAction = useAsyncAction(async (ids) => {
    if (!clinicId || !userId || !ids.length) return [];
    const rows = unwrap(await supabase.from('notifications').update({ read: true })
      .eq('clinic_id', clinicId).or(recipientFilter).in('id', ids).select('id'));
    if (!Array.isArray(rows) || rows.length !== ids.length) {
      throw new Error('No se pudo confirmar la actualización de todas las notificaciones. Actualiza la lista antes de volver a intentarlo.');
    }
    return rows.map((row) => row.id);
  });

  useEffect(() => {
    if (profile && urlSlug && urlSlug !== clinicSlug) {
      navigate(location.pathname.replace(/^\/[^/]+/, `/${clinicSlug}`), { replace: true });
    }
  }, [profile, urlSlug, clinicSlug, location.pathname, navigate]);

  useEffect(() => {
    setSidebarOpen(false);
    setShowNotifications(false);
  }, [location.pathname]);

  useEffect(() => { setShowAiAssistant(false); }, [clinicId, userId]);

  useEffect(() => {
    if (!clinicId || !userId) return undefined;
    const channel = supabase.channel(`notifications-${clinicId}-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `clinic_id=eq.${clinicId}` }, ({ new: item }) => {
        if (item.user_id && item.user_id !== userId) return;
        notifQuery.setData((previous) => [item, ...(previous || []).filter((entry) => entry.id !== item.id)].slice(0, 10));
        sileo.info({ title: item.title, description: item.message });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clinicId, userId, notifQuery.setData]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeMenuRef.current?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); setSidebarOpen(false); }
      if (event.key !== 'Tab') return;
      const items = [...(sidebarRef.current?.querySelectorAll('a[href], button:not([disabled])') || [])].filter((node) => node.getClientRects().length);
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const onResize = () => { if (window.matchMedia('(min-width: 901px)').matches) setSidebarOpen(false); };
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', onResize);
      menuRef.current?.focus();
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!showNotifications && !showAiAssistant) return undefined;
    if (showAiAssistant) assistantCloseRef.current?.focus();
    const handlePointer = (event) => {
      if (showNotifications && !notificationsRef.current?.contains(event.target)) setShowNotifications(false);
    };
    const handleKey = (event) => {
      if (event.key !== 'Escape') return;
      if (showAiAssistant) { setShowAiAssistant(false); assistantTriggerRef.current?.focus(); }
      if (showNotifications) { setShowNotifications(false); notificationTriggerRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('pointerdown', handlePointer); document.removeEventListener('keydown', handleKey); };
  }, [showNotifications, showAiAssistant]);


  const markRead = async (ids) => {
    const result = await readAction.run(ids);
    if (result.skipped) return;
    if (!result.ok) { sileo.error({ title: 'No se pudo confirmar la lectura', description: result.error.message }); return; }
    notifQuery.setData((previous) => (previous || []).map((item) => result.data.includes(item.id) ? { ...item, read: true } : item));
    if (ids.length > 1) sileo.success({ title: 'Lectura guardada', description: `${result.data.length} notificaciones actualizadas.` });
  };

  const sections = [
    { label: 'Tu consultorio', items: [
      { name: 'Resumen', suffix: '', Icon: 'home' },
      { name: 'Mi espacio', suffix: '/workspace', Icon: 'agenda' },
      { name: 'Agenda', suffix: '/agenda', Icon: 'agenda' },
      { name: 'Pacientes', suffix: '/patients', Icon: 'patients' },
      ...(profile?.assistant_role !== 'recepcionista' || isAdmin ? [{ name: 'Odontograma', suffix: '/odontograma', Icon: 'odontogram' }] : []),
    ] },
    { label: 'Organización', items: [
      ...(profile?.assistant_role !== 'odontologo' || isAdmin ? [{ name: 'Inventario', suffix: '/inventory', Icon: 'inventory' }] : []),
      ...(isAdmin ? [{ name: 'Caja e ingresos', suffix: '/finances', Icon: 'cash' }] : []),
      { name: isAdmin ? 'WhatsApp' : 'Mis conversaciones', suffix: '/whatsapp', Icon: 'whatsapp' },
    ] },
    ...(isAdmin ? [{ label: 'Administración', items: [
      { name: 'Equipo y plan', suffix: '/settings', Icon: 'team' },
      { name: 'Preferencias', suffix: '/preferences', Icon: 'preferences' },
    ] }] : []),
    { label: 'Tu cuenta', items: [
      { name: 'Contraseña y acceso', suffix: '/account', Icon: 'key' },
    ] },
  ];
  const activePage = sections.flatMap((section) => section.items).find((item) => location.pathname === `/${clinicSlug}${item.suffix}`)?.name || 'Consultorio';

  const paletteItems = [
    ...sections.flatMap((section) => section.items.map((item) => ({
      id: `nav-${item.suffix || 'home'}`, group: 'Ir a', label: item.name, hint: section.label, icon: item.Icon,
      run: () => navigate(`/${clinicSlug}${item.suffix}`),
    }))),
    ...(isAdmin ? [{ id: 'act-cita', group: 'Acciones', label: 'Nueva cita', hint: 'Reservar en la agenda', icon: 'agenda', run: () => navigate(`/${clinicSlug}/agenda?nueva=1`) }] : []),
    ...(profile?.assistant_role !== 'odontologo' || isAdmin ? [{ id: 'act-paciente', group: 'Acciones', label: 'Nuevo paciente', hint: 'Abrir una ficha clínica', icon: 'patientAdd', run: () => navigate(`/${clinicSlug}/patients?nuevo=1`) }] : []),
    { id: 'act-denti', group: 'Acciones', label: 'Preguntarle a Denti', hint: 'Asistente personal', icon: 'sparkles', run: () => { setShowNotifications(false); setShowAiAssistant(true); } },
    { id: 'act-tema', group: 'Acciones', label: theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro', icon: theme === 'dark' ? 'sun' : 'moon', run: () => toggleTheme() },
    { id: 'act-salir', group: 'Acciones', label: 'Cerrar sesión', icon: 'logout', run: () => signOut().then(() => navigate('/login')) },
  ];
  const searchPatients = React.useCallback(async (q) => {
    const term = q.trim();
    if (term.length < 2 || !clinicId) return [];
    const { data } = await supabase.from('pacientes').select('id, nombre, dni').or(`nombre.ilike.%${term.replace(/[%,()]/g, '')}%,dni.ilike.%${term.replace(/[%,()]/g, '')}%`).order('nombre').limit(6);
    return (data || []).map((p) => ({
      id: `pac-${p.id}`, group: 'Pacientes', label: p.nombre, hint: p.dni ? `DNI ${p.dni}` : 'Abrir ficha',
      avatar: p.nombre.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase(),
      run: () => navigate(`/${clinicSlug}/patients?paciente=${p.id}`),
    }));
  }, [clinicId, clinicSlug, navigate]);
  useSpotlight(shellRef);
  useNavIndicator(navRef, `${location.pathname}|${sections.length}`);

  return (
    <div className="saas-layout clinic-experience" ref={shellRef}>
      <div className="panel-ambient" aria-hidden="true"><i /><i /><i /></div>
      <span className="panel-route-bar" key={`route-${location.pathname}`} aria-hidden="true" />
      <CommandPalette items={paletteItems} loadExtra={searchPatients} placeholder="Busca una sección, acción o paciente…" />
      <a className="clinic-skip-link" href="#clinic-workspace">Ir al contenido</a>
      <aside ref={sidebarRef} id="clinic-navigation" className={`saas-sidebar ${sidebarOpen ? 'open' : ''}`} role={sidebarOpen ? 'dialog' : undefined} aria-modal={sidebarOpen ? true : undefined} aria-label="Navegación del consultorio">
        <div className="clinic-brand">
          <img src="/landing/logo-mark-256.webp" alt="" width="34" height="34" className="clinic-brand-logo" />
          <span>SmartDental<span className="clinic-brand-caption">Tu espacio de trabajo</span></span>
          <button ref={closeMenuRef} type="button" className="clinic-icon-button clinic-sidebar-close" aria-label="Cerrar navegación" onClick={() => setSidebarOpen(false)}><BrandIcon name="close" size={20} /></button>
        </div>
        <div className="clinic-identity">
          <span className="clinic-identity-icon">{profile?.logo_url ? <img src={profile.logo_url} alt="" width="32" height="32" /> : <BrandIcon name="clinic" size={22} />}</span>
          <div><strong>{profile?.clinic_name || 'Mi clínica'}</strong><span>{profile?.clinic_plan === 'pro' ? 'Plan Pro' : 'Plan Básico'}</span></div>
        </div>
        <nav className="saas-nav" aria-label="Secciones clínicas" ref={navRef}>
          {sections.map((section) => <div key={section.label} className="clinic-nav-section">
            <div className="saas-nav-title">{section.label}</div>
            {section.items.map(({ name, suffix, Icon }) => <NavLink key={name} end to={`/${clinicSlug}${suffix}`} className={({ isActive }) => `saas-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <BrandIcon name={Icon} size={20} /><span>{name}</span><BrandIcon name="chevronRight" size={14} className="clinic-nav-arrow" />
            </NavLink>)}
          </div>)}
        </nav>
        <div className="clinic-account">
          <div className="clinic-account-details"><span className="clinic-avatar">{(profile?.nombre_completo || profile?.email || 'U').charAt(0).toUpperCase()}</span><div><strong>{profile?.nombre_completo || 'Mi cuenta'}</strong><span>{roleLabel}</span></div></div>
          <button type="button" className="clinic-signout" onClick={() => signOut().then(() => navigate('/login'))}><BrandIcon name="logout" size={17} />Cerrar sesión</button>
        </div>
      </aside>
      <main className="saas-main" inert={sidebarOpen ? '' : undefined}>
        <header className="saas-main-header clinic-header">
          <div className="clinic-header-context">
            <button ref={menuRef} type="button" className="clinic-icon-button clinic-menu-toggle" aria-label="Abrir navegación" aria-expanded={sidebarOpen} aria-controls="clinic-navigation" onClick={() => { setShowNotifications(false); setShowAiAssistant(false); setSidebarOpen(true); }}><BrandIcon name="menu" size={21} /></button>
            <div><span className="clinic-header-eyebrow">{profile?.clinic_name || 'Consultorio'} <span aria-hidden="true">/</span> {sections.find((section) => section.items.some((item) => item.name === activePage))?.label || 'Consultorio'}</span><h1 key={activePage}>{activePage}</h1></div>
          </div>
          <div className="clinic-header-actions">
            <button type="button" className="panel-search-btn" onClick={openCommandPalette} aria-label="Buscar (Ctrl+K)"><BrandIcon name="search" size={17} /><span>Buscar</span><kbd>Ctrl K</kbd></button>
            <time className="clinic-header-date" dateTime={new Date().toISOString().slice(0, 10)}>{new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}</time>
            <div ref={notificationsRef} className="clinic-notifications-anchor">
              <button ref={notificationTriggerRef} type="button" className="clinic-icon-button" aria-label={`Notificaciones${unreadIds.length ? `, ${unreadIds.length} sin leer` : ''}`} aria-expanded={showNotifications} aria-controls="clinic-notifications" onClick={() => { setShowAiAssistant(false); setShowNotifications((open) => !open); }}><BrandIcon name="bell" size={20} />{unreadIds.length > 0 && <span className="clinic-notification-dot" />}</button>
              {showNotifications && <section id="clinic-notifications" className="clinic-notifications" aria-label="Notificaciones">
                <div className="clinic-popover-heading"><div><h2>Notificaciones</h2><p>Últimas actualizaciones de tu consultorio</p></div><button type="button" className="clinic-icon-button" aria-label="Cerrar notificaciones" onClick={() => { setShowNotifications(false); notificationTriggerRef.current?.focus(); }}><BrandIcon name="close" size={19} /></button></div>
              <div className="clinic-notification-tools"><button type="button" onClick={() => markRead(unreadIds)} disabled={!unreadIds.length || readAction.pending}><BrandIcon name="check" size={16} />{readAction.pending ? 'Guardando…' : 'Marcar visibles como leídas'}</button><button type="button" aria-label="Actualizar notificaciones" onClick={() => notifQuery.refetch()} disabled={notifQuery.isLoading || notifQuery.isRefreshing}><BrandIcon name="refresh" size={16} /></button></div>
                {notifQuery.isLoading ? <SkeletonList rows={3} label="Cargando notificaciones" /> : notifQuery.isError && !notifications.length ? <ErrorState compact error={notifQuery.error} onRetry={notifQuery.refetch} title="No se pudieron cargar" /> : !notifications.length ? <div className="clinic-notification-empty"><BrandIcon name="bell" size={28} /><strong>Estás al día</strong><p>No hay notificaciones para mostrar.</p></div> : <div className="clinic-notification-list">{notifications.map((item) => <article key={item.id} className={`clinic-notification ${item.read ? '' : 'is-unread'}`}><h3>{item.title}</h3><p>{item.message}</p><div><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}</time>{!item.read && item.user_id === userId && <button type="button" disabled={readAction.pending} onClick={() => markRead([item.id])}>Marcar como leída</button>}{!item.read && item.user_id === null && <small>Compartida con el equipo</small>}</div>{['approval_request', 'ai_action'].includes(item.type) && <small>Revisa esta operación en Mi espacio.</small>}</article>)}</div>}
              </section>}
            </div>
            <button type="button" className="clinic-icon-button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'}>{theme === 'dark' ? <BrandIcon key="sun" name="sun" size={20} /> : <BrandIcon key="moon" name="moon" size={20} />}</button>
          </div>
        </header>
        <div id="clinic-workspace" tabIndex={-1} className="clinic-workspace">
          <div className="clinic-view" key={location.pathname}>
            <Suspense fallback={<div className="sd-page-skeleton"><SkeletonCards count={3} /><SkeletonTable rows={6} /></div>}>{children}</Suspense>
          </div>
        </div>
      </main>
      <div className="clinic-assistant-area" inert={sidebarOpen ? '' : undefined}>
        {showAiAssistant && <section ref={assistantRef} id="clinic-assistant" className="denti-panel" role="dialog" aria-labelledby="clinic-assistant-title">
          <header className="denti-panel__head">
            <AssistantMark size={44} state="idle" />
            <div><h2 id="clinic-assistant-title">Denti</h2><p>Tu asistente personal · acciones supervisadas</p></div>
            <button ref={assistantCloseRef} type="button" className="clinic-icon-button" aria-label="Cerrar asistente" onClick={() => { setShowAiAssistant(false); assistantTriggerRef.current?.focus(); }}><BrandIcon name="close" size={19} /></button>
          </header>
          <PersonalAssistant compact />
        </section>}
        <button ref={assistantTriggerRef} type="button" className={`denti-trigger ${showAiAssistant ? 'is-open' : ''}`} aria-expanded={showAiAssistant} aria-controls="clinic-assistant" onClick={() => { setShowNotifications(false); setShowAiAssistant((open) => !open); }}>
          <AssistantMark size={34} state="idle" />
          <span>Pregúntale a Denti</span>
        </button>
      </div>
      {sidebarOpen && <div className="saas-sidebar-backdrop clinic-sidebar-backdrop" aria-hidden="true" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
