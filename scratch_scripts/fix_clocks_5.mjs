import fs from 'fs';
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/viewMode === 'lite' \? '#f8fafc'/g, "themeMode === 'light' ? '#f8fafc'");
content = content.replace(/viewMode === 'lite' \? '1px solid #cbd5e1'/g, "themeMode === 'light' ? '1px solid #cbd5e1'");

fs.writeFileSync(file, content, 'utf8');
console.log("Global themeMode replace successful");
