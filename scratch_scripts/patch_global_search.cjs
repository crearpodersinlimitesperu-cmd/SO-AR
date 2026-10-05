const fs = require('fs');
const file = 'src/components/GlobalSearch.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import { getFlagForSede } from '../utils/flags';",
  "import { getFlagForSede } from '../utils/flags';\nimport { useAuth } from '../context/AuthContext';"
);

content = content.replace(
  "const navigate = useNavigate();",
  "const navigate = useNavigate();\n  const { currentUser } = useAuth();"
);

content = content.replace(
  "const u = await getAllCompanyUsers();",
  "const u = await getAllCompanyUsers(currentUser);"
);

fs.writeFileSync(file, content);
console.log('GlobalSearch patched');
