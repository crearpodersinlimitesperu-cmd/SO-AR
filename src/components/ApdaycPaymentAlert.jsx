// src/components/ApdaycPaymentAlert.jsx
//
// Alerta URGENTE de Pago APDAYC exclusiva para José Sánchez (Gerente de Lima).
// Reglas de activación:
// 1. Alerta prioritaria: Mañana a las 9:00 AM (04/09/2026).
// 2. Alerta recurrente mensual: 3 días antes de finalizar cada mes.
// Estilo visual: "Color Arcoíris" (gradientes multicolores animados, brillo dinámico y alto impacto).
// Canales de acción: WhatsApp (+51 919 563 284), Correo Electrónico (jose.sanchez@crearpsl.net), Google Chat.

import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  CreditCard, 
  Clock, 
  MessageSquare, 
  Mail, 
  Copy, 
  CheckCircle, 
  ExternalLink, 
  X, 
  Building, 
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { openOrCreateDirectMessage } from '../services/googleChatService';

// Datos oficiales de APDAYC extraídos de facturación oficial de eventos Lima
const APDAYC_CONFIG = {
  entidad: "APDAYC (Asociación Peruana de Autores y Compositores)",
  ruc: "20100538203",
  oficina: "AGECOFER - MIRAFLORES",
  usuarioCodigo: "248509",
  razonSocial: "CREACION CUANTICA E.I.R.L.",
  rucEmpresa: "20612592811",
  local: "Hotel Jose Antonio Deluxe (Calle Bellavista 133, Miraflores, Lima)",
  concepto: "Comunicación Pública de Obras Musicales / Música Grabada - Eventos y Entrenamientos",
  responsable: "José Sánchez (Gerente de Sede Lima)",
  email: "jose.sanchez@crearpsl.net",
  telefonoWhatsApp: "51919563284",
  cuentas: [
    { banco: "BCP", tipo: "Cta. Cte. Soles", numero: "191 0046905 0 86", cci: "00219100004690508658" },
    { banco: "BBVA", tipo: "Cta. Cte. Soles", numero: "0011 0368 01 00002525", cci: "011 368 000100002525 82" },
    { banco: "Interbank", tipo: "Cta. Cte. Soles", numero: "200 3000831059", cci: "003 200 003000831059 38" },
    { banco: "Scotiabank", tipo: "Cta. Cte. Soles", numero: "000 4501799", cci: "009 04300000450179913" }
  ],
  portalComprobantes: "http://apdayc.ecomprobantes.pe/Apdayc/formularios/frmInicio.aspx"
};

// Evalúa si el usuario logueado es José Sánchez o Gerente de Lima
function isTargetGerenteLima(currentUser) {
  if (!currentUser) return false;
  const email = (currentUser.email || '').toLowerCase().trim();
  const sede = (currentUser.sede || '').toLowerCase().trim();
  const role = (currentUser.appRole || currentUser.role || '').toLowerCase().trim();
  
  const isJose = email === 'jose.sanchez@crearpsl.net' || email === 'jose.sanchez@crearpsl.com';
  const isLimaManager = (role.includes('gerente') || currentUser.isGerente) && (sede.includes('lima') || sede === '');
  const isSuperAdminDev = currentUser.isSuperAdmin; // Permite al SuperAdmin auditar la alerta

  return isJose || isLimaManager || isSuperAdminDev;
}

// Evalúa la ventana de activación temporal:
// 1. Inmediata / Mañana a las 9:00 AM (Septiembre 2026)
// 2. 3 días antes de finalizar cada mes
function evaluateAlertSchedule() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Ene, 8 = Sep
  const day = now.getDate();

  // Días totales del mes actual
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const daysRemaining = lastDayOfMonth - day;

  // Condición 1: Urgente mañana 4 de Septiembre a las 9:00 AM (activa hoy 3 y mañana 4)
  const isUrgentTomorrowSept4 = (year === 2026 && month === 8 && (day === 3 || day === 4));

  // Condición 2: 3 días antes de finalizar cada mes (daysRemaining <= 3)
  const isEndOfMonthWindow = daysRemaining <= 3;

  return {
    isActive: isUrgentTomorrowSept4 || isEndOfMonthWindow,
    isUrgentTomorrowSept4,
    isEndOfMonthWindow,
    daysRemaining,
    lastDayOfMonth
  };
}

export default function ApdaycPaymentAlert() {
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const [minimized, setMinimized] = useState(false);
  const [dismissedMonth, setDismissedMonth] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const scheduleInfo = useMemo(() => evaluateAlertSchedule(), []);
  const isGerenteLima = useMemo(() => isTargetGerenteLima(currentUser), [currentUser]);

  // Chequeo de confirmación en localStorage para no molestar si ya fue pagado este mes
  useEffect(() => {
    const currentMonthKey = `apdayc_paid_${new Date().getFullYear()}_${new Date().getMonth() + 1}`;
    if (localStorage.getItem(currentMonthKey) === 'true') {
      setDismissedMonth(true);
    }
  }, []);

  if (!isGerenteLima || !scheduleInfo.isActive || dismissedMonth) {
    return null;
  }

  const handleMarkAsPaid = () => {
    const currentMonthKey = `apdayc_paid_${new Date().getFullYear()}_${new Date().getMonth() + 1}`;
    localStorage.setItem(currentMonthKey, 'true');
    setDismissedMonth(true);
    showToast("✅ Pago APDAYC registrado como COMPLETADO para este ciclo mensual.", "success");
  };

  const handleCopyAccounts = (cuenta) => {
    const text = `${cuenta.banco} (${cuenta.tipo})\nNúmero: ${cuenta.numero}\nCCI: ${cuenta.cci}`;
    navigator.clipboard.writeText(text);
    showToast(`Cuenta ${cuenta.banco} copiada al portapapeles`, 'info');
  };

  const getWhatsAppUrl = () => {
    const msg = `🚨 *URGENTE: RECORDATORIO DE PAGO APDAYC - LIMA* 🚨\n\n` +
      `Estimado José Sánchez (Gerente de Lima):\n` +
      `De acuerdo a la programación oficial de *CREAR PODER SIN LÍMITES*, se debe realizar el pago mensual de derechos de autor APDAYC para los entrenamientos en Hotel Jose Antonio.\n\n` +
      `⏰ *Fecha límite:* Mañana a las 9:00 AM\n` +
      `🏢 *Entidad:* APDAYC (RUC: 20100538203)\n` +
      `👤 *Código de Usuario:* 248509\n` +
      `📍 *Local:* Hotel Jose Antonio Deluxe - Miraflores\n\n` +
      `💳 *Cuentas Oficiales:* \n` +
      `• BCP Cta Cte: 191 0046905 0 86 (CCI: 00219100004690508658)\n` +
      `• BBVA Cta Cte: 0011 0368 01 00002525 (CCI: 01136800010000252582)\n` +
      `• Interbank Cta Cte: 200 3000831059 (CCI: 00320000300083105938)\n\n` +
      `Por favor remitir el comprobante de transferencia a administración para su archivo legal.`;
    return `https://wa.me/${APDAYC_CONFIG.telefonoWhatsApp}?text=${encodeURIComponent(msg)}`;
  };

  const getMailtoUrl = () => {
    const subject = `[URGENTE] PAGO MENSUAL APDAYC LIMA - MAÑANA 9:00 AM - GERENCIA DE LIMA`;
    const body = `Estimado José Sánchez,\n\n` +
      `Te recordamos que de acuerdo al protocolo operativo de CREAR PODER SIN LÍMITES, mañana a las 9:00 AM vence el plazo para efectuar el pago de derechos de autor a APDAYC correspondiente a los eventos en el Hotel Jose Antonio.\n\n` +
      `DETALLES DE PAGO:\n` +
      `-----------------------------------------\n` +
      `Entidad: APDAYC (RUC 20100538203)\n` +
      `Oficina: AGECOFER - Miraflores\n` +
      `Código Usuario: 248509\n` +
      `Empresa Facturada: CREACION CUANTICA E.I.R.L. (RUC 20612592811)\n` +
      `Local: Hotel Jose Antonio Deluxe (Calle Bellavista 133, Miraflores)\n\n` +
      `CUENTAS BANCARIAS AUTORIZADAS:\n` +
      `1. BCP Cta. Cte.: 191 0046905 0 86 (CCI: 00219100004690508658)\n` +
      `2. BBVA Cta. Cte.: 0011 0368 01 00002525 (CCI: 011 368 000100002525 82)\n` +
      `3. Interbank Cta. Cte.: 200 3000831059 (CCI: 003 200 003000831059 38)\n` +
      `4. Scotiabank Cta. Cte.: 000 4501799 (CCI: 009 04300000450179913)\n\n` +
      `Favor confirmar el pago y remitir el voucher digital.\n\n` +
      `Atentamente,\n` +
      `Dirección General & Operaciones\n` +
      `CREAR PODER SIN LÍMITES`;
    return `mailto:${APDAYC_CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleOpenGoogleChat = async () => {
    setChatLoading(true);
    try {
      const res = await openOrCreateDirectMessage(APDAYC_CONFIG.email);
      if (res.success && res.spaceUri) {
        window.open(res.spaceUri, '_blank', 'noopener,noreferrer');
        showToast("Espacio de Google Chat abierto", "success");
      } else {
        window.open(`https://mail.google.com/chat/u/0/#chat/dm/users/${APDAYC_CONFIG.email}`, '_blank');
      }
    } catch (e) {
      window.open(`https://mail.google.com/chat/u/0/#chat/dm/users/${APDAYC_CONFIG.email}`, '_blank');
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes rainbow-glow {
          0% {
            border-color: #ff0055;
            box-shadow: 0 0 20px rgba(255, 0, 85, 0.7), inset 0 0 10px rgba(255, 0, 85, 0.3);
          }
          20% {
            border-color: #ff8800;
            box-shadow: 0 0 20px rgba(255, 136, 0, 0.7), inset 0 0 10px rgba(255, 136, 0, 0.3);
          }
          40% {
            border-color: #ffee00;
            box-shadow: 0 0 20px rgba(255, 238, 0, 0.7), inset 0 0 10px rgba(255, 238, 0, 0.3);
          }
          60% {
            border-color: #00ff88;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.7), inset 0 0 10px rgba(0, 255, 136, 0.3);
          }
          80% {
            border-color: #00bfff;
            box-shadow: 0 0 20px rgba(0, 191, 255, 0.7), inset 0 0 10px rgba(0, 191, 255, 0.3);
          }
          100% {
            border-color: #bf00ff;
            box-shadow: 0 0 20px rgba(191, 0, 255, 0.7), inset 0 0 10px rgba(191, 0, 255, 0.3);
          }
        }

        @keyframes rainbow-text-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .rainbow-banner {
          animation: rainbow-glow 4s linear infinite;
        }

        .rainbow-text {
          background: linear-gradient(90deg, #ff0055, #ff8800, #ffee00, #00ff88, #00bfff, #bf00ff, #ff0055);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: rainbow-text-gradient 5s ease infinite;
          font-weight: 900;
        }

        .rainbow-badge {
          background: linear-gradient(90deg, rgba(255,0,85,0.2), rgba(255,136,0,0.2), rgba(0,255,136,0.2), rgba(0,191,255,0.2));
          border: 1px solid rgba(255,255,255,0.3);
          color: #fff;
        }
      `}</style>

      {/* BANNER FLOTANTE SUPERIOR EN PANTALLA */}
      <div
        className="rainbow-banner"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 9998,
          background: 'linear-gradient(135deg, rgba(15, 12, 41, 0.98) 0%, rgba(48, 43, 99, 0.98) 50%, rgba(36, 36, 62, 0.98) 100%)',
          backdropFilter: 'blur(16px)',
          borderBottom: '3px solid',
          padding: minimized ? '0.5rem 1.5rem' : '0.85rem 1.5rem',
          transition: 'all 0.3s ease',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
        }}
        role="alert"
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* Lado izquierdo: Título y descripción */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ff0055, #ff8800, #00bfff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(255,0,85,0.5)',
              flexShrink: 0
            }}>
              <AlertTriangle size={22} color="#fff" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="rainbow-text" style={{ fontSize: '1.05rem', letterSpacing: '0.5px' }}>
                  ⚡ RECORDATORIO URGENTE: PAGAR APDAYC (LIMA)
                </span>
                <span className="rainbow-badge" style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800 }}>
                  MAÑANA 9:00 AM
                </span>
                <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', color: '#e0e7ff' }}>
                  Solo para José Sánchez (Gerente de Lima)
                </span>
              </div>

              {!minimized && (
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '2px' }}>
                  Pago obligatorio de derechos de autor para eventos en <strong style={{ color: '#fff' }}>Hotel Jose Antonio</strong>. Vence a las <strong>9:00 AM</strong> (alerta mensual: 3 días antes del cierre de mes).
                </div>
              )}
            </div>
          </div>

          {/* Lado derecho: Canales de Notificación y Acciones Rápidas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            
            {/* Botón WhatsApp */}
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                color: '#fff',
                padding: '6px 13px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.4)',
                cursor: 'pointer'
              }}
              title="Enviar alerta por WhatsApp a José Sánchez"
            >
              <MessageSquare size={15} />
              <span>WhatsApp</span>
            </a>

            {/* Botón Correo */}
            <a
              href={getMailtoUrl()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#fff',
                padding: '6px 13px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                cursor: 'pointer'
              }}
              title="Enviar correo urgente a jose.sanchez@crearpsl.net"
            >
              <Mail size={15} />
              <span>Correo</span>
            </a>

            {/* Botón Google Chat */}
            <button
              onClick={handleOpenGoogleChat}
              disabled={chatLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                color: '#fff',
                border: 'none',
                padding: '6px 13px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                cursor: 'pointer'
              }}
              title="Abrir chat directo en Google Chat"
            >
              <Sparkles size={15} />
              <span>{chatLoading ? 'Abriendo...' : 'Google Chat'}</span>
            </button>

            {/* Botón Ver Cuentas Bancarias */}
            <button
              onClick={() => setShowDetailsModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <CreditCard size={15} color="#38bdf8" />
              <span>Ver Cuentas</span>
            </button>

            {/* Botón Marcar como Pagado */}
            <button
              onClick={handleMarkAsPaid}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Confirmar que el pago ya se realizó"
            >
              <CheckCircle size={15} />
              <span>Ya Pagado</span>
            </button>

            {/* Botón Minimizar */}
            <button
              onClick={() => setMinimized(!minimized)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px'
              }}
              title={minimized ? "Expandir" : "Minimizar"}
            >
              {minimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>

        </div>
      </div>

      {/* MODAL DETALLADO CON DATOS BANCARIOS DE APDAYC */}
      {showDetailsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          padding: '1rem'
        }}>
          <div
            className="rainbow-banner"
            style={{
              background: '#0a0f1d',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              padding: '2rem',
              color: '#fff',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
              <div>
                <span className="rainbow-text" style={{ fontSize: '1.4rem' }}>
                  Instrucciones de Pago APDAYC
                </span>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
                  Gestión exclusiva para la Sede Lima — Eventos Hotel Jose Antonio Deluxe
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Ficha Resumen */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '1rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
              fontSize: '0.85rem'
            }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Entidad Recaudadora:</span>
                <div style={{ fontWeight: 'bold' }}>{APDAYC_CONFIG.entidad}</div>
                <div style={{ color: '#38bdf8' }}>RUC: {APDAYC_CONFIG.ruc}</div>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Código de Usuario APDAYC:</span>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#fbbf24' }}>{APDAYC_CONFIG.usuarioCodigo}</div>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Empresa Facturada:</span>
                <div style={{ fontWeight: 'bold' }}>{APDAYC_CONFIG.razonSocial}</div>
                <div style={{ color: '#94a3b8' }}>RUC: {APDAYC_CONFIG.rucEmpresa}</div>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Oficina de Recaudación:</span>
                <div style={{ fontWeight: 'bold' }}>{APDAYC_CONFIG.oficina}</div>
              </div>
            </div>

            {/* Cuentas Bancarias */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.8rem', color: '#38bdf8' }}>
              💳 Cuentas Bancarias Autorizadas de APDAYC (1-Clic para copiar):
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {APDAYC_CONFIG.cuentas.map((c, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    padding: '0.9rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{c.banco}</span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                        {c.tipo}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '3px' }}>
                      Cta: <code>{c.numero}</code>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      CCI: <code>{c.cci}</code>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopyAccounts(c)}
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Copy size={14} />
                    <span>Copiar</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Enlaces y Acciones */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.2rem' }}>
              <a
                href={APDAYC_CONFIG.portalComprobantes}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#94a3b8',
                  fontSize: '0.8rem',
                  textDecoration: 'underline'
                }}
              >
                <ExternalLink size={14} />
                <span>Módulo de Facturación Electrónica APDAYC</span>
              </a>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleMarkAsPaid}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Confirmar Pago Realizado
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
