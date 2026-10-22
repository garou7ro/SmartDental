import Dialog from '../../components/ui/Dialog';
import React, { useState, useEffect } from 'react';

export default function EditUserModal({ isOpen, onClose, user, onEditUser, editUserLoading }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('active');
  const [fullName, setFullName] = useState('');
  const [assistantRole, setAssistantRole] = useState('odontologo');

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setStatus(user.status || 'active');
      setFullName(user.nombre_completo || '');
      setAssistantRole(user.assistant_role || 'odontologo');
    }
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editUserLoading || !email.trim() || !fullName.trim()) return;
    onEditUser({
      email: email.trim(),
      status: status,
      nombre_completo: fullName.trim(),
      assistant_role: assistantRole
    });
  };

  if (!isOpen || !user) return null;

  return (
    <Dialog onClose={onClose} busy={editUserLoading} label="Editar colaborador">
      <div 
        className="saas-modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '480px' }}
      >
        <div className="saas-modal-header">
          <div>
            <h3>Modificar Acceso de Staff</h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--saas-text-muted)' }}>
              Actualiza el rol, correo o estado operativo de este usuario.
            </p>
          </div>
          <button className="saas-modal-close" disabled={editUserLoading} onClick={onClose} aria-label="Cerrar modal">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="saas-form-group" style={{ marginBottom: 0 }}>
              <label className="saas-label" htmlFor="editusermodal1">Nombre Completo *</label>
              <input id="editusermodal1" 
                type="text" 
                className="saas-input" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                required 
                disabled={editUserLoading} 
              />
            </div>

            <div className="saas-form-group" style={{ marginBottom: 0 }}>
              <label className="saas-label" htmlFor="editusermodal2">Correo Electrónico *</label>
              <input id="editusermodal2" 
                type="email" 
                className="saas-input" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                disabled={editUserLoading} 
              />
            </div>

            {user.role === 'assistant' && (
              <div className="saas-form-group" style={{ marginBottom: 0 }}>
                <span className="saas-label" id="edit-staff-role">Rol Clínico</span>
                <div className="sd-plan-options" role="group" aria-labelledby="edit-staff-role">
                  

                  <button type="button" disabled={editUserLoading} aria-pressed={assistantRole === 'odontologo'}
                    onClick={() => setAssistantRole('odontologo')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      border: assistantRole === 'odontologo' ? '2px solid var(--primary)' : '1px solid var(--saas-border)',
                      background: assistantRole === 'odontologo' ? 'rgba(0, 242, 254, 0.08)' : 'var(--saas-card)',
                      transition: 'border-color 160ms ease, background-color 160ms ease'
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--saas-text)' }}>Odontólogo</span>
                  </button>
                </div>
              </div>
            )}

            <div className="saas-form-group" style={{ marginBottom: 0 }}>
              <label className="saas-label" htmlFor="editusermodal3">Estado de la Cuenta</label>
              <select id="editusermodal3" 
                className="saas-input saas-select" 
                value={status} 
                onChange={(e) => setStatus(e.target.value)} 
                disabled={editUserLoading}
              >
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
              </select>
            </div>
          </div>

          <div className="saas-modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="saas-btn saas-btn-secondary press-feedback" onClick={onClose} disabled={editUserLoading}>
              Cancelar
            </button>
            <button type="submit" className="saas-btn saas-btn-primary press-feedback" disabled={editUserLoading}>
              {editUserLoading ? 'Guardando...' : 'Guardar Modificaciones'}
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
