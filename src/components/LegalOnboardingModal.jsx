/**
 * LegalOnboardingModal.jsx — CREAR PSL Legal Module
 * Modal principal de firma legal con scroll obligatorio, opt-in activo y firma digital.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Shield, Check, X, ChevronDown, FileText, AlertTriangle, Loader, CheckCircle } from 'lucide-react';
import SignaturePad from './SignaturePad';
import { getContractsByCountry, getSedePais } from '../data/legalContracts';
import { processFullLegalSignature } from '../services/legalSignatureService';

const LegalOnboardingModal = ({ currentUser, sede, onComplete, onClose }) => {
  const countryCode = getSedePais(sede);
  const contracts = getContractsByCountry(countryCode);

  const [step, setStep] = useState(0); // 0=intro, 1..N=documentos, N+1=firma, N+2=éxito
  const [accepted, setAccepted] = useState({}); // { [docId]: boolean }
  const [hasScrolled, setHasScrolled] = useState({}); // { [docId]: boolean }
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [resultId, setResultId] = useState(null);
  const scrollRef = useRef(null);

  const totalDocs = contracts.documents.length;
  const currentDoc = step >= 1 && step <= totalDocs ? contracts.documents[step - 1] : null;
  const isIntro = step === 0;
  const isSignStep = step === totalDocs + 1;
  const isSuccess = step === totalDocs + 2;

  // Detectar scroll al final del documento
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !currentDoc) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (atBottom) {
      setHasScrolled(prev => ({ ...prev, [currentDoc.id]: true }));
    }
  }, [currentDoc]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      if (currentDoc) {
        setHasScrolled(prev => prev[currentDoc.id] ? prev : prev);
      }
    }
  }, [step]);

  const canAcceptCurrent = currentDoc && hasScrolled[currentDoc.id];
  const allRequiredAccepted = contracts.documents
    .filter(d => d.required)
    .every(d => accepted[d.id]);

  const handleAcceptDoc = () => {
    if (!currentDoc || !canAcceptCurrent) return;
    setAccepted(prev => ({ ...prev, [currentDoc.id]: true }));
    setStep(s => s + 1);
  };

  const handleSign = async (dataUrl) => {
    setSignatureDataUrl(dataUrl);
  };

  const handleSubmit = async () => {
    if (!signatureDataUrl || !allRequiredAccepted) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const docsAccepted = Object.entries(accepted)
        .filter(([, v]) => v)
        .map(([k]) => k);

      const termsDoc = contracts.documents.find(d => d.type === 'terms');
      const ndaDoc = contracts.documents.find(d => d.type === 'nda');
      const privacyDoc = contracts.documents.find(d => d.type === 'privacy');

      const result = await processFullLegalSignature({
        participantId: currentUser?.email || '',
        participantName: currentUser?.name || currentUser?.displayName || '',
        countryCode,
        sede: sede || '',
        signatureDataUrl,
        docsAccepted,
        termsAccepted: termsDoc ? !!accepted[termsDoc.id] : false,
        ndaSigned: ndaDoc ? !!accepted[ndaDoc.id] : false,
        privacyAccepted: privacyDoc ? !!accepted[privacyDoc.id] : false,
      });

      if (result.success) {
        setResultId(result.signatureId);
        setStep(totalDocs + 2);
      } else {
        setError(result.error || 'Error al procesar la firma. Intenta nuevamente.');
      }
    } catch (e) {
      setError(e.message || 'Error inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPct = step === 0 ? 0 : Math.round((Math.min(step, totalDocs + 1) / (totalDocs + 1)) * 100);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '680px',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.35)', overflow: 'hidden'
      }}>
        {/* HEADER */}
        <div style={{ background: '#001f5b', padding: '1.2rem 1.5rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'white' }}>
            <Shield size={22} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>
                Documentos Legales de Ingreso
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '2px' }}>
                {contracts.flag} {contracts.countryName} — {contracts.lawReference}
              </div>
            </div>
            {onClose && (
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.7 }}>
                <X size={18} />
              </button>
            )}
          </div>
          {/* Barra de progreso */}
          <div style={{ marginTop: '0.75rem', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', height: '4px' }}>
            <div style={{ background: '#10b981', height: '100%', borderRadius: '4px', width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
            {isSuccess ? 'Completado' : `Paso ${Math.max(step, 1)} de ${totalDocs + 1}`}
          </div>
        </div>

        {/* CUERPO */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* PASO 0 — Introducción */}
          {isIntro && (
            <div style={{ padding: '2rem', overflowY: 'auto' }}>
              <h2 style={{ color: '#001f5b', marginTop: 0, fontSize: '1.3rem' }}>
                Bienvenido/a, {currentUser?.name?.split(' ')[0] || 'participante'} 👋
              </h2>
              <p style={{ color: '#475569', lineHeight: 1.7 }}>
                Antes de ingresar al Programa de Creación, debes revisar y firmar digitalmente
                los siguientes documentos legales requeridos para <strong>{contracts.countryName}</strong>:
              </p>
              <ul style={{ color: '#475569', lineHeight: 2 }}>
                {contracts.documents.map(d => (
                  <li key={d.id}>
                    <FileText size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                    {d.title} {!d.required && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>(opcional)</span>}
                  </li>
                ))}
              </ul>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '1rem', marginTop: '1rem', fontSize: '0.85rem', color: '#92400e' }}>
                <AlertTriangle size={14} style={{ display: 'inline', marginRight: '6px' }} />
                <strong>Importante:</strong> Debes leer cada documento completamente antes de poder aceptarlo.
                Las casillas de aceptación se habilitarán al llegar al final del texto.
              </div>
              <button
                onClick={() => setStep(1)}
                style={{ marginTop: '1.5rem', width: '100%', padding: '0.85rem', background: '#001f5b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}
              >
                Comenzar Proceso Legal →
              </button>
            </div>
          )}

          {/* PASOS 1..N — Documentos */}
          {currentDoc && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* Título del documento */}
              <div style={{ padding: '1rem 1.5rem 0.5rem', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, color: '#001f5b', fontSize: '0.95rem' }}>
                  {step}. {currentDoc.title}
                  {currentDoc.required && (
                    <span style={{ marginLeft: '8px', fontSize: '0.7rem', background: '#fef2f2', color: '#ef4444', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>REQUERIDO</span>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Versión: {currentDoc.version}</div>
              </div>

              {/* Contenido scrollable */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', fontSize: '0.82rem', lineHeight: 1.8, color: '#334155', background: '#fafafa' }}
              >
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                  {currentDoc.content}
                </pre>
                {!hasScrolled[currentDoc.id] && (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#94a3b8', fontSize: '0.8rem' }}>
                    <ChevronDown size={20} style={{ display: 'block', margin: '0 auto 6px' }} />
                    Desplácese hacia abajo para habilitar la aceptación
                  </div>
                )}
              </div>

              {/* Footer de aceptación */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', flexShrink: 0, background: 'white' }}>
                {canAcceptCurrent ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', color: '#1e293b' }}>
                      <input
                        type="checkbox"
                        checked={!!accepted[currentDoc.id]}
                        onChange={e => setAccepted(prev => ({ ...prev, [currentDoc.id]: e.target.checked }))}
                        style={{ marginTop: '2px', accentColor: '#001f5b', width: '16px', height: '16px', flexShrink: 0 }}
                      />
                      <span><strong>{currentDoc.checkboxLabel}</strong></span>
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      {!currentDoc.required && (
                        <button
                          onClick={() => setStep(s => s + 1)}
                          style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                          Omitir (Opcional)
                        </button>
                      )}
                      <button
                        onClick={handleAcceptDoc}
                        disabled={!accepted[currentDoc.id]}
                        style={{
                          flex: 2, padding: '0.7rem', borderRadius: '6px', border: 'none',
                          background: accepted[currentDoc.id] ? '#001f5b' : '#94a3b8',
                          color: 'white', cursor: accepted[currentDoc.id] ? 'pointer' : 'not-allowed',
                          fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                        }}
                      >
                        <Check size={16} /> Aceptar y Continuar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '0.5rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                    <ChevronDown size={16} style={{ display: 'inline', marginRight: '4px' }} />
                    Lea el documento completo para habilitar la aceptación
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASO FIRMA */}
          {isSignStep && (
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <h3 style={{ color: '#001f5b', margin: '0 0 0.4rem' }}>✍️ Firma Manuscrita Digital</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  Para finalizar, trace su firma en el recuadro. Esta firma quedará registrada junto con los metadatos de auditoría.
                </p>
              </div>

              <SignaturePad
                onSave={handleSign}
                participantName={currentUser?.name || ''}
              />

              {signatureDataUrl && (
                <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '0.75rem', fontSize: '0.82rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={16} /> Firma registrada correctamente.
                </div>
              )}

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.75rem', fontSize: '0.82rem', color: '#b91c1c' }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!signatureDataUrl || isSubmitting}
                style={{
                  width: '100%', padding: '0.9rem', borderRadius: '8px', border: 'none',
                  background: !signatureDataUrl || isSubmitting ? '#94a3b8' : '#10b981',
                  color: 'white', fontWeight: 800, fontSize: '1rem',
                  cursor: !signatureDataUrl || isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem'
                }}
              >
                {isSubmitting ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Procesando firma...</> : <><Check size={18} /> Confirmar y Firmar Contratos</>}
              </button>
            </div>
          )}

          {/* ÉXITO */}
          {isSuccess && (
            <div style={{ padding: '2.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <CheckCircle size={64} color="#10b981" />
              <h2 style={{ color: '#001f5b', margin: 0 }}>¡Contratos Firmados Exitosamente!</h2>
              <p style={{ color: '#475569', lineHeight: 1.7, maxWidth: '440px' }}>
                Tu firma digital ha sido registrada y validada. Recibirás una copia de los
                contratos firmados en tu correo electrónico. Tu acceso al programa ha sido habilitado.
              </p>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1rem', fontSize: '0.82rem', color: '#15803d', width: '100%', textAlign: 'left' }}>
                <strong>ID de Registro Legal:</strong> {resultId}<br />
                <strong>Estado:</strong> COMPLETADO ✅<br />
                <strong>Fecha:</strong> {new Date().toLocaleString('es-MX')}
              </div>
              <button
                onClick={onComplete}
                style={{ marginTop: '0.5rem', padding: '0.8rem 2rem', background: '#001f5b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
              >
                Ingresar al Programa →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalOnboardingModal;
