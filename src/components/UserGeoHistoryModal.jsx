// src/components/UserGeoHistoryModal.jsx
// Modal de Historial Cronológico de Geolocalización y Conexiones de un Colaborador

import React, { useState, useEffect } from 'react';
import { Globe, X, Clock, ShieldCheck, MapPin, Laptop, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import { getUserGeoAuditHistory } from '../services/auditService';

export default function UserGeoHistoryModal({ isOpen, onClose, userEmail, userName, userRole, userSede }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !userEmail) return;

    let active = true;
    async function load() {
      setLoading(true);
      try {
        const logs = await getUserGeoAuditHistory(userEmail);
        if (active) setHistory(logs);
      } catch (err) {
        console.error('Error cargando historial geo:', err);
        if (active) setHistory([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [isOpen, userEmail]);

  if (!isOpen) return null;

  // Estadísticas del historial
  const uniqueCountries = Array.from(new Set(history.map(h => h.country || 'Perú'))).filter(Boolean);
  const uniqueCities = Array.from(new Set(history.map(h => h.city || 'Lima'))).filter(Boolean);
  const uniqueIps = Array.from(new Set(history.map(h => h.ip || 'Local'))).filter(Boolean);

  const formatDate = (iso) => {
    if (!iso) return 'Fecha no registrada';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '750px',
          maxHeight: '85vh',
          borderRadius: '14px',
          border: '1px solid rgba(251, 191, 36, 0.35)',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(24, 33, 47, 0.98))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(251, 191, 36, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🌍</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--crear-gold)', fontWeight: 800 }}>
                Historial Geográfico de Conexiones
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {userName || 'Colaborador'} &bull; <span style={{ color: '#fff' }}>{userEmail}</span> ({userRole || 'Rol'} - {userSede || 'Sede'})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* RESUMEN DE UBICACIONES */}
        <div style={{
          padding: '1rem 1.5rem',
          background: 'rgba(0, 0, 0, 0.25)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Conexiones</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>{history.length}</div>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Países Detectados</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399' }}>
              {uniqueCountries.join(', ') || 'Perú'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ciudades</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8' }}>
              {uniqueCities.slice(0, 3).join(', ') || 'Lima'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>IPs Auditadas</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#c084fc' }}>{uniqueIps.length}</div>
          </div>
        </div>

        {/* LISTA / HISTORIAL CRONOLÓGICO */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={28} className="animate-spin" color="var(--crear-gold)" style={{ margin: '0 auto 0.75rem' }} />
              <div>Cargando historial inmutable de Firestore...</div>
            </div>
          ) : history.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <AlertTriangle size={32} color="#f59e0b" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 600, color: '#fff' }}>Sin conexiones auditadas registradas</div>
              <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                Este usuario aún no tiene eventos recientes de inicio de sesión o actividad registrada en Firestore.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {history.map((h, idx) => {
                const flag = h.flag || '🇵🇪';
                const city = h.city || 'Lima';
                const country = h.country || 'Perú';
                const ip = h.ip || 'No registrada';
                const device = h.device || h.userAgent || 'Navegador Web';
                const action = h.action || 'ACCESO';

                const actionBadgeColor = action === 'LOGIN' 
                  ? '#10b981' 
                  : (action.includes('MODULO') ? '#38bdf8' : (action === 'LOGOUT' ? '#ef4444' : 'var(--crear-gold)'));

                return (
                  <div
                    key={h.id || idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.6rem' }}>{flag}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                            {city}, {country}
                          </span>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: actionBadgeColor
                          }}>
                            {action}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>IP: {ip}</span>
                          <span>&bull;</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Laptop size={12} /> {device}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>
                        {formatDate(h.timestamp)}
                      </div>
                      {h.details && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {h.details}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '0.85rem 1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.3)'
        }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            🔒 Registros protegidos criptográficamente en Firestore audit_logs
          </span>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '0.4rem 1rem', fontSize: '0.82rem' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
