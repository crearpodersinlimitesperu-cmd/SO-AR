import fs from 'fs';
import path from 'path';

// Fix normalizeSede in nodusHrSentinelAgent
let hrPath = path.resolve('scripts/nodusHrSentinelAgent.mjs');
let hrContent = fs.readFileSync(hrPath, 'utf8');
if (!hrContent.includes("return 'Bogotá';")) {
  hrContent = hrContent.replace(
    /if \(n\.includes\('medellin'\)\) return 'Medellín';/g,
    "if (n.includes('medellin')) return 'Medellín';\n          if (n.includes('bogota') || n.includes('bogot')) return 'Bogotá';"
  );
  fs.writeFileSync(hrPath, hrContent);
  console.log('Fixed HR Agent normalizeSede');
}

// Fix normalizeSedeName in nodusMultiAgentSync
let syncPath = path.resolve('scripts/nodusMultiAgentSync.mjs');
let syncContent = fs.readFileSync(syncPath, 'utf8');
if (!syncContent.includes("return 'Bogotá';")) {
  syncContent = syncContent.replace(
    /if \(s\.includes\('medellin'\)\) return 'Medellín';/g,
    "if (s.includes('medellin')) return 'Medellín';\n  if (s.includes('bogota') || s.includes('bogot')) return 'Bogotá';"
  );
  fs.writeFileSync(syncPath, syncContent);
  console.log('Fixed Sync Agent normalizeSede');
}

// Fix normalizeSedeName in nodusDataScientistAgent
let dsPath = path.resolve('scripts/nodusDataScientistAgent.mjs');
let dsContent = fs.readFileSync(dsPath, 'utf8');
if (!dsContent.includes("return 'Bogotá';")) {
  dsContent = dsContent.replace(
    /if \(s\.includes\('medellin'\)\) return 'Medellín';/g,
    "if (s.includes('medellin')) return 'Medellín';\n  if (s.includes('bogota') || s.includes('bogot')) return 'Bogotá';"
  );
  dsContent = dsContent.replace(
    /const sedesList = \['Lima', 'Quito', 'Cuenca', 'Guayaquil', 'Medellín', 'México'\];/g,
    "const sedesList = ['Lima', 'Quito', 'Cuenca', 'Guayaquil', 'Medellín', 'México', 'Bogotá'];"
  );
  fs.writeFileSync(dsPath, dsContent);
  console.log('Fixed Data Scientist Agent normalizeSede');
}
