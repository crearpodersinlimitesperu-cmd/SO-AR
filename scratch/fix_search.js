const fs = require('fs');
const content = fs.readFileSync('src/components/GlobalSearch.jsx', 'utf8');
const newContent = content.replace(/navigate\(\\/superadmin\?search=\ \+ encodeURIComponent\(r\.name \|\| r\.nombre \|\| r\.displayName \|\| r\.email \|\| ''\)\);/, 'setSelectedUser(r);');
fs.writeFileSync('src/components/GlobalSearch.jsx', newContent, 'utf8');
