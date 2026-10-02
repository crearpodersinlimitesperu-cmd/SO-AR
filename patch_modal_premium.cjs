const fs = require('fs');
const file = 'src/components/LegalOnboardingModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// The new return block that replaces everything from `return (` to the end of the file.
const premiumReturn = `  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 transition-all duration-300">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl shadow-slate-900/50 ring-1 ring-amber-500/20 overflow-hidden transform transition-all">
        
        {/* PREMIUM HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-[#0a1930] to-slate-900 px-6 py-5 shrink-0 relative overflow-hidden">
          {/* Decorative gold accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-400" />
          
          <div className="flex justify-between items-start gap-4">
            <div className="flex gap-4 items-center">
              <div className="bg-amber-500/20 p-2.5 rounded-lg ring-1 ring-amber-500/40">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-[0.2em] text-amber-500 uppercase mb-1">
                  CREAR PODER SIN LÍMITES
                </div>
                <h1 className="font-bold text-lg leading-tight text-white">
                  Documentos Legales Oficiales
                </h1>
                <div className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1.5">
                  <span className="text-sm">{contracts.flag}</span>
                  {contracts.countryName} — {contracts.lawReference}
                </div>
              </div>
            </div>
            
            {onClose && (
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {/* Premium Progress Bar */}
          <div className="mt-5 bg-slate-800/60 rounded-full h-1.5 ring-1 ring-slate-700/50 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: \`\${progressPct}%\` }}
            />
          </div>
          <div className="text-[11px] font-medium text-slate-400 mt-2 text-right">
            {isSuccess ? 'PROCESO COMPLETADO' : \`PASO \${Math.max(step, 1)} DE \${totalDocs + 1}\`}
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">

          {/* PASO 0 — Introducción */}
          {isIntro && (
            <div className="p-8 sm:p-10 overflow-y-auto">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
                Bienvenido/a, <span className="text-blue-700">{currentUser?.name?.split(' ')[0] || 'Participante'}</span>
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-8">
                Estás a un paso de iniciar el <strong>Programa de Creación</strong>. Para garantizar tu seguridad, privacidad y cumplimiento normativo en <strong>{contracts.countryName}</strong>, debes revisar y firmar digitalmente los siguientes acuerdos:
              </p>
              
              <div className="space-y-3 mb-8">
                {contracts.documents.map((doc, idx) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 font-medium text-slate-700 text-sm">{doc.title}</div>
                    {doc.required && (
                      <span className="text-[10px] font-bold px-2 py-1 bg-rose-50 text-rose-600 rounded-md tracking-wide">
                        REQUERIDO
                      </span>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-3 p-3.5 bg-slate-100/50 border border-slate-200 border-dashed rounded-xl">
                  <div className="bg-slate-200/50 p-2 rounded-lg text-slate-400 shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex-1 font-medium text-slate-500 text-sm">Firma Manuscrita Digital Certificada</div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 flex gap-3 items-start mb-8 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 leading-relaxed">
                  <strong>Aviso Importante:</strong> El sistema requiere que leas los documentos en su totalidad (scroll hasta el final) antes de habilitar la firma de aceptación.
                </div>
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-900/20 transition-all flex items-center justify-center gap-2 mx-auto"
              >
                Comenzar Proceso Legal <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* PASOS 1..N — Documentos */}
          {currentDoc && (
            <div className="flex flex-col h-full overflow-hidden bg-white">
              {/* Título del documento */}
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 shrink-0 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 text-base flex items-center gap-2">
                    {step}. {currentDoc.title}
                    {currentDoc.required && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md">REQUERIDO</span>
                    )}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    Auditoría SHA-256 Activa • Versión: {currentDoc.version}
                  </div>
                </div>
              </div>

              {/* Contenido scrollable */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-6 md:p-8 text-sm leading-relaxed text-slate-600 bg-white"
                style={{ scrollBehavior: 'smooth' }}
              >
                <div className="max-w-none prose prose-slate prose-sm">
                  <pre className="whitespace-pre-wrap font-sans text-[13px] text-slate-700 leading-[1.8] m-0">
                    {currentDoc.content}
                  </pre>
                </div>
                
                {!hasScrolled[currentDoc.id] && (
                  <div className="mt-12 mb-4 text-center animate-pulse flex flex-col items-center gap-2">
                    <div className="p-3 bg-slate-50 rounded-full text-slate-400">
                      <ChevronDown className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Desplácese para habilitar la firma
                    </span>
                  </div>
                )}
              </div>

              {/* Footer de aceptación */}
              <div className="p-5 border-t border-slate-200 bg-slate-50 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                {canAcceptCurrent ? (
                  <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                    <label className="flex items-start gap-3 cursor-pointer p-3 border border-slate-200 bg-white rounded-xl hover:border-amber-400 hover:bg-amber-50/30 transition-colors">
                      <input
                        type="checkbox"
                        checked={!!accepted[currentDoc.id]}
                        onChange={e => setAccepted(prev => ({ ...prev, [currentDoc.id]: e.target.checked }))}
                        className="mt-0.5 w-5 h-5 text-amber-500 border-slate-300 rounded focus:ring-amber-500 focus:ring-2 cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-slate-700 select-none">
                        {currentDoc.checkboxLabel}
                      </span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      {!currentDoc.required && (
                        <button
                          onClick={() => setStep(s => s + 1)}
                          className="flex-1 py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                        >
                          Omitir (Opcional)
                        </button>
                      )}
                      <button
                        onClick={handleAcceptDoc}
                        disabled={!accepted[currentDoc.id]}
                        className={\`flex-[2] py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all \${
                          accepted[currentDoc.id] 
                            ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg shadow-slate-900/20 hover:from-slate-800 hover:to-slate-700' 
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }\`}
                      >
                        <Check className="w-4 h-4" /> Registrar y Continuar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-500 text-sm font-medium flex items-center justify-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    Lee el documento completo para continuar
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASO FIRMA */}
          {isSignStep && (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6 bg-slate-50">
              <div className="text-center max-w-lg mx-auto">
                <div className="inline-flex p-3 bg-amber-100 text-amber-600 rounded-2xl mb-4">
                  <Shield className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Firma Digital Certificada</h3>
                <p className="text-sm text-slate-600">
                  Para finalizar el proceso, dibuja tu firma en el recuadro inferior. Tu firma quedará encriptada y vinculada a los documentos aceptados.
                </p>
              </div>

              <div className="max-w-2xl mx-auto w-full">
                <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                  <SignaturePad
                    onSave={handleSign}
                    participantName={currentUser?.name || ''}
                  />
                </div>
              </div>

              <div className="max-w-2xl mx-auto w-full space-y-4">
                {signatureDataUrl && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-700 text-sm font-medium">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    Firma biométrica registrada y validada correctamente.
                  </div>
                )}

                {error && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-700 text-sm font-medium">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!signatureDataUrl || isSubmitting}
                  className={\`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all \${
                    !signatureDataUrl || isSubmitting 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-xl shadow-amber-500/20'
                  }\`}
                >
                  {isSubmitting ? (
                    <><Loader className="w-5 h-5 animate-spin" /> Encriptando y Procesando...</>
                  ) : (
                    <><Check className="w-5 h-5" /> Finalizar y Enviar Documentos</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ÉXITO */}
          {isSuccess && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20" />
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-3">
                ¡Tu poder ya no tiene límites!
              </h2>
              <p className="text-slate-600 mb-8 max-w-md leading-relaxed text-sm">
                Tus documentos han sido sellados digitalmente y tu acceso al <strong>Programa de Creación</strong> ha sido autorizado de manera oficial.
              </p>
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 w-full max-w-md text-left mb-8 shadow-sm">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">RECIBO DIGITAL DE AUDITORÍA</div>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span className="font-medium">ID de Registro:</span>
                    <span className="font-mono text-xs bg-slate-200 px-1.5 py-0.5 rounded">{resultId?.split('-')[0]}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Estatus Legal:</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1"><Check className="w-3 h-3"/> VÁLIDO</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Timestamp:</span>
                    <span className="font-mono text-xs">{new Date().toLocaleString('es-MX', { hour12: false })}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onComplete}
                className="px-10 py-4 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white rounded-xl font-bold shadow-xl shadow-slate-900/20 transition-all flex items-center gap-2"
              >
                Ingresar al Campus <ChevronDown className="w-5 h-5 -rotate-90" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalOnboardingModal;
`;

// Extract everything from `return (` to the end of the file.
const returnIndex = content.indexOf('return (');
if (returnIndex !== -1) {
  content = content.substring(0, returnIndex) + premiumReturn;
  fs.writeFileSync(file, content);
  console.log('LegalOnboardingModal.jsx patched to Premium Design');
} else {
  console.error('Could not find return statement to patch');
}
