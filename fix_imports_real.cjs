const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("import CfoDashboard")) {
  content = "import CfoDashboard from './pages/CfoDashboard';\n" + 
            "import FinanceWorkspace from './pages/FinanceWorkspace';\n" + 
            "import MaestriaGlobalDashboard from './pages/MaestriaGlobalDashboard';\n" + 
            "import TrainerZenHub from './pages/TrainerZenHub';\n" + 
            content;
  fs.writeFileSync(file, content);
  console.log('Fixed imports for REAL this time.');
} else {
  console.log('Imports already there.');
}
