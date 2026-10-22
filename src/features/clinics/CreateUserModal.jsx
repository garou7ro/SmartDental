import Dialog from '../../components/ui/Dialog';
import React, { useState } from 'react';

export default function CreateUserModal({ isOpen, onClose, onCreateUser, createLoading }) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [assistantRole, setAssistantRole] = useState('odontologo');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (createLoading || !email.trim() || !fullName.trim()) return;
    onCreateUser({
      email: email.trim(),
      role: 'assistant',
      nombre_completo: fullName.trim(),
      assistant_role: 'odontologo'
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog onClose={onClose} busy={createLoading} label="Registrar colaborador">
      <div 
        className="saas-modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px' }}
      >
        <div className="saas-modal-header">
          <div>
            <h3>Registrar odontólogo</h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--saas-text-muted)' }}>
              Crea el acceso de un odontólogo. La recepción está a cargo del administrador.
            </p>
          </div>
          <button className="saas-modal-close" disabled={createLoading} onClick={onClose} aria-label="Cerrar modal">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="saas-form-group" style={{ marginBottom: 0 }}>
              <label className="saas-label" htmlFor="createusermodal1">Nombre Completo *</label>
              <input id="createusermodal1" 
                type="text" 
                className="saas-input" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                required 
                disabled={createLoading} 
                placeholder="Ej: Dra. Valeria Morales"
              />
            </div>

            <div className="saas-form-group" style={{ marginBottom: 0 }}>
              <label className="saas-label" htmlFor="createusermodal2">Correo Electrónico (Usuario) *</label>
              <input id="createusermodal2" 
                type="email" 
                className="saas-input" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                disabled={createLoading} 
                placeholder="colaborador@clinicadental.com"
              />
            </div>

            <div className="saas-form-group" style={{ marginBottom: 0 }}>
              <span className="saas-label" id="create-staff-role">Función clínica *</span>
              <div className="sd-plan-options" role="group" aria-labelledby="create-staff-role">
                

                <button type="button" disabled={createLoading} aria-pressed={assistantRole === 'odontologo'}
                  onClick={() => setAssistantRole('odontologo')}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    border: assistantRole === 'odontologo' ? '2px solid var(--primary)' : '1px solid var(--saas-border)',
                    background: assistantRole === 'odontologo' ? 'rgba(0, 242, 254, 0.08)' : 'var(--saas-card)',
                    transition: 'border-color 160ms ease, background-color 160ms ease'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--saas-text)' }}>Odontólogo</div>
                  <span style={{ fontSize: '0.70rem', color: 'var(--saas-text-muted)', display: 'block', marginTop: '2px' }}>
                    Odontograma y citas asignadas
                  </span>
                </button>
              </div>
            </div>

            <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(0, 242, 254, 0.05)', border: '1px solid rgba(0, 242, 254, 0.15)', fontSize: '0.74rem', color: 'var(--saas-text-muted)' }}>
              ℹ️ Se generará una contraseña temporal automática para el colaborador.
            </div>
          </div>

          <div className="saas-modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="saas-btn saas-btn-secondary press-feedback" onClick={onClose} disabled={createLoading}>
              Cancelar
            </button>
            <button type="submit" className="saas-btn saas-btn-primary press-feedback" disabled={createLoading}>
              {createLoading ? 'Creando...' : 'Crear Colaborador'}
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
