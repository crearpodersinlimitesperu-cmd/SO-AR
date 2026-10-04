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

  
  const [step, setStep] = useState(-1); // -1=kyc, 0=intro, 1..N=documentos, N+1=firma, N+2=éxito
  const [kycData, setKycData] = useState({
    fullName: currentUser?.name || currentUser?.displayName || '',
    docType: 'DNI',
    docNumber: '',
    birthDate: '',
    email: currentUser?.email || '',
    phone: ''
  });

  const [accepted, setAccepted] = useState({}); // { [docId]: boolean }
  const [hasScrolled, setHasScrolled] = useState({}); // { [docId]: boolean }
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [resultId, setResultId] = useState(null);
  const scrollRef = useRef(null);

  const totalDocs = contracts.documents.length;
  const currentDoc = step >= 1 && step <= totalDocs ? contracts.documents[step - 1] : null;
  
  const isKyc = step === -1;
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
    const el = scrollRef.current;
    if (!el || !currentDoc) return;
    el.scrollTop = 0;
    // Los documentos cortos también se pueden leer sin producir un evento scroll.
    handleScroll();
    const observer = new ResizeObserver(handleScroll);
    observer.observe(el);
    return () => observer.disconnect();
  }, [step, currentDoc, handleScroll]);

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
        ...kycData,
        participantId: currentUser?.email || kycData.email || '',
        participantName: currentUser?.name || currentUser?.displayName || kycData.fullName || '',
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

  const progressPct = step <= 0 ? 0 : Math.round((Math.min(step, totalDocs + 1) / (totalDocs + 1)) * 100);

      return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10, 25, 47, 0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      fontFamily: 'var(--font-body)'
    }}>
      <div style={{
        background: 'var(--bg-dark-alt)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '720px',
        height: '92dvh', maxHeight: '92dvh', minHeight: 0, display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid var(--border-strong)', overflow: 'hidden'
      }}>
        
        {/* PREMIUM HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #0A192F 0%, #112240 100%)',
          padding: '1.5rem', flexShrink: 0, borderBottom: '1px solid var(--border-strong)', position: 'relative'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(90deg, var(--crear-gold), #FFF8E1)' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ background: 'var(--crear-gold-light)', padding: '0.6rem', borderRadius: '12px', border: '1px solid rgba(255,193,7,0.3)' }}>
                <Shield size={26} color="var(--crear-gold)" />
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.2em', color: 'var(--crear-gold)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  CREAR PODER SIN LÍMITES
                </div>
                <h1 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: '#f8fafc', fontFamily: 'var(--font-heading)' }}>
                  Blindaje Legal y Oficial
                </h1>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '4px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span>{contracts.flag}</span>
                  {contracts.countryName} — {contracts.lawReference}
                </div>
              </div>
            </div>
            
            {onClose && (
              <button aria-label="Cerrar formulario legal" onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            )}
          </div>
          
          {/* Barra de progreso */}
          <div style={{ marginTop: '1.25rem', background: 'var(--bg-dark)', borderRadius: '4px', height: '6px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--crear-gold), #FFD54F)', borderRadius: '4px', width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '8px', textAlign: 'right', fontWeight: 600, letterSpacing: '0.05em' }}>
            {isSuccess ? 'PROCESO COMPLETADO' : `PASO ${Math.max(step, 1)} DE ${totalDocs + 1}`}
          </div>
        </div>

        {/* CUERPO */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark-alt)' }}>

          
          {/* PASO -1 — KYC Data Capture */}
          {isKyc && (
            <div style={{ padding: '2.5rem', overflowY: 'auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ color: 'var(--crear-gold)', margin: 0, fontSize: '1.6rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
                  Blindaje de Identidad
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Para validar legalmente tu firma y sincronizar con Nodus, necesitamos verificar tus datos.
                </p>
              </div>

              <div style={{ display: 'grid', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>Nombre Completo (Legal)</label>
                  <input type="text" value={kycData.fullName} onChange={e => setKycData({...kycData, fullName: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-dark)', border: '1px solid var(--border-strong)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)' }} placeholder="Ejem: Juan Pérez" />
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>Tipo Doc.</label>
                    <select value={kycData.docType} onChange={e => setKycData({...kycData, docType: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-dark)', border: '1px solid var(--border-strong)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)' }}>
                      <option>DNI</option>
                      <option>Cédula</option>
                      <option>Pasaporte</option>
                      <option>CE</option>
                    </select>
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>Número de Documento</label>
                    <input type="text" value={kycData.docNumber} onChange={e => setKycData({...kycData, docNumber: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-dark)', border: '1px solid var(--border-strong)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)' }} placeholder="Ej: 45689102" />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>Fecha de Nacimiento</label>
                    <input type="date" value={kycData.birthDate} onChange={e => setKycData({...kycData, birthDate: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-dark)', border: '1px solid var(--border-strong)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)', colorScheme: 'dark' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>Teléfono (WhatsApp)</label>
                    <input type="tel" value={kycData.phone} onChange={e => setKycData({...kycData, phone: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-dark)', border: '1px solid var(--border-strong)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)' }} placeholder="+51 999 888 777" />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>Correo Electrónico Oficial</label>
                  <input type="email" value={kycData.email} onChange={e => setKycData({...kycData, email: e.target.value})} disabled={!!currentUser?.email} style={{ width: '100%', padding: '0.8rem', background: currentUser?.email ? 'rgba(255,255,255,0.02)' : 'var(--bg-dark)', border: '1px solid var(--border-strong)', color: currentUser?.email ? 'var(--text-muted)' : 'var(--text-main)', borderRadius: 'var(--radius-sm)', cursor: currentUser?.email ? 'not-allowed' : 'text' }} placeholder="correo@ejemplo.com" />
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                <button
                  onClick={() => {
                    if(!kycData.fullName || !kycData.docNumber || !kycData.birthDate || !kycData.phone || !kycData.email) {
                      alert("Por favor, completa todos los campos de identidad.");
                      return;
                    }
                    setStep(0);
                  }}
                  style={{
                    padding: '1rem 3rem', background: 'linear-gradient(135deg, var(--crear-gold), #FF9800)',
                    color: '#000', border: 'none', borderRadius: 'var(--radius-lg)', fontWeight: 800, fontSize: '1rem',
                    cursor: 'pointer', boxShadow: '0 4px 15px rgba(255, 193, 7, 0.3)'
                  }}
                >
                  Validar Identidad →
                </button>
              </div>
            </div>
          )}

          {/* PASO 0 — Introducción */}
          {isIntro && (
            <div style={{ padding: '2rem 2.5rem', overflowY: 'auto' }}>
              <h2 style={{ color: 'var(--text-heading)', marginTop: 0, fontSize: '1.6rem', fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: '0.5rem' }}>
                Bienvenido/a a la plataforma oficial, <span style={{ color: 'var(--crear-gold)' }}>{currentUser?.name?.split(' ')[0] || 'Líder'}</span>
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                Para garantizar tu seguridad, privacidad y el blindaje de datos de alto valor en <strong>{contracts.countryName}</strong>, todos los miembros (participantes, aliados, entrenadores y equipo interno) deben confirmar los siguientes acuerdos, privacidad y blindaje de datos de alto valor en <strong>{contracts.countryName}</strong>, requerimos tu firma en los siguientes acuerdos de neurocomunicación y protección:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
                {contracts.documents.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ background: 'var(--bg-dark)', padding: '0.5rem', borderRadius: '8px', color: 'var(--crear-blue)' }}>
                      <FileText size={18} />
                    </div>
                    <div style={{ flex: 1, fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{doc.title}</div>
                    {doc.required && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '4px 8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: '4px', letterSpacing: '0.05em' }}>
                        REQUERIDO
                      </span>
                    )}
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(100, 255, 218, 0.05)', border: '1px dashed rgba(100, 255, 218, 0.3)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ background: 'rgba(100, 255, 218, 0.1)', padding: '0.5rem', borderRadius: '8px', color: 'var(--crear-blue)' }}>
                    <Shield size={18} />
                  </div>
                  <div style={{ flex: 1, fontWeight: 600, color: 'var(--crear-blue)', fontSize: '0.9rem' }}>Firma Manuscrita Digital Certificada</div>
                </div>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-sm)', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.85rem', color: '#fcd34d', lineHeight: 1.5 }}>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>Fricción Cero, Seguridad Total:</strong> El sistema requiere que revises los documentos completamente (scroll hasta el final) antes de habilitar la firma biométrica. Esto garantiza el marco legal.
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    padding: '1rem 2rem', background: 'linear-gradient(135deg, var(--crear-gold), #FF9800)',
                    color: '#000', border: 'none', borderRadius: 'var(--radius-lg)', fontWeight: 800, fontSize: '1rem',
                    cursor: 'pointer', boxShadow: '0 4px 15px rgba(255, 193, 7, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem'
                  }}
                >
                  Comenzar Proceso <ChevronDown size={18} />
                </button>
              </div>
            </div>
          )}

          {/* PASOS 1..N — Documentos */}
          {currentDoc && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--bg-dark-alt)' }}>
              {/* Título del documento */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-dark)', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {step}. {currentDoc.title}
                  {currentDoc.required && (
                    <span style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>REQUERIDO</span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={12} color="var(--color-success)" />
                  Auditoría SHA-256 Activa • Versión: {currentDoc.version}
                </div>
              </div>

              {/* Contenido scrollable */}
              <div
                ref={scrollRef}
                role="region"
                aria-label="Texto del documento legal"
                tabIndex={0}
                onScroll={handleScroll}
                style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '1.5rem', fontSize: '0.85rem', lineHeight: 1.8, color: 'var(--text-main)', background: 'var(--bg-dark-alt)' }}
              >
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)', margin: 0, color: 'inherit' }}>
                  {currentDoc.content}
                </pre>
                {!hasScrolled[currentDoc.id] && (
                  <div style={{ textAlign: 'center', padding: '2rem 0 1rem', color: 'var(--crear-gold)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    <div style={{ animation: 'bounce 2s infinite', marginBottom: '8px' }}>
                      <ChevronDown size={24} style={{ margin: '0 auto' }} />
                    </div>
                    Desplácese para habilitar la firma oficial
                  </div>
                )}
              </div>

              {/* Footer de aceptación */}
              <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-strong)', background: 'var(--bg-dark)', flexShrink: 0 }}>
                {canAcceptCurrent ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px', margin: '0 auto' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main)', background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      <input
                        type="checkbox"
                        checked={!!accepted[currentDoc.id]}
                        onChange={e => setAccepted(prev => ({ ...prev, [currentDoc.id]: e.target.checked }))}
                        style={{ width: '20px', height: '20px', accentColor: 'var(--crear-gold)', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 600 }}>{currentDoc.checkboxLabel}</span>
                    </label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      {!currentDoc.required && (
                        <button
                          onClick={() => setStep(s => s + 1)}
                          style={{ flex: 1, padding: '0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                        >
                          Omitir
                        </button>
                      )}
                      <button
                        onClick={handleAcceptDoc}
                        disabled={!accepted[currentDoc.id]}
                        style={{
                          flex: 2, padding: '0.8rem', borderRadius: 'var(--radius-sm)', border: 'none',
                          background: accepted[currentDoc.id] ? 'linear-gradient(135deg, var(--crear-gold), #FF9800)' : 'var(--bg-card)',
                          color: accepted[currentDoc.id] ? '#000' : 'var(--text-muted)', cursor: accepted[currentDoc.id] ? 'pointer' : 'not-allowed',
                          fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                          boxShadow: accepted[currentDoc.id] ? '0 4px 15px rgba(255, 193, 7, 0.3)' : 'none'
                        }}
                      >
                        <Check size={18} /> Registrar y Continuar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Loader size={16} style={{ animation: 'spin 2s linear infinite' }} />
                    Lea el documento completo para continuar
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASO FIRMA */}
          {isSignStep && (
            <div style={{ padding: '2rem 2.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-dark-alt)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ background: 'var(--crear-gold-light)', display: 'inline-flex', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
                  <Shield size={32} color="var(--crear-gold)" />
                </div>
                <h3 style={{ color: 'var(--text-heading)', margin: '0 0 0.5rem', fontSize: '1.4rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
                  Sello Digital de Excelencia
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Traza tu firma en el recuadro inferior. Se guardará junto con los documentos que aceptaste al finalizar.
                </p>
              </div>

              <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '16px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', border: '2px solid var(--border-strong)' }}>
                <SignaturePad
                  onSave={handleSign}
                  participantName={currentUser?.name || ''}
                />
              </div>

              {signatureDataUrl && (
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 'var(--radius-sm)', padding: '1rem', fontSize: '0.85rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <CheckCircle size={18} /> Firma preparada en este dispositivo. Pendiente de guardar al finalizar.
                </div>
              )}

              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', padding: '1rem', fontSize: '0.85rem', color: 'var(--color-error)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontWeight: 600 }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} /> {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!signatureDataUrl || isSubmitting}
                style={{
                  width: '100%', padding: '1.2rem', borderRadius: 'var(--radius-lg)', border: 'none',
                  background: !signatureDataUrl || isSubmitting ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, var(--color-success), #16a34a)',
                  color: !signatureDataUrl || isSubmitting ? 'rgba(255,255,255,0.3)' : 'white', fontWeight: 800, fontSize: '1.1rem',
                  cursor: !signatureDataUrl || isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                  boxShadow: !signatureDataUrl || isSubmitting ? 'none' : '0 10px 25px rgba(34, 197, 94, 0.4)'
                }}
              >
                {isSubmitting ? <><Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : <><Check size={20} /> Finalizar Blindaje</>}
              </button>
            </div>
          )}

          {/* ÉXITO */}
          {isSuccess && (
            <div style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', background: 'var(--bg-dark-alt)' }}>
              <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'var(--color-success)', opacity: 0.2, borderRadius: '50%', animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
                <CheckCircle size={64} color="var(--color-success)" style={{ position: 'relative', zIndex: 1 }} />
              </div>
              
              <h2 style={{ color: 'var(--crear-gold)', margin: 0, fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: 900 }}>
                ¡Tu poder ya no tiene límites!
              </h2>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '440px', fontSize: '0.95rem' }}>
                Tus documentos han sido sellados digitalmente bajo altos estándares de neurocomunicación. Tu acceso a la <strong>Plataforma Oficial (Causa OS / Campus)</strong> ha sido habilitado.
              </p>
              
              <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '1.5rem', fontSize: '0.85rem', color: 'var(--text-main)', width: '100%', maxWidth: '440px', textAlign: 'left', marginTop: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', fontWeight: 800 }}>RECIBO OFICIAL DE AUDITORÍA</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>ID de Registro:</span>
                  <strong style={{ fontFamily: 'monospace' }}>{resultId?.split('-')[0]}...</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Estatus Legal:</span>
                  <strong style={{ color: 'var(--color-success)' }}>VÁLIDO ✅</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Timestamp:</span>
                  <strong style={{ fontFamily: 'monospace' }}>{new Date().toLocaleString('es-MX')}</strong>
                </div>
              </div>

              <button
                onClick={onComplete}
                style={{ marginTop: '2rem', padding: '1rem 3rem', background: 'var(--text-main)', color: 'var(--bg-dark)', border: 'none', borderRadius: 'var(--radius-xl)', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(255,255,255,0.2)' }}
              >
                Ingresar al Campus <ChevronDown size={18} style={{ transform: 'rotate(-90deg)' }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalOnboardingModal;
