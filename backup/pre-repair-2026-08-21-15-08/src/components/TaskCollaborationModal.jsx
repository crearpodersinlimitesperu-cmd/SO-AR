import React, { useState } from 'react';
import { usersData, normalizeRole } from '../data/usersData';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Users, Send, X, AtSign, CheckCircle2, Shield } from 'lucide-react';

export default function TaskCollaborationModal({ isOpen, onClose, task, onSendInvitation }) {
  if (!isOpen || !task) return null;

  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const userRole = normalizeRole(currentUser?.appRole);
  const isGerenteOrAdmin = currentUser?.isGerente || currentUser?.isSuperAdmin || userRole === 'gerente';
  const isCMJ = userRole === 'coord_maestria';
  const isCC1 = userRole === 'coord_c1';

  // Filtrado de usuarios según permisos de mención
  // Gerentes: pueden mencionar a cualquier persona de su sede o global
  // CMJ y CC1Y2: pueden mencionar a cualquier persona de la oficina/sede
  const eligibleUsers = usersData.filter(u => {
    if (u.email === currentUser?.email) return false;
    
    // Si ya está colaborando en esta tarea, excluir
    if (task.collaborators && task.collaborators.includes(u.email)) return false;

    if (isGerenteOrAdmin) {
      // Gerente puede invitar a cualquiera de su sede o global
      return true;
    }

    if (isCMJ || isCC1) {
      // CMJ / CC1Y2 pueden invitar a cualquier persona de la oficina/sede
      const sameSede = !u.sede || !currentUser?.sede || u.sede.toLowerCase() === currentUser.sede.toLowerCase();
      return sameSede;
    }

    // Otros roles: misma sede
    return !u.sede || !currentUser?.sede || u.sede.toLowerCase() === currentUser.sede.toLowerCase();
  }).filter(u => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term)) ||
      (u.sede && u.sede.toLowerCase().includes(term))
    );
  });

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      showToast("Por favor selecciona a un compañero para invitarlo.", "error");
      return;
    }

    setIsSending(true);
    try {
      await onSendInvitation(task, selectedUser, message);
      onClose();
    } catch (err) {
      console.error(err);
      showToast("Error al enviar la invitación.", "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '560px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2rem',
        border: '1px solid rgba(0, 210, 255, 0.3)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 210, 255, 0.15)',
        position: 'relative'
      }}>
        {/* BOTÓN CERRAR */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <AtSign size={28} color="var(--crear-blue)" />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#ffffff' }}>
              Mencionar e Invitar a Colaborar
            </h2>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              {isGerenteOrAdmin ? '👑 Vista Gerencial: Invita a cualquier miembro a tu cargo' : '🤝 Invita a un compañero de oficina para compartir esta tarea'}
            </p>
          </div>
        </div>

        {/* DETALLE DE LA TAREA */}
        <div style={{
          background: 'rgba(0, 210, 255, 0.05)',
          border: '1px solid rgba(0, 210, 255, 0.2)',
          borderRadius: '8px',
          padding: '0.8rem',
          margin: '1rem 0'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--crear-blue)', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Tarea a Compartir:
          </span>
          <div style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '0.95rem', marginTop: '0.2rem' }}>
            {task.task || task.title}
          </div>
        </div>

        {/* BUSCADOR DE COMPAÑEROS */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            Buscar persona por nombre, rol o sede:
          </label>
          <input
            type="text"
            placeholder="Ej: Pauly, Juanfer, Coordinador, Lima..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* LISTADO DE USUARIOS ELIGIBLES */}
        <div style={{
          maxHeight: '180px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          marginBottom: '1rem',
          paddingRight: '4px'
        }}>
          {eligibleUsers.length === 0 ? (
            <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center', margin: '1rem 0' }}>
              No se encontraron personas con ese criterio.
            </p>
          ) : (
            eligibleUsers.map(u => {
              const isSelected = selectedUser?.email === u.email;
              const roleNorm = normalizeRole(u.role);
              const isCoord = roleNorm === 'coord_c1' || roleNorm === 'coord_maestria';

              return (
                <div
                  key={u.email}
                  onClick={() => setSelectedUser(u)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '6px',
                    background: isSelected ? 'rgba(0, 210, 255, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isSelected ? 'var(--crear-blue)' : 'rgba(255, 255, 255, 0.06)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', color: isSelected ? 'var(--crear-blue)' : '#ffffff', fontSize: '0.85rem' }}>
                      @{u.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: isCoord ? 'var(--crear-gold)' : 'var(--text-muted)' }}>
                      {u.role?.replace(/_/g, ' ')} • {u.sede || 'Global'} ({u.email})
                    </div>
                  </div>

                  {isSelected && <CheckCircle2 size={16} color="var(--crear-blue)" />}
                </div>
              );
            })
          )}
        </div>

        {/* MENSAJE PERSONALIZADO */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            Mensaje o Instrucción (Opcional):
          </label>
          <textarea
            rows="2"
            placeholder="Ej: Te invito a colaborar en el montaje de la sala y checklist de luces."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '0.85rem',
              resize: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* ACCIONES */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '0.5rem 1rem' }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || !selectedUser}
            className="btn-neon-action"
            style={{ padding: '0.5rem 1.4rem' }}
          >
            <Send size={14} />
            <span>{isSending ? 'Enviando...' : 'Invitar a Colaborar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
