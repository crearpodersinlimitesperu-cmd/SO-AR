const fs = require('fs');
const file = 'src/components/LegalOnboardingModal.jsx';
let content = fs.readFileSync(file, 'utf8');

const emailFieldTarget = `<input type="email" value={kycData.email} disabled style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', cursor: 'not-allowed' }} />`;

const emailFieldReplacement = `<input type="email" value={kycData.email} onChange={e => setKycData({...kycData, email: e.target.value})} disabled={!!currentUser?.email} style={{ width: '100%', padding: '0.8rem', background: currentUser?.email ? 'rgba(255,255,255,0.02)' : 'var(--bg-dark)', border: '1px solid var(--border-strong)', color: currentUser?.email ? 'var(--text-muted)' : 'var(--text-main)', borderRadius: 'var(--radius-sm)', cursor: currentUser?.email ? 'not-allowed' : 'text' }} placeholder="correo@ejemplo.com" />`;

content = content.replace(emailFieldTarget, emailFieldReplacement);

// Also we need to check kycData.email when clicking "Validar Identidad ->"
const validationTarget = `if(!kycData.fullName || !kycData.docNumber || !kycData.birthDate || !kycData.phone) {`;
const validationReplacement = `if(!kycData.fullName || !kycData.docNumber || !kycData.birthDate || !kycData.phone || !kycData.email) {`;

content = content.replace(validationTarget, validationReplacement);

fs.writeFileSync(file, content);
console.log('Modal allows email input for public users');
