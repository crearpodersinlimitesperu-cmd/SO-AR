const fs = require('fs');

const path = './src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('CausaNodusAgent')) {
  // Import
  content = content.replace(
    "import { useAuth } from './context/AuthContext';",
    "import { useAuth } from './context/AuthContext';\nimport { startCausaNodusAgent, stopCausaNodusAgent } from './services/CausaNodusAgent';"
  );

  // Hook
  const hookInject = `
  useEffect(() => {
    startCausaNodusAgent();
    return () => stopCausaNodusAgent();
  }, []);
`;
  content = content.replace(
    "const { originalAdminUser, currentUser, stopSimulation } = useAuth();",
    "const { originalAdminUser, currentUser, stopSimulation } = useAuth();\n" + hookInject
  );

  fs.writeFileSync(path, content, 'utf8');
  console.log("App.jsx parcheado exitosamente con CausaNodusAgent.");
} else {
  console.log("App.jsx ya tiene el agente.");
}
