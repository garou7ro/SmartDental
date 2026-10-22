import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, KeyRound, LockKeyhole } from '../components/icons';
import useAuth from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { classifyError } from '../lib/supabaseErrors';
import { homePathFor } from '../lib/authRoutes';
import { BrandLoader, ErrorState, Spinner } from '../components/ui/Loading';
import '../styles/auth.css';

/*
 * Destino del enlace de recuperación (resetPasswordForEmail → /restablecer).
 * supabase-js lee el token del enlace y abre una sesión de recuperación; aquí solo se
 * decide qué mostrar según el estado de sesión y se guarda la nueva contraseña.
 */
export default function ResetPassword() {
  const id = useId();
  const navigate = useNavigate();
  const { status, profile } = useAuth();
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState(null);
  const savingRef = useRef(false);

  // Supabase informa de enlaces caducados o inválidos en el fragmento de la URL
  const linkError = useMemo(() => {
    const p = new URLSearchParams(window.location.hash.slice(1) || window.location.search.slice(1));
    return p.get('error_code') || p.get('error') || null;
  }, []);

  useEffect(() => { document.title = 'Nueva contraseña | SmartDental'; }, []);

  const rules = [
    { ok: pass.length >= 8, label: 'Al menos 8 caracteres' },
    { ok: /[A-Za-z]/.test(pass) && /\d/.test(pass), label: 'Letras y números' },
  ];

  const submit = async (e) => {
    e.preventDefault();
    if (savingRef.current) return;
    const next = {};
    if (!rules.every((r) => r.ok)) next.pass = 'La contraseña no cumple los requisitos.';
    if (confirm !== pass) next.confirm = 'Las contraseñas no coinciden.';
    setErrors(next);
    if (Object.keys(next).length) return;
    savingRef.current = true;
    setSaving(true);
    setServerError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: pass });
      if (error) throw error;
      setPass('');
      setConfirm('');
      setDone(true);
    } catch (error) {
      const c = classifyError(error);
      if (/different from the old|same_password/i.test(`${error.code} ${error.message}`)) c.message = 'La nueva contraseña debe ser distinta de la anterior.';
      setServerError(c);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (status === 'initializing') return <BrandLoader fullscreen label="Verificando el enlace" />;

  const hasSession = status === 'loading_profile' || status === 'ready' || status === 'error';
  let body;

  if (done) {
    body = (
      <div className="sd-auth__done" role="status">
        <span className="sd-auth__done-icon"><Check size={22} /></span>
        <h1 className="sd-auth__h2">Contraseña actualizada</h1>
        <p className="sd-auth__sub">Ya puedes usar tu nueva contraseña para ingresar a SmartDental.</p>
        <button
          type="button"
          className="sd-auth__btn"
          disabled={status !== 'ready'}
          onClick={() => navigate(homePathFor(profile), { replace: true })}
        >
          {status === 'ready' ? <>Ir a mi consultorio<ArrowRight size={16} /></> : <><Spinner size={16} />Preparando tu consultorio…</>}
        </button>
      </div>
    );
  } else if (!hasSession || linkError) {
    body = (
      <div className="sd-auth__done">
        <span className="sd-auth__done-icon" style={{ background: 'rgba(194,54,31,0.08)', color: '#c2361f' }}><KeyRound size={22} /></span>
        <h1 className="sd-auth__h2">El enlace no es válido</h1>
        <p className="sd-auth__sub">Puede que haya caducado o que ya se haya usado. Pide un enlace nuevo desde la pantalla de inicio de sesión.</p>
        <Link to="/login" className="sd-auth__btn" style={{ textDecoration: 'none' }}>Ir a iniciar sesión<ArrowRight size={16} /></Link>
      </div>
    );
  } else {
    body = (
      <form onSubmit={submit} noValidate className="sd-auth__form">
        <div>
          <h1 className="sd-auth__h1">Crea una contraseña nueva</h1>
          <p className="sd-auth__sub">Elige una contraseña que no uses en otros servicios.</p>
        </div>
        {serverError && <ErrorState compact error={serverError} title="No se pudo guardar" />}
        <div className={`sd-field ${errors.pass ? 'is-invalid' : ''}`}>
          <label htmlFor={`${id}-p`} className="sd-field__label">Nueva contraseña</label>
          <div className="sd-input">
            <LockKeyhole size={17} aria-hidden="true" />
            <input id={`${id}-p`} type={show ? 'text' : 'password'} autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} aria-invalid={!!errors.pass} aria-describedby={`${id}-rules`} disabled={saving} autoFocus />
            <button type="button" className="sd-input__toggle" onClick={() => setShow((v) => !v)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={show}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <ul id={`${id}-rules`} className="sd-rules">
            {rules.map((r) => <li key={r.label} className={r.ok ? 'is-ok' : ''}><Check size={13} aria-hidden="true" />{r.label}<span className="sd-visually-hidden">{r.ok ? ': cumplido' : ': pendiente'}</span></li>)}
          </ul>
          {errors.pass && <p className="sd-field__error" role="alert">{errors.pass}</p>}
        </div>
        <div className={`sd-field ${errors.confirm ? 'is-invalid' : ''}`}>
          <label htmlFor={`${id}-c`} className="sd-field__label">Repite la contraseña</label>
          <div className="sd-input">
            <LockKeyhole size={17} aria-hidden="true" />
            <input id={`${id}-c`} type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={!!errors.confirm} disabled={saving} />
          </div>
          {errors.confirm && <p className="sd-field__error" role="alert">{errors.confirm}</p>}
        </div>
        <button type="submit" className="sd-auth__btn" disabled={saving}>
          {saving ? <><Spinner size={16} />Guardando…</> : <>Guardar contraseña<ArrowRight size={16} /></>}
        </button>
      </form>
    );
  }

  return (
    <div className="sd-auth sd-auth--single">
      <main className="sd-auth__main">
        <div className="sd-auth__top">
          <Link to="/" className="sd-auth__brand" aria-label="SmartDental, volver al inicio">
            <img src="/landing/logo-mark-256.webp" width="32" height="32" alt="" className="sd-auth__logo" />
            <span>SmartDental</span>
          </Link>
          <Link to="/login" className="sd-auth__back"><ArrowLeft size={15} />Iniciar sesión</Link>
        </div>
        <div className="sd-auth__panel">{body}</div>
      </main>
    </div>
  );
}
