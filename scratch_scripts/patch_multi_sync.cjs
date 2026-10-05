const fs = require('fs');
let content = fs.readFileSync('scripts/nodusMultiAgentSync.mjs', 'utf8');

if (!content.includes('NodusIdentityAgent')) {
  // 1. Add import
  content = content.replace(
    "import { NodusDispatcherAgent } from './nodusDispatcherAgent.mjs';",
    "import { NodusDispatcherAgent } from './nodusDispatcherAgent.mjs';\nimport { NodusIdentityAgent } from './nodusIdentityAgent.mjs';"
  );

  // 2. Instantiate and inject in runMultiAgentSync
  content = content.replace(
    "const dispatcher = new NodusDispatcherAgent();",
    "const dispatcher = new NodusDispatcherAgent();\n    const identitySentinel = new NodusIdentityAgent();"
  );

  // 3. Apply it after normalizer
  content = content.replace(
    "const normalized = normalizer.normalizeData(rawCoordinadores, rawDashboard, rawEquiposReporte);",
    "const normalized = normalizer.normalizeData(rawCoordinadores, rawDashboard, rawEquiposReporte);\n\n      // [Agente 8 - Identidad] Validar que NO haya usuarios inventados, y purgar renuncias\n      normalized.coordinadores = await identitySentinel.enforceIdentityTruth(normalized.coordinadores);"
  );

  fs.writeFileSync('scripts/nodusMultiAgentSync.mjs', content);
  console.log("Patched multi agent sync successfully.");
} else {
  console.log("Already patched.");
}
