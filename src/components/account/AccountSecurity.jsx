import React, { useId, useMemo, useState } from 'react';
import { Check, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck, Sparkles } from '../icons';
import { supabase } from '../../lib/supabaseClient';
import useAsyncAction from '../../hooks/useAsyncAction';
import useAuth from '../../hooks/useAuth';
import { ButtonLabel, ErrorState } from '../ui/Loading';
import './account-security.css';

const MIN_LENGTH = 12;
const ROLE_LABEL = { platform_admin: 'Administración de la plataforma', clinic_admin: 'Titular de la clínica', assistant: 'Asistente' };

function passwordError(error) {
  const messages = {
    reauthentication_needed: 'Confirma tu identidad con un código antes de cambiar la contraseña.',
    reauthentication_not_valid: 'El código no es válido o ha caducado. Revísalo o solicita uno nuevo.',
    same_password: 'Elige una contraseña diferente de la actual.',
    invalid_credentials: 'La contraseña actual no es correcta. Revísala e inténtalo de nuevo.',
    weak_password: 'La contraseña no cumple la política de seguridad. Usa una más larga y única, con letras, números y símbolos.',
    over_request_rate_limit: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.',
    over_email_send_rate_limit: 'Espera unos minutos antes de solicitar otro código.',
    over_sms_send_rate_limit: 'Espera unos minutos antes de solicitar otro código.',
  };
  if (!messages[error.code]) return error;
  // Reauthentication errors are not expired sessions, even if Auth returns 401.
  return { __classified: true, kind: 'validation', message: messages[error.code], code: error.code, retryable: false };
}

/** Criterios orientativos; la política real la aplica Supabase Auth al guardar. */
function evaluate(password, current, confirmation) {
  const rules = [
    { id: 'length', label: `Al menos ${MIN_LENGTH} caracteres`, ok: password.length >= MIN_LENGTH },
    { id: 'case', label: 'Mayúsculas y minúsculas', ok: /[a-zà-ÿ]/.test(password) && /[A-ZÀ-Ý]/.test(password) },
    { id: 'number', label: 'Al menos un número', ok: /\d/.test(password) },
    { id: 'symbol', label: 'Al menos un símbolo', ok: /[^\p{L}\d\s]/u.test(password) },
    { id: 'different', label: 'Distinta de la actual', ok: !!password && password !== current },
    { id: 'match', label: 'La confirmación coincide', ok: !!password && password === confirmation },
  ];
  const strengthPoints = rules.slice(0, 4).filter((rule) => rule.ok).length + (password.length >= 16 ? 1 : 0);
  const level = !password ? 0 : strengthPoints <= 1 ? 1 : strengthPoints <= 2 ? 2 : strengthPoints <= 3 ? 3 : 4;
  return { rules, level, label: ['Sin escribir', 'Débil', 'Mejorable', 'Buena', 'Excelente'][level] };
}

function PasswordField({ id, name, label, value, onChange, autoComplete, invalid, describedBy, minLength, visible, onToggle }) {
  return (
    <div className="sd-pass-field">
      <label className="saas-label" htmlFor={id}>{label}</label>
      <div className="sd-pass-field__control">
        <LockKeyhole size={16} aria-hidden="true" className="sd-pass-field__icon" />
        <input
          className="saas-input"
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          required
          minLength={minLength}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        />
        <button type="button" className="sd-pass-field__eye" onClick={onToggle} aria-pressed={visible} aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}>
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

/** Changes only the signed-in user's Auth password. Never writes profile data. */
export default function AccountSecurity({ title = 'Contraseña y acceso', className = '', timeout = 30000 }) {
  const id = useId();
  const { profile, session } = useAuth();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });
  const [needsCode, setNeedsCode] = useState(false);
  const [nonce, setNonce] = useState('');
  const [validation, setValidation] = useState(null);
  const [notice, setNotice] = useState(null);
  const [operation, setOperation] = useState('save');
  const [uncertain, setUncertain] = useState(false);
  const action = useAsyncAction(async (kind, values) => {
    const result = kind === 'code'
      ? await supabase.auth.reauthenticate()
      : await supabase.auth.updateUser(values);
    if (result.error) throw passwordError(result.error);
    if (kind === 'save' && !result.data?.user) throw new Error('Missing confirmed user');
  }, { timeout });
  const blocked = action.pending || uncertain;
  const strength = useMemo(() => evaluate(password, current, confirmation), [password, current, confirmation]);
  const email = profile?.email || session?.user?.email;

  const change = (setter) => (event) => {
    setter(event.target.value);
    setValidation(null);
    setNotice(null);
    action.reset();
  };
  const toggle = (key) => () => setVisible((state) => ({ ...state, [key]: !state[key] }));
  const sendCode = async () => {
    if (blocked) return;
    setOperation('code'); setNotice(null); setValidation(null);
    const result = await action.run('code');
    if (result.ok) setNotice({ kind: 'code', text: 'Código enviado. Revisa el correo o teléfono asociado a tu cuenta.' });
  };
  const submit = async (event) => {
    event.preventDefault();
    if (blocked) return;
    setNotice(null); setValidation(null);
    if (!current) return setValidation({ field: 'current', text: 'Ingresa tu contraseña actual.' });
    if (password.length < MIN_LENGTH) return setValidation({ field: 'new', text: `Usa al menos ${MIN_LENGTH} caracteres.` });
    if (password === current) return setValidation({ field: 'new', text: 'Elige una contraseña diferente de la actual.' });
    if (password !== confirmation) return setValidation({ field: 'confirm', text: 'Las contraseñas nuevas no coinciden.' });
    if (needsCode && !nonce.trim()) return setValidation({ field: 'nonce', text: 'Ingresa el código de confirmación.' });
    setOperation('save');
    const result = await action.run('save', { current_password: current, password, ...(needsCode ? { nonce: nonce.trim() } : {}) });
    if (result.ok) {
      setCurrent(''); setPassword(''); setConfirmation(''); setNonce(''); setVisible({ current: false, next: false, confirm: false }); setNeedsCode(false);
      setNotice({ kind: 'success', text: 'Tu contraseña se actualizó correctamente. Úsala la próxima vez que ingreses.' });
    } else if (['reauthentication_needed', 'reauthentication_not_valid'].includes(result.error?.code)) {
      setNeedsCode(true);
    } else if (result.uncertain) setUncertain(true);
  };

  const describe = (key) => (validation?.field === key ? `${id}-validation` : undefined);

  return (
    <section className={`sd-account ${className}`} aria-labelledby={`${id}-title`}>
      <header className="sd-account__hero">
        <div className="sd-account__seal" aria-hidden="true">
          <span className="sd-account__seal-ring" />
          <ShieldCheck size={30} strokeWidth={1.6} />
        </div>
        <div className="sd-account__hero-copy">
          <span className="sd-eyebrow">Seguridad de la cuenta</span>
          <h2 id={`${id}-title`}>{title}</h2>
          <p>Cambia la contraseña con la que ingresas a SmartDental. Solo afecta a tu usuario.</p>
        </div>
        <dl className="sd-account__identity">
          {email && <div><dt><Mail size={14} aria-hidden="true" />Usuario</dt><dd>{email}</dd></div>}
          {profile?.role && <div><dt><KeyRound size={14} aria-hidden="true" />Rol</dt><dd>{ROLE_LABEL[profile.role] || profile.role}</dd></div>}
        </dl>
      </header>

      <div className="sd-account__grid">
        <form className="sd-account__card sd-account__form" onSubmit={submit} noValidate aria-busy={action.pending}>
          <div className="sd-account__card-head">
            <h3>Nueva contraseña</h3>
            <p>Primero confirma la actual; luego elige una nueva y única.</p>
          </div>
          <fieldset disabled={blocked}>
            <PasswordField id={`${id}-current`} name="current-password" label="Contraseña actual" value={current} onChange={change(setCurrent)} autoComplete="current-password" invalid={validation?.field === 'current'} describedBy={describe('current')} visible={visible.current} onToggle={toggle('current')} />
            <div className="sd-account__divider" aria-hidden="true" />
            <PasswordField id={`${id}-new`} name="new-password" label="Nueva contraseña" value={password} onChange={change(setPassword)} autoComplete="new-password" minLength={MIN_LENGTH} invalid={validation?.field === 'new'} describedBy={describe('new') || `${id}-strength`} visible={visible.next} onToggle={toggle('next')} />

            <div className={`sd-strength is-level-${strength.level}`} id={`${id}-strength`} aria-live="polite">
              <div className="sd-strength__bars" aria-hidden="true">{[1, 2, 3, 4].map((n) => <i key={n} className={strength.level >= n ? 'is-on' : ''} />)}</div>
              <span>Seguridad: <strong>{strength.label}</strong></span>
            </div>

            <PasswordField id={`${id}-confirm`} name="confirm-password" label="Confirmar nueva contraseña" value={confirmation} onChange={change(setConfirmation)} autoComplete="new-password" minLength={MIN_LENGTH} invalid={validation?.field === 'confirm'} describedBy={describe('confirm')} visible={visible.confirm} onToggle={toggle('confirm')} />

            {needsCode && (
              <div className="sd-account__verification">
                <p>Para continuar, confirma tu identidad con un código enviado a tu correo o teléfono.</p>
                <button className="saas-btn saas-btn-secondary" type="button" onClick={sendCode}><ButtonLabel pending={action.pending && operation === 'code'} pendingLabel="Enviando código…">Enviar código de confirmación</ButtonLabel></button>
                <label className="saas-label" htmlFor={`${id}-nonce`}>Código de confirmación</label>
                <input className="saas-input" id={`${id}-nonce`} name="nonce" value={nonce} onChange={change(setNonce)} autoComplete="one-time-code" inputMode="numeric" required aria-invalid={validation?.field === 'nonce' || undefined} aria-describedby={describe('nonce')} />
              </div>
            )}
          </fieldset>

          {validation && <p className="sd-account__validation" role="alert" id={`${id}-validation`}>{validation.text}</p>}
          {action.error && <ErrorState compact error={action.error} title={operation === 'code' ? 'No se pudo confirmar el envío' : 'No se pudo confirmar el cambio'} />}
          {uncertain && <p className="sd-account__hint">Antes de repetir la operación, comprueba el resultado al volver a iniciar sesión. Esta pantalla mantiene bloqueados los envíos para evitar duplicados.</p>}
          {notice && (
            <p className={`sd-account__notice is-${notice.kind}`} role="status">
              {notice.kind === 'success' ? <span className="sd-account__check"><CheckCircle2 size={20} aria-hidden="true" /></span> : <Sparkles size={18} aria-hidden="true" />}
              {notice.text}
            </p>
          )}

          <button className="saas-btn saas-btn-primary sd-account__submit" type="submit" disabled={blocked}>
            <ButtonLabel pending={action.pending && operation === 'save'} pendingLabel="Actualizando contraseña…">Actualizar contraseña</ButtonLabel>
          </button>
        </form>

        <aside className="sd-account__card sd-account__guide" aria-label="Requisitos de la contraseña">
          <div className="sd-account__card-head">
            <h3>Lista de comprobación</h3>
            <p>Se actualiza mientras escribes.</p>
          </div>
          <ul className="sd-rules-list">
            {strength.rules.map((rule) => (
              <li key={rule.id} className={rule.ok ? 'is-ok' : ''}>
                <span className="sd-rules-list__mark" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>
                {rule.label}
                <span className="sd-sr-only">{rule.ok ? ': cumplido' : ': pendiente'}</span>
              </li>
            ))}
          </ul>
          <div className="sd-account__tip">
            <Sparkles size={16} aria-hidden="true" />
            <p>Una frase de varias palabras con números y símbolos es más fácil de recordar y más difícil de adivinar. No la reutilices en otros servicios.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
