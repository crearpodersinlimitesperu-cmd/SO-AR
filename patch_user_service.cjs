const fs = require('fs');
const file = 'src/services/userService.js';
let content = fs.readFileSync(file, 'utf8');

// Add import
const importTarget = "import { collection, getDocs } from 'firebase/firestore';";
const importReplacement = "import { collection, getDocs } from 'firebase/firestore';\nimport { canManageUserStatus } from '../config/permissions';";
content = content.replace(importTarget, importReplacement);

// Update function signature
content = content.replace(
  "export async function getAllCompanyUsers() {",
  "export async function getAllCompanyUsers(currentUser = null) {"
);

// Update return statement to filter inactive users if not authorized
const returnTarget = "return allUsers;";
const returnReplacement = `
  const includeInactive = currentUser ? canManageUserStatus(currentUser) : false;
  return includeInactive ? allUsers : allUsers.filter(u => u.status !== 'inactive');
`;
content = content.replace(returnTarget, returnReplacement);

fs.writeFileSync(file, content);
console.log('userService patched');
