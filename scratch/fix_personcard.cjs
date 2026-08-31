const fs = require('fs');
const content = fs.readFileSync('src/pages/SuperAdminPanel.jsx', 'utf8');
const searchRegex = /<span style=\{\{ fontSize: '0.78rem', color: roleColor, fontWeight: 600 \}\}>[\s\S]*?\{ROLE_LABELS\[canonicalRole\] \|\| person\.role\}[\s\S]*?<\/span>/;
const replaceString = "{(person.roles && person.roles.length > 0 ? person.roles : [person.role]).map((r, i) => {" +
"                const rNorm = normalizeRole(r);" +
"                const rCol = ROLE_COLORS[rNorm] || '#6b7280';" +
"                const rLab = ROLE_LABELS[rNorm] || r;" +
"                return (" +
"                  <span key={r + i} style={{ fontSize: '0.78rem', color: rCol, fontWeight: 600 }}>" +
"                    {rLab}{i < (person.roles?.length || 1) - 1 ? ' • ' : ''}" +
"                  </span>" +
"                );" +
"              })}";
const newContent = content.replace(searchRegex, replaceString);
fs.writeFileSync('src/pages/SuperAdminPanel.jsx', newContent, 'utf8');
