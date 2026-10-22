import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { sileo } from 'sileo';
import { collectClinicExport, exportCsv, validateClinicExport } from '../../lib/clinicExport';
import { withTimeout } from '../../lib/supabaseErrors';

export default function ClinicDetailBackups({ clinicId, clinicName }) {
  const [exportModules, setExportModules] = useState({
    patients: true,
    appointments: true,
    inventory: true,
    finances: true,
    staff: true
  });
  const [exportFormat, setExportFormat] = useState('json');
  const [csvModule, setCsvModule] = useState('patients');
  const [exportLoading, setExportLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleExportData = async (e) => {
    e.preventDefault();
    setExportLoading(true);
    const toastId = sileo.show({ type: 'loading', title: 'Exportando Datos', description: 'Consolidando base de datos...' });

    try {
      const controller = new AbortController();
      let exportPayload;
      try {
        exportPayload = await withTimeout(collectClinicExport(supabase, {
          clinicId, clinicName,
          modules: exportFormat === 'csv' ? { [csvModule]: true } : exportModules,
          signal: controller.signal,
        }), 60000);
      } finally {
        controller.abort();
      }
      const content = exportFormat === 'csv' ? exportCsv(exportPayload, csvModule) : JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([content], { type: exportFormat === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const name = (clinicName || 'clinica').replace(/[^\p{L}\p{N}_-]+/gu, '_');
      link.download = `exportacion_${name}_${Date.now()}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      sileo.dismiss(toastId);

      sileo.success({ title: 'Exportación Completada', description: 'El archivo de respaldo fue generado.' });
    } catch (err) {
      sileo.dismiss(toastId);
      sileo.error({ title: 'Error en Exportación', description: err.message || 'No se pudieron exportar los datos.' });
    } finally {
      setExportLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        sileo.warning({ title: 'Formato no admitido', description: 'Solo se admiten respaldos en formato JSON.' });
        return;
      }
      setRestoreFile(file);
    }
  };

  const handleRestoreSubmit = async (e) => {
    e.preventDefault();
    if (!restoreFile) return;

    setRestoreLoading(true);
    const toastId = sileo.show({ type: 'loading', title: 'Verificando archivo', description: 'Leyendo estructura JSON...' });

    try {
      const parsed = JSON.parse(await restoreFile.text());
      const count = validateClinicExport(parsed, clinicId);
      sileo.dismiss(toastId);
      sileo.success({ title: 'Estructura verificada', description: `${count} registros reconocidos. No se importaron datos.` });
      setRestoreFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      sileo.dismiss(toastId);
      sileo.error({ title: 'Error de verificación', description: err.message });
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div className="saas-grid-2">
        {/* Export Panel */}
        <div className="saas-panel-card">
          <div className="saas-panel-header">
            <div className="saas-panel-title">
              <h3>Exportación & Descarga de Datos</h3>
              <p>Descarga los registros de los módulos seleccionados, sin contraseñas ni credenciales.</p>
            </div>
          </div>

          <form onSubmit={handleExportData} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span className="saas-label">Módulos para exportar en JSON:</span>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { key: 'patients', label: 'Pacientes · datos de contacto' },
                { key: 'appointments', label: 'Agenda & Citas' },
                { key: 'inventory', label: 'Inventario' },
                { key: 'finances', label: 'Caja & Transacciones' },
                { key: 'staff', label: 'Datos de personal' },
              ].map(mod => (
                <label 
                  key={mod.key} 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--saas-text)', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--saas-border)', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={exportModules[mod.key]}
                    disabled={exportFormat === 'csv' || exportLoading}
                    onChange={(e) => setExportModules({ ...exportModules, [mod.key]: e.target.checked })}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>{mod.label}</span>
                </label>
              ))}
            </div>

            <div style={{ marginTop: '8px' }}>
              <span className="saas-label">Formato de Descarga:</span>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className={`saas-btn ${exportFormat === 'json' ? 'saas-btn-primary' : 'saas-btn-secondary'} press-feedback`}
                  style={{ padding: '6px 16px', fontSize: '0.80rem' }}
                  onClick={() => setExportFormat('json')}
                >
                  JSON (Módulos seleccionados)
                </button>
                <button
                  type="button"
                  className={`saas-btn ${exportFormat === 'csv' ? 'saas-btn-primary' : 'saas-btn-secondary'} press-feedback`}
                  style={{ padding: '6px 16px', fontSize: '0.80rem' }}
                  onClick={() => setExportFormat('csv')}
                >
                  CSV (Un módulo)
                </button>
              </div>
            </div>

            {exportFormat === 'csv' && (
              <label className="saas-label">Módulo para CSV
                <select className="saas-input" value={csvModule} onChange={(e) => setCsvModule(e.target.value)}>
                  {Object.entries({ patients: 'Pacientes', appointments: 'Citas', inventory: 'Inventario', finances: 'Transacciones', staff: 'Personal' }).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </label>
            )}
            <button 
              type="submit" 
              className="saas-btn saas-btn-primary press-feedback" 
              style={{ marginTop: '12px' }}
              disabled={exportLoading}
            >
              {exportLoading ? 'Generando descarga...' : 'Generar y descargar exportación'}
            </button>
          </form>
        </div>

        {/* Restore Panel */}
        <div className="saas-panel-card">
          <div className="saas-panel-header">
            <div className="saas-panel-title">
              <h3>Verificación de archivo</h3>
              <p>Comprueba la estructura y la clínica del archivo JSON. La importación no está disponible.</p>
            </div>
          </div>

          <form onSubmit={handleRestoreSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <button type="button" 
              style={{ padding: '24px 16px', borderRadius: '16px', border: '1px dashed var(--saas-border)', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto 8px auto', color: 'var(--saas-text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {restoreFile ? (
                <div>
                  <strong style={{ color: 'var(--saas-text)', fontSize: '0.88rem' }}>{restoreFile.name}</strong>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--saas-text-muted)', marginTop: '2px' }}>
                    {(restoreFile.size / 1024).toFixed(1)} KB — Clic para cambiar archivo
                  </span>
                </div>
              ) : (
                <div>
                  <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 600, color: 'var(--saas-text)' }}>Seleccionar archivo de respaldo</p>
                  <span style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)' }}>Solo archivos .json generados por SmartDental</span>
                </div>
              )}
            </button>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />


            <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.76rem', color: 'var(--saas-text)' }}>
              <strong>Solo verificación:</strong> Esta acción lee el archivo y no modifica los registros de la clínica.
            </div>

            <button 
              type="submit" 
              className="saas-btn saas-btn-secondary press-feedback" 
              disabled={!restoreFile || restoreLoading}
            >
              {restoreLoading ? 'Validando estructura...' : 'Validar Archivo de Respaldo'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
