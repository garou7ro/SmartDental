import Dialog from '../../components/ui/Dialog';
import React, { useState, useEffect } from 'react';

export default function EditClinicModal({ isOpen, onClose, clinic, onEditClinic, editLoading }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('basico');

  useEffect(() => {
    if (clinic) {
      setName(clinic.nombre || '');
      setAddress(clinic.direccion || '');
      
      let loadedNum = clinic.telefono || '';
      if (loadedNum.startsWith('+51')) {
        loadedNum = loadedNum.slice(3);
      } else if (loadedNum.startsWith('51') && loadedNum.length > 9) {
        loadedNum = loadedNum.slice(2);
      }
      setPhone(loadedNum);
      setEmail(clinic.email || '');
      setPlan(clinic.plan || 'basico');
    }
  }, [clinic]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editLoading || !name.trim()) return;
    let finalPhone = phone.trim();
    if (finalPhone) {
      const cleanDigits = finalPhone.replace(/\D/g, '');
      if (cleanDigits.startsWith('51') && cleanDigits.length > 9) {
        finalPhone = `+${cleanDigits}`;
      } else {
        finalPhone = `+51${cleanDigits}`;
      }
    }

    onEditClinic({
      nombre: name.trim(),
      direccion: address.trim(),
      telefono: finalPhone || null,
      email: email.trim(),
      plan: plan
    });
  };

  if (!isOpen || !clinic) return null;

  return (
    <Dialog onClose={onClose} busy={editLoading} label="Editar clínica">
      <div 
        className="saas-modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="saas-modal-header">
          <div>
            <h3>Modificar Datos de la Clínica</h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--saas-text-muted)' }}>
              Actualiza la información institucional y la suscripción de esta sede.
            </p>
          </div>
          <button className="saas-modal-close" disabled={editLoading} onClick={onClose} aria-label="Cerrar modal">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="saas-form-group" style={{ marginBottom: 0 }}>
              <label className="saas-label" htmlFor="editclinicmodal1">Nombre de la Clínica *</label>
              <input id="editclinicmodal1" 
                type="text" 
                className="saas-input" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                disabled={editLoading} 
              />
            </div>

            <div className="saas-form-group" style={{ marginBottom: 0 }}>
              <label className="saas-label" htmlFor="editclinicmodal2">Correo Electrónico de Contacto</label>
              <input id="editclinicmodal2" 
                type="email" 
                className="saas-input" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                disabled={editLoading} 
              />
            </div>

            <div className="saas-form-group" style={{ marginBottom: 0 }}>
              <label className="saas-label" htmlFor="editclinicmodal3">Dirección</label>
              <input id="editclinicmodal3" 
                type="text" 
                className="saas-input" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                disabled={editLoading} 
              />
            </div>

            <div className="saas-form-group" style={{ marginBottom: 0 }}>
              <label className="saas-label" htmlFor="editclinicmodal4">Teléfono</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ padding: '9px 12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--saas-border)', borderRadius: '10px', fontSize: '0.84rem', color: 'var(--saas-text-muted)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  +51
                </span>
                <input id="editclinicmodal4" 
                  type="tel" 
                  className="saas-input" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} 
                  placeholder="987654321"
                  maxLength={9}
                  pattern="[0-9]{9}"
                  title="Ingresa los 9 dígitos del teléfono"
                  inputMode="numeric"
                  disabled={editLoading} 
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div className="saas-form-group" style={{ marginBottom: 0 }}>
              <span className="saas-label" id="edit-clinic-plan-label">Plan comercial *</span>
              <div className="sd-plan-options" role="group" aria-labelledby="edit-clinic-plan-label">
                <button type="button" disabled={editLoading} aria-pressed={plan === 'basico'}
                  onClick={() => setPlan('basico')}
                  style={{
                    padding: '12px',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    border: plan === 'basico' ? '2px solid var(--primary)' : '1px solid var(--saas-border)',
                    background: plan === 'basico' ? 'linear-gradient(135deg, rgba(0,242,254,0.08) 0%, rgba(30,123,255,0.04) 100%)' : 'var(--saas-card)',
                    transition: 'border-color 160ms ease, background-color 160ms ease'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--saas-text)' }}>Básico</div>
                  <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--saas-accent)', marginTop: '2px' }}>S/ 70 /mes</div>
                  <span style={{ fontSize: '0.70rem', color: 'var(--saas-text-muted)', display: 'block', marginTop: '4px' }}>Hasta 3 empleados</span>
                </button>

                <button type="button" disabled={editLoading} aria-pressed={plan === 'pro'}
                  onClick={() => setPlan('pro')}
                  style={{
                    padding: '12px',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    border: plan === 'pro' ? '2px solid var(--primary)' : '1px solid var(--saas-border)',
                    background: plan === 'pro' ? 'linear-gradient(135deg, rgba(185,166,255,0.12) 0%, rgba(143,227,238,0.08) 100%)' : 'var(--saas-card)',
                    transition: 'border-color 160ms ease, background-color 160ms ease'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--saas-text)' }}>Pro</div>
                  <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--saas-accent)', marginTop: '2px' }}>S/ 100 /mes</div>
                  <span style={{ fontSize: '0.70rem', color: 'var(--saas-text-muted)', display: 'block', marginTop: '4px' }}>Hasta 8 empleados</span>
                </button>
              </div>
            </div>
          </div>

          <div className="saas-modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="saas-btn saas-btn-secondary press-feedback" onClick={onClose} disabled={editLoading}>
              Cancelar
            </button>
            <button type="submit" className="saas-btn saas-btn-primary press-feedback" disabled={editLoading}>
              {editLoading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
