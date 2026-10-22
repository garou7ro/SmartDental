import React, { useState } from 'react';
import { sileo } from 'sileo';
import { supabase } from '../../lib/supabaseClient';
import useSupabaseQuery from '../../hooks/useSupabaseQuery';
import useAsyncAction from '../../hooks/useAsyncAction';
import { unwrap } from '../../lib/supabaseErrors';
import { QueryState, SkeletonCards, ButtonLabel, ErrorState } from '../../components/ui/Loading';

function SettingsForm({ settings, onAddAuditLog }) {
  const read = (key) => settings.find((item) => item.key === key)?.value || '';
  const [theme, setTheme] = useState(() => read('default_theme'));
  const [email, setEmail] = useState(() => read('saas_notification_email'));
  const save = useAsyncAction(async () => {
    if (!['light', 'dark'].includes(theme)) throw { status: 400 };
    return unwrap(await supabase.from('system_settings').upsert([
      { key: 'default_theme', value: theme },
      { key: 'saas_notification_email', value: email.trim() },
    ]));
  });
  const submit = async (event) => {
    event.preventDefault();
    const result = await save.run();
    if (!result.ok) return;
    try { localStorage.setItem('default_theme', theme); } catch { /* almacenamiento opcional */ }
    sileo.success({ title: 'Preferencias guardadas', description: 'Se actualizaron el tema y el correo de referencia.' });
    if (onAddAuditLog) await onAddAuditLog('Config', 'Preferencias generales actualizadas.');
  };

  return (
    <form className="saas-panel-card" onSubmit={submit} aria-busy={save.pending}>
      <div className="saas-panel-title">
        <h3>Preferencias generales</h3>
        <p>El tema se aplica al iniciar sesión. El correo se guarda como referencia; no activa el envío de notificaciones.</p>
      </div>
      {save.error && <ErrorState compact error={save.error} title="No se pudo confirmar el guardado" />}
      <fieldset disabled={save.pending} style={{ border: 0, padding: 0, margin: '20px 0' }}>
        <div className="saas-grid-2">
          <div className="saas-form-group">
            <label className="saas-label" htmlFor="platform-email">Correo de referencia</label>
            <input id="platform-email" type="email" className="saas-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="saas-form-group">
            <label className="saas-label" htmlFor="platform-theme">Tema predeterminado</label>
            <select id="platform-theme" required className="saas-input saas-select" value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="" disabled>Seleccionar tema</option>
              <option value="light">Claro</option><option value="dark">Oscuro</option>
            </select>
          </div>
        </div>
      </fieldset>
      <button className="saas-btn saas-btn-primary" disabled={save.pending} type="submit">
        <ButtonLabel pending={save.pending}>Guardar preferencias</ButtonLabel>
      </button>
      <div style={{ marginTop: 24, color: 'var(--saas-text-muted)' }}>
        <p>Frecuencia de respaldo registrada: {read('backup_frequency') || 'Sin configurar'}.</p>
        <p>Modo de mantenimiento registrado: {read('maintenance_mode') || 'Sin configurar'}.</p>
        <p>Estos valores informativos no programan copias ni restringen el acceso. Su activación requiere una configuración operativa independiente.</p>
      </div>
    </form>
  );
}

export default function PlatformSettings({ onAddAuditLog }) {
  const query = useSupabaseQuery(async (signal) => unwrap(await supabase.from('system_settings').select('key, value').abortSignal(signal)), { key: 'platform-settings', isEmpty: () => false });
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div className="saas-panel-card">
        <div className="saas-panel-title"><h3>Respaldos de la plataforma</h3><p>Consulta la configuración y disponibilidad de copias de seguridad en el panel de Supabase. Esta vista no verifica su frecuencia ni retención.</p></div>
        <p>Para exportar registros de una clínica, abre su ficha y selecciona «Exportaciones». Las exportaciones no sustituyen un respaldo completo de la base de datos.</p>
      </div>
      <QueryState query={query} skeleton={<SkeletonCards count={2} />} errorTitle="No se pudieron cargar las preferencias">
        {(settings) => <SettingsForm settings={settings} onAddAuditLog={onAddAuditLog} />}
      </QueryState>
    </div>
  );
}
