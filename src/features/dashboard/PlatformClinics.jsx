import React, { useMemo, useState } from 'react';
import { Building2, Search, Plus, ArrowUpRight, Pause, Play, X, CircleCheck, CirclePause } from '../../components/icons';
import RemoteImage from '../../components/ui/RemoteImage';
import { EmptyState } from '../../components/ui/Loading';

const PAGE_SIZE = 10;
const statusLabel = status => ({ active: 'Activa', suspended: 'Suspendida' }[status] || 'Sin estado definido');

export default function PlatformClinics({
  clinics = [],
  onNavigateToClinic,
  onToggleClinicStatus,
  onCreateClinicClick,
  pendingClinicId,
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const stats = useMemo(() => ({
    total: clinics.length,
    active: clinics.filter(clinic => clinic.status === 'active').length,
    suspended: clinics.filter(clinic => clinic.status === 'suspended').length,
  }), [clinics]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return clinics.filter(clinic => (
      (status === 'all' || clinic.status === status)
      && [clinic.nombre, clinic.direccion, clinic.email].some(value => (
        String(value || '').toLocaleLowerCase('es').includes(term)
      ))
    ));
  }, [clinics, search, status]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const reset = () => {
    setSearch('');
    setStatus('all');
    setPage(1);
  };

  return (
    <section className="sd-directory">
      <div className="sd-section-heading">
        <div>
          <span className="sd-eyebrow">Directorio</span>
          <h2>Clínicas, en perspectiva.</h2>
          <p>Consulta sus datos, administra el equipo y revisa su actividad.</p>
        </div>
        <button className="saas-btn saas-btn-primary" onClick={onCreateClinicClick}>
          <Plus size={17} aria-hidden="true" />Nueva clínica
        </button>
      </div>

      <div className="sd-admin-metrics">
        {[
          [Building2, stats.total, 'Clínicas registradas'],
          [CircleCheck, stats.active, 'Activas'],
          [CirclePause, stats.suspended, 'Suspendidas'],
        ].map(([Icon, value, label]) => (
          <div className="sd-admin-metric" key={label}>
            <div className="sd-metric-top"><span>{label}</span><Icon size={18} aria-hidden="true" /></div><strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="saas-panel-card sd-directory-panel">
        <div className="sd-panel-intro"><div><span className="sd-eyebrow">Clínicas</span><h3>Tu directorio</h3></div><span className="sd-count-tag">{clinics.length} registradas</span></div>
        <div className="sd-directory-tools">
          <div className="sd-search">
            <Search size={18} aria-hidden="true" />
            <label className="sd-sr-only" htmlFor="clinic-search">Buscar por nombre, dirección o correo</label>
            <input
              id="clinic-search"
              className="saas-input"
              type="search"
              value={search}
              placeholder="Buscar una clínica…"
              onChange={event => { setSearch(event.target.value); setPage(1); }}
            />
            {search && (
              <button type="button" aria-label="Limpiar búsqueda" onClick={() => { setSearch(''); setPage(1); }}>
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="liquid-glass-filter-pills" role="group" aria-label="Estado de las clínicas">
            {[
              ['all', 'Todas', stats.total],
              ['active', 'Activas', stats.active],
              ['suspended', 'Suspendidas', stats.suspended],
            ].map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                className={`liquid-glass-filter-btn ${status === value ? 'active' : ''}`}
                aria-pressed={status === value}
                onClick={() => { setStatus(value); setPage(1); }}
              >
                {label} <span>{count}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="sd-results" role="status">
          {filtered.length} {filtered.length === 1 ? 'clínica encontrada' : 'clínicas encontradas'}
        </p>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={clinics.length ? 'Sin coincidencias' : 'Tu directorio está vacío'}
            description={clinics.length
              ? 'Prueba otra búsqueda o cambia el estado seleccionado.'
              : 'Las clínicas que registres aparecerán aquí.'}
            action={(search || status !== 'all') ? (
              <button className="saas-btn saas-btn-secondary" onClick={reset}>Restablecer filtros</button>
            ) : (
              <button className="saas-btn saas-btn-secondary" onClick={onCreateClinicClick}>Registrar una clínica</button>
            )}
          />
        ) : (
          <>
            <div
              className="saas-table-container"
              tabIndex={0}
              role="region"
              aria-label="Directorio de clínicas; desplaza horizontalmente para ver todas las columnas"
            >
              <table className="saas-table">
                <caption className="sd-sr-only">Clínicas registradas</caption>
                <thead>
                  <tr>
                    {['Clínica', 'Contacto', 'Plan', 'Estado', 'Acciones'].map(label => (
                      <th key={label} scope="col" className="saas-th">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(start, start + PAGE_SIZE).map(clinic => (
                    <tr key={clinic.id} className="saas-tr">
                      <td className="saas-td">
                        <div className="sd-clinic-identity">
                          <RemoteImage
                            className="sd-clinic-icon"
                            src={clinic.logo_url}
                            alt=""
                            fallback={<Building2 size={20} aria-hidden="true" />}
                          />
                          <div>
                            <strong>{clinic.nombre}</strong>
                            <small>{clinic.direccion || 'Sin dirección registrada'}</small>
                          </div>
                        </div>
                      </td>
                      <td className="saas-td">
                        <span className="sd-wrap">{clinic.email || 'Sin correo registrado'}</span>
                        <small className="sd-secondary">{clinic.telefono || 'Sin teléfono registrado'}</small>
                      </td>
                      <td className="saas-td">
                        {clinic.plan === 'pro' ? 'Pro' : clinic.plan === 'basico' ? 'Básico' : clinic.plan || 'Sin plan'}
                      </td>
                      <td className="saas-td">
                        <span className={`saas-pill ${clinic.status}`}>{statusLabel(clinic.status)}</span>
                      </td>
                      <td className="saas-td">
                        <div className="sd-row-actions">
                          <button
                            className="saas-btn saas-btn-secondary"
                            aria-label={`Administrar ${clinic.nombre}`}
                            onClick={() => onNavigateToClinic(clinic.id)}
                          >
                            Administrar<ArrowUpRight size={15} aria-hidden="true" />
                          </button>
                          <button
                            className="saas-btn saas-btn-secondary"
                            disabled={pendingClinicId != null}
                            aria-label={`${clinic.status === 'active' ? 'Suspender' : 'Activar'} ${clinic.nombre}`}
                            title={clinic.status === 'active' ? 'Suspender clínica' : 'Activar clínica'}
                            onClick={() => onToggleClinicStatus(clinic)}
                          >
                            {clinic.status === 'active' ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className="sd-pagination" aria-label="Páginas del directorio">
              <span>{start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} de {filtered.length}</span>
              <div>
                <button className="saas-btn saas-btn-secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button>
                <span aria-live="polite">{currentPage} / {pageCount}</span>
                <button className="saas-btn saas-btn-secondary" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Siguiente</button>
              </div>
            </nav>
          </>
        )}
      </div>
    </section>
  );
}
