import fs from 'fs';
import path from 'path';

// Undo Bogota in nodusHrSentinelAgent
let hrPath = path.resolve('scripts/nodusHrSentinelAgent.mjs');
if (fs.existsSync(hrPath)) {
  let hrContent = fs.readFileSync(hrPath, 'utf8');
  hrContent = hrContent.replace(
    "if (n.includes('medellin')) return 'Medellín';\n          if (n.includes('bogota') || n.includes('bogot')) return 'Bogotá';",
    "if (n.includes('medellin')) return 'Medellín';"
  );
  hrContent = hrContent.replace(
    "if (n.includes('mex') || n.includes('cdmx')) return 'México';\n          if (n.includes('bogota') || n.includes('bogot')) return 'Bogotá';",
    "if (n.includes('mex') || n.includes('cdmx')) return 'México';"
  );
  hrContent = hrContent.replace(
    "export const GERENTES_POR_SEDE = {\n  'Bogotá': ['gerencia.bogota@crearpsl.net'], // Placeholder Bogotá\n",
    "export const GERENTES_POR_SEDE = {\n"
  );
  fs.writeFileSync(hrPath, hrContent);
  console.log('Removed Bogota from HR Agent');
}

// Undo Bogota in nodusMultiAgentSync
let syncPath = path.resolve('scripts/nodusMultiAgentSync.mjs');
if (fs.existsSync(syncPath)) {
  let syncContent = fs.readFileSync(syncPath, 'utf8');
  syncContent = syncContent.replace(
    "if (s.includes('medellin')) return 'Medellín';\n  if (s.includes('bogota') || s.includes('bogot')) return 'Bogotá';",
    "if (s.includes('medellin')) return 'Medellín';"
  );
  fs.writeFileSync(syncPath, syncContent);
  console.log('Removed Bogota from Sync Agent');
}

// Undo Bogota in nodusDataScientistAgent
let dsPath = path.resolve('scripts/nodusDataScientistAgent.mjs');
if (fs.existsSync(dsPath)) {
  let dsContent = fs.readFileSync(dsPath, 'utf8');
  dsContent = dsContent.replace(
    "if (s.includes('medellin')) return 'Medellín';\n  if (s.includes('bogota') || s.includes('bogot')) return 'Bogotá';",
    "if (s.includes('medellin')) return 'Medellín';"
  );
  dsContent = dsContent.replace(
    "const sedesList = ['Lima', 'Quito', 'Cuenca', 'Guayaquil', 'Medellín', 'México', 'Bogotá'];",
    "const sedesList = ['Lima', 'Quito', 'Cuenca', 'Guayaquil', 'Medellín', 'México'];"
  );
  fs.writeFileSync(dsPath, dsContent);
  console.log('Removed Bogota from Data Scientist Agent');
}
