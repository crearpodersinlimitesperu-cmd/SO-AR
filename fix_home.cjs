const fs = require('fs');
const path = 'src/pages/Home.jsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /\{globalSearchOptionResults\.map\(opt => \(\n\s*\{canViewMetas && \(\n\{canViewMetas && \(\n<button/g;
const replacement = `{globalSearchOptionResults.map(opt => (\n<button`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
