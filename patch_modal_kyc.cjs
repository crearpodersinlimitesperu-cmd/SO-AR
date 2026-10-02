const fs = require('fs');
const file = 'src/components/LegalOnboardingModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// We need to add KYC states.
const stateInsert = `
  const [step, setStep] = useState(-1); // -1=kyc, 0=intro, 1..N=documentos, N+1=firma, N+2=éxito
  const [kycData, setKycData] = useState({
    fullName: currentUser?.name || currentUser?.displayName || '',
    docType: 'DNI',
    docNumber: '',
    birthDate: '',
    email: currentUser?.email || '',
    phone: ''
  });
`;

content = content.replace("const [step, setStep] = useState(0); // 0=intro, 1..N=documentos, N+1=firma, N+2=éxito", stateInsert);

const kycCondition = `
  const isKyc = step === -1;
  const isIntro = step === 0;
`;
content = content.replace("const isIntro = step === 0;", kycCondition);

// Modify handleSubmit to include KYC data
const submitTarget = `      const result = await processFullLegalSignature({`;
const submitReplacement = `      const result = await processFullLegalSignature({
        ...kycData,`;
content = content.replace(submitTarget, submitReplacement);

// Insert KYC UI before PASO 0
const kycUI = `
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
                  <input type="email" value={kycData.email} disabled style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', cursor: 'not-allowed' }} />
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                <button
                  onClick={() => {
                    if(!kycData.fullName || !kycData.docNumber || !kycData.birthDate || !kycData.phone) {
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
`;

content = content.replace("{/* PASO 0 — Introducción */}", kycUI + "\n          {/* PASO 0 — Introducción */}");

// Replace progress logic
content = content.replace("const progressPct = step === 0 ? 0 : Math.round((Math.min(step, totalDocs + 1) / (totalDocs + 1)) * 100);", 
"const progressPct = step <= 0 ? 0 : Math.round((Math.min(step, totalDocs + 1) / (totalDocs + 1)) * 100);");

fs.writeFileSync(file, content);
console.log('Added KYC step to LegalOnboardingModal');
