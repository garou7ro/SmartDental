import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import useAuth from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import useSupabaseQuery from '../hooks/useSupabaseQuery';
import useAsyncAction from '../hooks/useAsyncAction';
import { invokeFunction } from '../lib/api';
import { unwrap } from '../lib/supabaseErrors';
import { ButtonLabel, ErrorState, Skeleton } from '../components/ui/Loading';
import { BrandIcon } from '../components/icons/BrandIcons';
import '../styles/clinic-pages.css';
import '../styles/whatsapp.css';

const MAX_LOGO = 2 * 1024 * 1024;

export default function ClinicPreferences() {
  const { profile, refreshProfile } = useAuth();
  const { clinicSlug } = useParams();
  const fileRef = useRef(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  const clinicQuery = useSupabaseQuery(
    (signal) => supabase.from('clinics').select('id,nombre,direccion,email,telefono,logo_url').eq('id', profile.clinic_id).abortSignal(signal).single().then(unwrap),
    { key: profile?.clinic_id, enabled: !!profile?.clinic_id }
  );
  const hoursQuery = useSupabaseQuery(
    (signal) => invokeFunction('whatsapp-settings',{action:'bot-get'},{signal}).then(data=>data.config),
    { key: `${profile?.clinic_id}|h`, enabled: !!profile?.clinic_id }
  );
  const save = useAsyncAction((values) => supabase.from('clinics').update(values).eq('id', profile.clinic_id).select('id').then(unwrap));
  const upload = useAsyncAction(async (file) => {
    const ext = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' })[file.type];
    if (!ext) throw new Error('Usa una imagen PNG, JPEG o WebP.');
    const path = `${profile.clinic_id}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('clinic-logos').upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from('clinic-logos').getPublicUrl(path);
    const rows = await supabase.from('clinics').update({ logo_url: data.publicUrl }).eq('id', profile.clinic_id).select('id').then(unwrap);
    if (!rows?.length) throw new Error('Tu usuario no tiene permiso para cambiar el logotipo.');
    return data.publicUrl;
  });

  useEffect(() => {
    const c = clinicQuery.data;
    if (c) setForm({ nombre: c.nombre || '', direccion: c.direccion || '', telefono: c.telefono || '', email: c.email || '' });
  }, [clinicQuery.data]);

  if (clinicQuery.isLoading || clinicQuery.status === 'idle' || (!form && !clinicQuery.isError)) {
    return <div className="clinic-page-container sd-page-skeleton" role="status" aria-label="Cargando datos de la clínica"><Skeleton h={120} r={22} /><Skeleton h={320} r={22} /></div>;
  }
  if (clinicQuery.isError && !clinicQuery.data) {
    return <div className="clinic-page-container"><ErrorState error={clinicQuery.error} onRetry={clinicQuery.refetch} title="No se pudieron cargar los datos de la clínica" /></div>;
  }

  const clinic = clinicQuery.data;
  const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setError(null); };
  const dirty = ['nombre', 'direccion', 'telefono', 'email'].some((k) => (clinic[k] || '') !== form[k]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return setError('El nombre del consultorio es obligatorio.');
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) return setError('Revisa el correo electrónico.');
    const values = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]));
    const res = await save.run(values);
    if (res.skipped) return;
    if (!res.ok) { sileo.error({ title: 'No se pudieron guardar los cambios', description: res.error.message }); return; }
    if (!res.data?.length) { sileo.error({ title: 'No se confirmó el cambio', description: 'Tu usuario no tiene permiso para modificar estos datos.' }); return; }
    sileo.success({ title: 'Datos guardados', description: 'La información del consultorio quedó actualizada.' });
    clinicQuery.setData({ ...clinic, ...values });
    refreshProfile?.();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { sileo.warning({ title: 'Formato no admitido', description: 'Usa PNG, JPG o WebP.' }); return; }
    if (file.size > MAX_LOGO) { sileo.warning({ title: 'Archivo muy pesado', description: 'El logotipo debe pesar menos de 2 MB.' }); return; }
    const local = URL.createObjectURL(file);
    setPreview(local);
    const res = await upload.run(file);
    if (res.skipped) return;
    if (!res.ok) {
      setPreview(null);
      sileo.error({ title: 'No se pudo subir el logotipo', description: res.error.message });
      return;
    }
    clinicQuery.setData({ ...clinic, logo_url: res.data });
    sileo.success({ title: 'Logotipo actualizado', description: 'Se verá en tu panel y en tus documentos.' });
    refreshProfile?.();
  };

  const logo = preview || clinic.logo_url;
  const hours = hoursQuery.data?.opening_time && hoursQuery.data?.closing_time ? `${hoursQuery.data.opening_time} – ${hoursQuery.data.closing_time} (${hoursQuery.data.timezone})` : '';

  return (
    <div className="clinic-page-container cp-page">
      <header className="cp-page-head">
        <div>
          <span className="odo-kicker">Preferencias</span>
          <h2>Identidad del consultorio</h2>
          <p>Cómo aparece tu consultorio en el panel y ante tus pacientes.</p>
        </div>
      </header>

      <div className="pref-grid">
        <section className="wa-card pref-logo">
          <span className="odo-kicker">Logotipo</span>
          <div className={`pref-logo__frame ${upload.pending ? 'is-busy' : ''}`}>
            {logo ? <img src={logo} alt={`Logotipo de ${clinic.nombre}`} /> : <BrandIcon name="clinic" size={42} />}
            {upload.pending && <span className="pref-logo__spinner" aria-hidden="true" />}
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onFile} />
          <button type="button" className="saas-btn saas-btn-secondary" onClick={() => fileRef.current?.click()} disabled={upload.pending}>
            <BrandIcon name="download" size={16} style={{ transform: 'rotate(180deg)' }} />
            <ButtonLabel pending={upload.pending} pendingLabel="Subiendo…">{clinic.logo_url ? 'Cambiar logotipo' : 'Subir logotipo'}</ButtonLabel>
          </button>
          <small>PNG, JPG, WEBP o SVG · máximo 2 MB</small>
        </section>

        <form className="wa-card" onSubmit={submit} noValidate>
          <span className="odo-kicker">Datos de contacto</span>
          <div className="cp-form">
            <label className="cp-field cp-field--full"><span>Nombre del consultorio *</span><input value={form.nombre} onChange={set('nombre')} /></label>
            <label className="cp-field cp-field--full"><span>Dirección</span><input value={form.direccion} onChange={set('direccion')} placeholder="Jr., Av., número, ciudad" /></label>
            <label className="cp-field"><span>Teléfono</span><input value={form.telefono} onChange={set('telefono')} inputMode="tel" /></label>
            <label className="cp-field"><span>Correo</span><input type="email" value={form.email} onChange={set('email')} /></label>
            {error && <p className="cp-form__error" role="alert">{error}</p>}
            <div className="cp-form__actions">
              <button type="button" className="saas-btn saas-btn-secondary" disabled={!dirty || save.pending} onClick={() => setForm({ nombre: clinic.nombre || '', direccion: clinic.direccion || '', telefono: clinic.telefono || '', email: clinic.email || '' })}>Descartar</button>
              <button type="submit" className="saas-btn saas-btn-primary" disabled={!dirty || save.pending}><ButtonLabel pending={save.pending}>Guardar cambios</ButtonLabel></button>
            </div>
          </div>
        </form>

        <section className="wa-card pref-hours">
          <span className="odo-kicker">Horario de atención</span>
          <p className="pref-hours__value">{hours || 'Aún no publicaste tu horario'}</p>
          <p>El horario se publica desde WhatsApp, porque es lo que el bot comparte con tus pacientes.</p>
          <Link className="saas-btn saas-btn-secondary" to={`/${clinicSlug}/whatsapp`}><BrandIcon name="whatsapp" size={16} />Configurar horario</Link>
        </section>
      </div>
    </div>
  );
}
