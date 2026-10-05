const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("import CfoDashboard")) {
  content = content.replace("import Home from './pages/Home';", "import Home from './pages/Home';\nimport CfoDashboard from './pages/CfoDashboard';\nimport FinanceWorkspace from './pages/FinanceWorkspace';\nimport MaestriaGlobalDashboard from './pages/MaestriaGlobalDashboard';");
  fs.writeFileSync(file, content);
  console.log('Fixed imports in App.jsx');
} else {
  console.log('Imports already exist');
}
