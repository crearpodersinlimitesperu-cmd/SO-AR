const fs = require('fs');
const file = 'src/pages/LegalStatusPanel.jsx';
let content = fs.readFileSync(file, 'utf8');

// Ensure import includes generateSignedContractHTML
content = content.replace(
  "import { getAllLegalSignatures, generateTemporaryDownloadURL } from '../services/legalSignatureService';",
  "import { getAllLegalSignatures, generateTemporaryDownloadURL, generateSignedContractHTML } from '../services/legalSignatureService';"
);

const newDownload = `  const handleDownload = async (signatureData) => {
    try {
      if (signatureData.pdf_storage_path) {
        const url = await generateTemporaryDownloadURL(signatureData.pdf_storage_path);
        if (url) {
          window.open(url, '_blank');
          return;
        }
      }
      
      // Fallback: Si no hay PDF en Storage, regeneramos el HTML en memoria y forzamos descarga
      const htmlContent = generateSignedContractHTML(signatureData);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const urlBlob = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = \`Audit_Legal_\${signatureData.kycData?.docNumber || signatureData.id}.html\`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(urlBlob);
    } catch (e) {
      alert('Error obteniendo el PDF de auditoría: ' + e.message);
    }
  };`;

content = content.replace(/const handleDownload = async [\s\S]*?};\s*(?=\n\s*const filtered =)/, newDownload + "\n");

content = content.replace("onClick={() => handleDownload(s.id, s.pdf_storage_path)}", "onClick={() => handleDownload(s)}");

fs.writeFileSync(file, content);
console.log('Fixed panel download function');
