import fs from 'fs';
import path from 'path';

// "Agente de Honestidad" - Causa OS Sentinel
// Escanea el código fuente en busca de datos falsos, hardcodeos de UI, y "mock data".

const SUSPICIOUS_PATTERNS = [
  /simulamos la obtención/i,
  /datos de prueba/i,
  /dummy data/i,
  /mock data/i,
  /TODO: Implementar consulta real/i,
  /fake data/i,
  /datos falsos/i,
  /placeholder/i,
  /hardcoded/i
];

const IGNORED_FILES = [
  'honestySentinelAgent.mjs'
];

function scanDirectory(dir, results = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== 'build' && !file.startsWith('.')) {
        scanDirectory(fullPath, results);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.mjs')) {
      if (IGNORED_FILES.includes(file)) continue;
      
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        for (const pattern of SUSPICIOUS_PATTERNS) {
          if (pattern.test(line)) {
            results.push({
              file: fullPath,
              line: index + 1,
              content: line.trim(),
              pattern: pattern.toString()
            });
            break; // Solo registrar una vez por línea
          }
        }
      });
    }
  }
  
  return results;
}

console.log('🛡️ Iniciando Agente de Honestidad (Escaneo de Integridad de Datos)...');
const results = scanDirectory('./src');
const scriptResults = scanDirectory('./scripts');
const allResults = [...results, ...scriptResults];

if (allResults.length === 0) {
  console.log('✅ ESTADO: VERDE. No se detectaron datos inventados o de prueba en el código.');
} else {
  console.log(`⚠️ ALERTA ROJA: Se encontraron ${allResults.length} rastros de datos simulados o hardcodeados.\n`);
  allResults.forEach(r => {
    console.log(`- Archivo: ${r.file}:${r.line}`);
    console.log(`  Contenido: "${r.content}"`);
    console.log(`  Patrón detectado: ${r.pattern}\n`);
  });
}
