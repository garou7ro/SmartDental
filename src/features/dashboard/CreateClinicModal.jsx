import Dialog from '../../components/ui/Dialog';
import React, { useState, useRef } from 'react';
import { sileo } from 'sileo';

export default function CreateClinicModal({ isOpen, onClose, onCreateClinic, createLoading }) {
  const [clinicName, setClinicName] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicPlan, setClinicPlan] = useState('basico');
  const [clinicLogo, setClinicLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleLogoChange = (e) => {
    if (createLoading) return;
    const file = e.target.files[0];
    if (file) {
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
        sileo.warning({ title: 'Formato no compatible', description: 'Selecciona una imagen PNG, JPG, WebP o SVG.' });
        e.target.value = '';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        sileo.warning({ title: 'Archivo muy grande', description: 'El logo no debe superar los 2MB.' });
        e.target.value = '';
        return;
      }
      setClinicLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = (e) => {
    e.stopPropagation();
    setClinicLogo(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (createLoading) return;
    if (!clinicName.trim()) {
      sileo.warning({ title: 'Campo Requerido', description: 'El nombre de la clínica es obligatorio.' });
      return;
    }
    if (!clinicEmail.trim()) {
      sileo.warning({ title: 'Campo Requerido', description: 'El correo electrónico de contacto es obligatorio.' });
      return;
    }
    if (!ownerName.trim()) {
      sileo.warning({ title: 'Campo Requerido', description: 'El nombre del propietario es obligatorio.' });
      return;
    }

    let finalPhone = clinicPhone.trim();
    if (finalPhone) {
      const cleanDigits = finalPhone.replace(/\D/g, '');
      if (cleanDigits.startsWith('51') && cleanDigits.length > 9) {
        finalPhone = `+${cleanDigits}`;
      } else {
        finalPhone = `+51${cleanDigits}`;
      }
    }

    onCreateClinic({
      nombre: clinicName.trim(),
      email: clinicEmail.trim(),
      nombre_propietario: ownerName.trim(),
      direccion: clinicAddress.trim() || null,
      telefono: finalPhone || null,
      plan: clinicPlan,
      logo: clinicLogo
    });

  };

  if (!isOpen) return null;

  return (
    <Dialog onClose={onClose} busy={createLoading} label="Registrar clínica">
      <div 
        className="saas-modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="saas-modal-header">
          <div>
            <h3>Alta de Nueva Clínica</h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--saas-text-muted)' }}>
              Registra la clínica y crea su cuenta de administrador.
            </p>
          </div>
          <button className="saas-modal-close" disabled={createLoading} onClick={onClose} aria-label="Cerrar modal">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="saas-form-group" style={{ marginBottom: 0 }}>
              <label className="saas-label" htmlFor="clinic-name">Nombre de la Clínica Dental *</label>
              <input
                type="text"
                id="clinic-name"
                className="saas-input"
                placeholder="Ej: Clínica Dental San Carlos"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                disabled={createLoading}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div className="saas-form-group" style={{ marginBottom: 0 }}>
                <label className="saas-label" htmlFor="owner-name">Nombre del Propietario / Director *</label>
                <input
                  type="text"
                  id="owner-name"
                  className="saas-input"
                  placeholder="Ej: Dr. Carlos Mendizábal"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  disabled={createLoading}
                  required
                />
              </div>

              <div className="saas-form-group" style={{ marginBottom: 0 }}>
                <label className="saas-label" htmlFor="clinic-email">Correo Electrónico (Acceso Admin) *</label>
                <input
                  type="email"
                  id="clinic-email"
                  className="saas-input"
                  placeholder="admin@clinicadental.com"
                  value={clinicEmail}
                  onChange={(e) => setClinicEmail(e.target.value)}
                  disabled={createLoading}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div className="saas-form-group" style={{ marginBottom: 0 }}>
                <label className="saas-label" htmlFor="clinic-address">Dirección Física</label>
                <input
                  type="text"
                  id="clinic-address"
                  className="saas-input"
                  placeholder="Av. Los Fresnos 450, Lima"
                  value={clinicAddress}
                  onChange={(e) => setClinicAddress(e.target.value)}
                  disabled={createLoading}
                />
              </div>

              <div className="saas-form-group" style={{ marginBottom: 0 }}>
                <label className="saas-label" htmlFor="clinic-phone">Teléfono de Contacto (WhatsApp)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ padding: '9px 12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--saas-border)', borderRadius: '10px', fontSize: '0.84rem', color: 'var(--saas-text-muted)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    +51
                  </span>
                  <input
                    type="tel"
                    id="clinic-phone"
                    className="saas-input"
                    placeholder="987654321"
                    value={clinicPhone}
                    onChange={(e) => setClinicPhone(e.target.value.replace(/\D/g, ''))}
                    maxLength={9}
                    pattern="[0-9]{9}"
                    title="Ingresa los 9 dígitos del teléfono"
                    inputMode="numeric"
                    disabled={createLoading}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>

            {/* Plan Selector with Cards */}
            <div className="saas-form-group" style={{ marginBottom: 0 }}>
              <span className="saas-label" id="create-clinic-plan-label">Plan comercial *</span>
              <div className="sd-plan-options" role="group" aria-labelledby="create-clinic-plan-label">
                <button type="button" disabled={createLoading} aria-pressed={clinicPlan === 'basico'}
                  onClick={() => setClinicPlan('basico')}
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    border: clinicPlan === 'basico' ? '2px solid var(--primary)' : '1px solid var(--saas-border)',
                    background: clinicPlan === 'basico' ? 'linear-gradient(135deg, rgba(0,242,254,0.08) 0%, rgba(30,123,255,0.04) 100%)' : 'var(--saas-card)',
                    boxShadow: clinicPlan === 'basico' ? '0 4px 16px -4px rgba(0,242,254,0.2)' : 'none',
                    transition: 'border-color 160ms ease, background-color 160ms ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--saas-text)' }}>SmartDental Básico</span>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--saas-accent)' }}>S/ 70 /mes</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.74rem', color: 'var(--saas-text-muted)', lineHeight: 1.5 }}>
                    <li>Hasta 3 empleados staff</li>
                    <li>Gestión de pacientes</li>
                    <li>Agenda, odontograma y fichas</li>
                  </ul>
                </button>

                <button type="button" disabled={createLoading} aria-pressed={clinicPlan === 'pro'}
                  onClick={() => setClinicPlan('pro')}
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    border: clinicPlan === 'pro' ? '2px solid var(--primary)' : '1px solid var(--saas-border)',
                    background: clinicPlan === 'pro' ? 'linear-gradient(135deg, rgba(185,166,255,0.12) 0%, rgba(143,227,238,0.08) 100%)' : 'var(--saas-card)',
                    boxShadow: clinicPlan === 'pro' ? '0 4px 16px -4px rgba(185,166,255,0.3)' : 'none',
                    transition: 'border-color 160ms ease, background-color 160ms ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--saas-text)' }}>SmartDental Pro</span>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--saas-accent)' }}>S/ 100 /mes</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.74rem', color: 'var(--saas-text-muted)', lineHeight: 1.5 }}>
                    <li>Hasta 8 empleados staff</li>
                    <li>Gestión de pacientes</li>
                    <li>Agenda, odontograma y fichas</li>
                  </ul>
                </button>
              </div>
            </div>

            {/* Logo Upload Dropzone */}
            <div className="saas-form-group" style={{ marginBottom: 0 }}>
              <label className="saas-label" htmlFor="createclinicmodal1">Logotipo de la Clínica</label>
              <div 
                className="logo-upload-zone sd-logo-upload"
                style={{ padding: '16px', borderRadius: '16px', border: '1px dashed var(--saas-border)', textAlign: 'center', background: 'rgba(255,255,255,0.02)', transition: 'border-color 0.16s ease' }}
              >
                {logoPreview ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
                    <img src={logoPreview} alt="Vista previa del logotipo" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--saas-border)' }} />
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--saas-text)', display: 'block' }}>{clinicLogo?.name}</span>
                      <button 
                        type="button" 
                        disabled={createLoading} onClick={removeLogo}
                        style={{ fontSize: '0.72rem', color: 'var(--saas-error)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px' }}
                      >
                        Quitar logotipo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto 6px auto', color: 'var(--saas-text-muted)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: 'var(--saas-text)' }}>Seleccionar archivo de imagen</p>
                    <span style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)' }}>PNG, JPG, WebP o SVG (máx. 2MB)</span>
                  </div>
                )}
                <input id="createclinicmodal1"
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  disabled={createLoading}
                  onChange={handleLogoChange}
                  className="saas-input"
                />
              </div>
            </div>
          </div>

          <div className="saas-modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="saas-btn saas-btn-secondary press-feedback" onClick={onClose} disabled={createLoading}>
              Cancelar
            </button>
            <button type="submit" className="saas-btn saas-btn-primary press-feedback" disabled={createLoading}>
              {createLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="spinner" style={{ width: '14px', height: '14px' }} />
                  <span>Creando clínica...</span>
                </div>
              ) : (
                'Registrar Clínica'
              )}
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
