import React from 'react';
import { MessageSquare, PhoneCall, ExternalLink } from 'lucide-react';
import { getEffectiveCommunicationChannel } from '../config/permissions';

/**
 * Botón de Comunicación Efectiva Oficial
 * Implementa la Fila 18 de la Matriz Oficial de Roles Causa OS:
 * - Directivos, Gerentes, Coords C1/C2, Coords MJ, Entrenadores: GOOGLE CHAT
 * - Quantum Team, Capitanes, Aliados, Managers: WHATSAPP
 */
export default function EffectiveCommunicationButton({ currentUser, style = {} }) {
  if (!currentUser) return null;

  const channel = getEffectiveCommunicationChannel(currentUser);
  const isGoogleChat = channel === 'GOOGLE_CHAT';

  const handleClick = () => {
    if (isGoogleChat) {
      window.open('https://mail.google.com/chat/u/0/', '_blank', 'noopener,noreferrer');
    } else {
      window.open('https://web.whatsapp.com/', '_blank', 'noopener,noreferrer');
    }
  };

  if (isGoogleChat) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="btn-secondary"
        title="Canal Oficial de Comunicación: Google Chat Corporativo (@crearpsl.net)"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.42rem 0.85rem',
          fontSize: '0.82rem',
          fontWeight: 700,
          background: 'rgba(0, 172, 193, 0.12)',
          color: '#26c6da',
          border: '1px solid rgba(38, 198, 218, 0.4)',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(0, 172, 193, 0.15)',
          ...style
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'rgba(0, 172, 193, 0.22)';
          e.currentTarget.style.boxShadow = '0 0 12px rgba(38, 198, 218, 0.4)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(0, 172, 193, 0.12)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 172, 193, 0.15)';
        }}
      >
        <MessageSquare size={15} color="#26c6da" />
        <span>Google Chat</span>
        <ExternalLink size={12} style={{ opacity: 0.7 }} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn-secondary"
      title="Canal Oficial de Comunicación: WhatsApp de Coordinación de Equipo"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.42rem 0.85rem',
        fontSize: '0.82rem',
        fontWeight: 700,
        background: 'rgba(37, 211, 102, 0.12)',
        color: '#25D366',
        border: '1px solid rgba(37, 211, 102, 0.4)',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(37, 211, 102, 0.15)',
        ...style
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = 'rgba(37, 211, 102, 0.22)';
        e.currentTarget.style.boxShadow = '0 0 12px rgba(37, 211, 102, 0.4)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = 'rgba(37, 211, 102, 0.12)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 211, 102, 0.15)';
      }}
    >
      <PhoneCall size={15} color="#25D366" />
      <span>WhatsApp</span>
      <ExternalLink size={12} style={{ opacity: 0.7 }} />
    </button>
  );
}
