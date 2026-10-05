const fs = require('fs');
const file = 'src/services/legalSignatureService.js';
let content = fs.readFileSync(file, 'utf8');

// Update payload
const payloadTarget = `      signatureDataUrl: params.signatureDataUrl || '',
      ipAddress,`;
const payloadInsert = `      signatureDataUrl: params.signatureDataUrl || '',
      kycData: {
        fullName: params.fullName || params.participantName || '',
        docType: params.docType || '',
        docNumber: params.docNumber || '',
        birthDate: params.birthDate || '',
        phone: params.phone || '',
        email: params.email || params.participantId || ''
      },
      ipAddress,`;

content = content.replace(payloadTarget, payloadInsert);

// Update PDF rendering
const pdfTarget = `<div class="meta-item"><strong>ID Participante</strong>\${data.participantId}</div>`;
const pdfInsert = `<div class="meta-item"><strong>ID Participante</strong>\${data.participantId}</div>
      <div class="meta-item"><strong>Documento</strong>\${data.kycData?.docType} \${data.kycData?.docNumber}</div>
      <div class="meta-item"><strong>Nacimiento</strong>\${data.kycData?.birthDate}</div>
      <div class="meta-item"><strong>Teléfono</strong>\${data.kycData?.phone}</div>`;

content = content.replace(pdfTarget, pdfInsert);

fs.writeFileSync(file, content);
console.log('legalSignatureService patched');
