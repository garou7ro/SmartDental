import React, { Suspense, lazy, useContext, useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Eye, EyeOff, LockKeyhole, Mail, Package, Wallet } from '../components/icons';
import useAuth from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { classifyError, withTimeout } from '../lib/supabaseErrors';
import { homePathFor } from '../lib/authRoutes';
import { ThemeContext } from '../providers/ThemeProvider';
import { whatsappLink } from '../config/contact';
import { BrandLoader, ErrorState, Spinner } from '../components/ui/Loading';
import '../styles/Landing.css';
import '../styles/auth.css';

const LoginTooth3D = lazy(() => import('../components/auth/LoginTooth3D'));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function ToothMark() {
  return <img src="/landing/logo-mark-256.webp" width="40" height="40" alt="" className="sd-auth__logo" />;
}

/* Panel de marca: composición conceptual propia, creada con Blender. */
function BrandPanel() {
  const [tooth3d, setTooth3d] = useState(false);
  const [toothReady, setToothReady] = useState(false);
  // El molar 3D (three.js) se descarga después del primer pintado y solo en pantallas anchas.
  useEffect(() => {
    if (!window.matchMedia('(min-width: 1024px)').matches || navigator.connection?.saveData) return undefined;
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 250));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => setTooth3d(true), { timeout: 900 });
    return () => cancel(id);
  }, []);
  return (
    <aside className={`sd-auth__visual ${toothReady ? 'is-tooth-live' : ''}`} aria-label="SmartDental">
      <div className="sd-auth__aura" />
      <div className="sd-auth__art" aria-hidden="true">
        <picture>
          <source srcSet="/landing/access-studio-640.webp 640w, /landing/access-studio-1200.webp 1200w" sizes="50vw" type="image/webp" />
          <img src="/landing/access-studio-1200.webp" width="1200" height="1500" alt="" fetchpriority="high" />
        </picture>
        {tooth3d && (
          <>
            <img className="sd-auth__art-empty" src="/landing/access-studio-empty-1200.webp" width="1200" height="1500" alt="" decoding="async" />
            <Suspense fallback={null}>
              <LoginTooth3D onReady={() => setToothReady(true)} />
            </Suspense>
          </>
        )}
      </div>
      <div className="sd-auth__visual-copy">
        <span className="sd-auth__pill"><span className="sd-auth__dot" />Software para consultorios odontológicos</span>
        <p className="sd-auth__headline">Tu consultorio dental, en orden.</p>
        <p className="sd-auth__lead">Agenda, fichas con odontograma, inventario y caja en un solo panel, con accesos para tu equipo.</p>
      </div>
      <ul className="sd-auth__chips">
        <li><CalendarDays size={14} />Agenda</li>
        <li><ToothIcon />Odontograma</li>
        <li><Package size={14} />Inventario</li>
        <li><Wallet size={14} />Caja</li>
        <li><LockKeyhole size={14} />Roles</li>
      </ul>
    </aside>
  );
}

function ToothIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7.5 3.5c1.6 0 2.6.9 4.5.9s2.9-.9 4.5-.9c2.5 0 4 2 4 4.6 0 2.4-1.2 3.6-1.7 5.6-.6 2.4-.8 6.8-2.8 6.8-1.8 0-1.6-4.6-4-4.6s-2.2 4.6-4 4.6c-2 0-2.2-4.4-2.8-6.8C4.7 11.7 3.5 10.5 3.5 8.1c0-2.6 1.5-4.6 4-4.6Z" />
    </svg>
  );
}

function Field({ id, label, error, children, hint, aside }) {
  return (
    <div className={`sd-field ${error ? 'is-invalid' : ''}`}>
      {aside ? (
        <div className="sd-field__row"><label htmlFor={id} className="sd-field__label">{label}</label>{aside}</div>
      ) : (
        <label htmlFor={id} className="sd-field__label">{label}</label>
      )}
      {children}
      {error ? <p id={`${id}-error`} className="sd-field__error" role="alert">{error}</p> : hint ? <p className="sd-field__hint">{hint}</p> : null}
    </div>
  );
}

/* ─── Recuperación de contraseña ─── */
function RecoverForm({ initialEmail, onBack }) {
  const id = useId();
  const [email, setEmail] = useState(initialEmail || '');
  const [error, setError] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | sent
  const [serverError, setServerError] = useState(null);
  const sending = useRef(false);

  const submit = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) { setError('Escribe un correo válido, por ejemplo nombre@consultorio.com.'); return; }
    if (sending.current) return;
    sending.current = true;
    setError('');
    setServerError(null);
    setState('sending');
    try {
      const { error: err } = await withTimeout(supabase.auth.resetPasswordForEmail(value, { redirectTo: `${window.location.origin}/restablecer` }), 20000);
      if (err?.status === 429) {
        setServerError({ kind: 'rate', message: 'Se alcanzó el límite de solicitudes. Espera unos minutos antes de intentarlo otra vez.' });
        setState('idle');
        return;
      }
      if (err) throw err;
      setState('sent');
    } catch (err) {
      setServerError(classifyError(err));
      setState('idle');
    } finally {
      sending.current = false;
    }
  };

  if (state === 'sent') {
    return (
      <div className="sd-auth__done" role="status">
        <span className="sd-auth__done-icon"><Mail size={22} /></span>
        <h2 className="sd-auth__h2">Revisa tu correo</h2>
        <p className="sd-auth__sub">Si <strong>{email.trim()}</strong> está registrado, recibirás un enlace para crear una contraseña nueva. Puede tardar unos minutos.</p>
        <button type="button" className="sd-auth__btn sd-auth__btn--ghost" onClick={onBack}><ArrowLeft size={16} />Volver a iniciar sesión</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="sd-auth__form">
      <div>
        <h1 className="sd-auth__h1">Recupera tu acceso</h1>
        <p className="sd-auth__sub">Te enviaremos un enlace para crear una contraseña nueva.</p>
      </div>
      {serverError && <ErrorState compact error={serverError} title="No se pudo enviar el enlace" />}
      <Field id={`${id}-email`} label="Correo electrónico" error={error}>
        <div className="sd-input">
          <Mail size={17} aria-hidden="true" />
          <input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-email-error` : undefined}
            placeholder="nombre@consultorio.com"
            disabled={state === 'sending'}
            autoFocus
          />
        </div>
      </Field>
      <button type="submit" className="sd-auth__btn" disabled={state === 'sending'}>
        {state === 'sending' ? <><Spinner size={16} />Enviando enlace…</> : <>Enviar enlace<ArrowRight size={16} /></>}
      </button>
      <button type="button" className="sd-auth__link" onClick={onBack}><ArrowLeft size={15} />Volver a iniciar sesión</button>
    </form>
  );
}

/* ─── Página ─── */
export default function Login() {
  const id = useId();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, profile, error: authError, notice, clearNotice, signIn, signOut, retryProfile } = useAuth();
  const { setTheme } = useContext(ThemeContext);

  const [mode, setMode] = useState('login'); // login | recover
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const passwordRef = useRef(null);

  useEffect(() => {
    document.title = 'Iniciar sesión | SmartDental';
    try {
      const saved = localStorage.getItem('saved_email');
      if (saved) { setEmail(saved); setRemember(true); }
    } catch { /* almacenamiento no disponible */ }
  }, []);

  // Con el perfil listo se entra al panel (a la página pedida si el rol lo permite).
  useEffect(() => {
    if (status !== 'ready' || !profile) return;
    const home = homePathFor(profile);
    const from = location.state?.from;
    const target = from && from !== '/login' && (profile.role === 'platform_admin' ? from.startsWith('/admin') : !from.startsWith('/admin')) ? from : home;
    if (target !== '/login') navigate(target, { replace: true });
  }, [status, profile, navigate, location.state]);

  const validate = () => {
    const next = {};
    if (!email.trim()) next.email = 'Escribe tu correo electrónico.';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'El correo no tiene un formato válido.';
    if (!password) next.password = 'Escribe tu contraseña.';
    setErrors(next);
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return; // evita envíos duplicados
    const v = validate();
    if (Object.keys(v).length) {
      document.getElementById(v.email ? `${id}-email` : `${id}-password`)?.focus();
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    clearNotice();
    const loginEmail = email.trim();
    try {
      await signIn(loginEmail, password);
      try {
        if (remember) localStorage.setItem('saved_email', loginEmail);
        else localStorage.removeItem('saved_email');
      } catch { /* almacenamiento no disponible */ }
      // tema por defecto de la plataforma: secundario, no bloquea el acceso
      supabase.from('system_settings').select('value').eq('key', 'default_theme').maybeSingle()
        .then(({ data }) => {
          if (data?.value) {
            try { localStorage.setItem('theme', data.value); } catch { /* sin almacenamiento */ }
            setTheme(data.value);
          }
        });
    } catch (err) {
      setFormError(err?.__classified ? err : classifyError(err));
      setPassword('');
      passwordRef.current?.focus();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const preparing = status === 'loading_profile';
  const busy = submitting || preparing;
  const signupHref = whatsappLink('Hola, quiero una cuenta de SmartDental para mi consultorio. ¿Cómo empiezo?');

  // Mientras se comprueba si ya hay una sesión, no se muestra el formulario (evita un parpadeo del login)
  if (status === 'initializing') return <BrandLoader fullscreen label="Comprobando tu sesión" />;

  return (
    <div className="sd-auth">
      <main className="sd-auth__main">
        <div className="sd-auth__top">
          <Link to="/" className="sd-auth__brand" aria-label="SmartDental, volver al inicio">
            <ToothMark />
            <span>SmartDental</span>
          </Link>
          <Link to="/" className="sd-auth__back"><ArrowLeft size={15} />Volver al sitio</Link>
        </div>

        <div className="sd-auth__panel">
          {mode === 'recover' ? (
            <RecoverForm initialEmail={email} onBack={() => setMode('login')} />
          ) : status === 'error' ? (
            <div className="sd-auth__form">
              <div>
                <h1 className="sd-auth__h1">Casi listo</h1>
                <p className="sd-auth__sub">Tu sesión está activa, pero no pudimos cargar tu perfil.</p>
              </div>
              <ErrorState error={authError} onRetry={retryProfile} title="No se pudo cargar tu perfil" />
              <button type="button" className="sd-auth__link" onClick={signOut}>Usar otra cuenta</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="sd-auth__form" aria-busy={busy}>
              <div>
                <h1 className="sd-auth__h1">Bienvenido de nuevo</h1>
                <p className="sd-auth__sub">Ingresa a tu consultorio en SmartDental.</p>
              </div>

              {notice && !formError && (
                <div className="sd-auth__notice" role="alert"><LockKeyhole size={16} aria-hidden="true" /><span>{notice}</span></div>
              )}
              {formError && (
                <div className="sd-auth__alert" role="alert">
                  <strong>{formError.kind === 'credentials' ? 'No pudimos iniciar sesión' : formError.kind === 'network' ? 'Sin conexión' : 'No pudimos iniciar sesión'}</strong>
                  <span>{formError.message}</span>
                </div>
              )}

              <Field id={`${id}-email`} label="Correo electrónico" error={errors.email}>
                <div className="sd-input">
                  <Mail size={17} aria-hidden="true" />
                  <input
                    id={`${id}-email`}
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((x) => ({ ...x, email: undefined })); }}
                    onBlur={() => email && !EMAIL_RE.test(email.trim()) && setErrors((x) => ({ ...x, email: 'El correo no tiene un formato válido.' }))}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? `${id}-email-error` : undefined}
                    placeholder="nombre@consultorio.com"
                    disabled={busy}
                  />
                </div>
              </Field>

              <Field
                id={`${id}-password`}
                label="Contraseña"
                aside={<button type="button" className="sd-auth__forgot" onClick={() => setMode('recover')}>¿Olvidaste tu contraseña?</button>}
                error={errors.password}
                hint={capsLock ? 'Bloq Mayús está activado.' : undefined}
              >
                <div className="sd-input">
                  <LockKeyhole size={17} aria-hidden="true" />
                  <input
                    id={`${id}-password`}
                    ref={passwordRef}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((x) => ({ ...x, password: undefined })); }}
                    onKeyUp={(e) => setCapsLock(e.getModifierState?.('CapsLock'))}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? `${id}-password-error` : undefined}
                    placeholder="Tu contraseña"
                    disabled={busy}
                  />
                  <button
                    type="button"
                    className="sd-input__toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                    disabled={busy}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>

              <label className="sd-check">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} disabled={busy} />
                <span className="sd-check__box" aria-hidden="true" />
                Recordar mi correo en este equipo
              </label>

              <button type="submit" className="sd-auth__btn" disabled={busy}>
                {preparing ? <><Spinner size={16} />Preparando tu consultorio…</> : submitting ? <><Spinner size={16} />Ingresando…</> : <>Iniciar sesión<ArrowRight size={16} /></>}
              </button>

              <p className="sd-auth__signup">
                ¿Aún no tienes cuenta?{' '}
                <a href={signupHref} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a>
              </p>
            </form>
          )}
        </div>

        <footer className="sd-auth__foot">
          <span>© {new Date().getFullYear()} SmartDental</span>
          <Link to="/terms">Términos y condiciones</Link>
          <Link to="/privacy">Política de privacidad</Link>
        </footer>
      </main>

      <BrandPanel />
    </div>
  );
}
