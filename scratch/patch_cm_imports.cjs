const fs = require('fs');
let code = fs.readFileSync('src/pages/CentroManagers.jsx', 'utf8');

if (!code.includes('UserProfileModal')) {
    code = code.replace(
        "import CMJDashboard from '../components/CMJDashboard';",
        "import CMJDashboard from '../components/CMJDashboard';\nimport UserProfileModal from '../components/UserProfileModal';\nimport { getAllCompanyUsers } from '../services/userService';"
    );
}
fs.writeFileSync('src/pages/CentroManagers.jsx', code, 'utf8');
