const fs = require('fs');
const file = 'src/components/LegalOnboardingModal.jsx';
let content = fs.readFileSync(file, 'utf8');

const newReturn = `  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10, 25, 47, 0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      fontFamily: 'var(--font-body)'
    }}>
      <div style={{
        background: 'var(--bg-dark-alt)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '720px',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
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
                <h1 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-heading)', fontFamily: 'var(--font-heading)' }}>
                  Blindaje Legal y Oficial
                </h1>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span>{contracts.flag}</span>
                  {contracts.countryName} — {contracts.lawReference}
                </div>
              </div>
            </div>
            
            {onClose && (
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            )}
          </div>
          
          {/* Barra de progreso */}
          <div style={{ marginTop: '1.25rem', background: 'var(--bg-dark)', borderRadius: '4px', height: '6px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--crear-gold), #FFD54F)', borderRadius: '4px', width: \`\${progressPct}%\`, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'right', fontWeight: 600, letterSpacing: '0.05em' }}>
            {isSuccess ? 'PROCESO COMPLETADO' : \`PASO \${Math.max(step, 1)} DE \${totalDocs + 1}\`}
          </div>
        </div>

        {/* CUERPO */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark-alt)' }}>

          {/* PASO 0 — Introducción */}
          {isIntro && (
            <div style={{ padding: '2rem 2.5rem', overflowY: 'auto' }}>
              <h2 style={{ color: 'var(--text-heading)', marginTop: 0, fontSize: '1.6rem', fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: '0.5rem' }}>
                Bienvenido/a al nivel premium, <span style={{ color: 'var(--crear-gold)' }}>{currentUser?.name?.split(' ')[0] || 'Líder'}</span>
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                Estás a un paso de iniciar el <strong>Programa de Creación</strong>. Para garantizar tu seguridad, privacidad y blindaje de datos de alto valor en <strong>{contracts.countryName}</strong>, requerimos tu firma en los siguientes acuerdos de neurocomunicación y protección:
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
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-dark-alt)' }}>
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
                onScroll={handleScroll}
                style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', fontSize: '0.85rem', lineHeight: 1.8, color: 'var(--text-main)', background: '#0b162c' }}
              >
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)', margin: 0, opacity: 0.9 }}>
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
                          background: accepted[currentDoc.id] ? 'linear-gradient(135deg, var(--crear-gold), #FF9800)' : 'rgba(255,255,255,0.1)',
                          color: accepted[currentDoc.id] ? '#000' : 'rgba(255,255,255,0.3)', cursor: accepted[currentDoc.id] ? 'pointer' : 'not-allowed',
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
                  Traza tu firma en el recuadro inferior. Tu firma quedará encriptada y resguardada bajo la máxima seguridad.
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
                  <CheckCircle size={18} /> Sello biométrico registrado en la base de datos.
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
                {isSubmitting ? <><Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Encriptando...</> : <><Check size={20} /> Finalizar Blindaje</>}
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
                Tus documentos han sido sellados digitalmente bajo altos estándares de neurocomunicación. Tu acceso al <strong>Programa de Creación</strong> es oficial.
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
`

const returnIndex = content.indexOf('return (');
if (returnIndex !== -1) {
  content = content.substring(0, returnIndex) + newReturn;
  fs.writeFileSync(file, content);
  console.log('LegalOnboardingModal.jsx inline styles patched');
}
