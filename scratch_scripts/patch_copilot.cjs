const fs = require('fs');

const path = './src/components/AICopilot.jsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /const coords = nodusData\?\.coordinadores \|\| \[\];\s*const totales = nodusData\?\.totales \|\| \{\};\s*const sedes = nodusData\?\.sedes \|\| \[\];/;

const replacement = `const coords = nodusData?.coordinadores || [];
  const totales = nodusData?.totales || nodusData?.nodusTotales || {};
  const sedes = nodusData?.sedes || [];
  const fastCacheEnrolados = nodusData?.enroladosConStatus || [];
  const fastCacheMissions = nodusData?.imoMissions || [];
  
  if (q.includes('discrepancias') || q.includes('verificado') || q.includes('pendientes')) {
     const verificados = fastCacheEnrolados.filter(e => e.statusIA === 'VERIFICADO_OK').length;
     const discrepancias = fastCacheEnrolados.filter(e => e.statusIA === 'DISCREPANCIA').length;
     return \`📊 **Reporte Rápido de Status (Nodus + IMO):**\\n\\n* Enrolados analizados: **\${fastCacheEnrolados.length}**\\n* Verificados Ok por Coordinación: **\${verificados}**\\n* Con Discrepancias (IMO dice sí, Nodus dice no): **\${discrepancias}**\\n\\n_(Datos pre-calculados por el Agente Centinela en background)_.\`;
  }`;

content = content.replace(regex, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log("AICopilot.jsx parcheado para Fiest Cache");
