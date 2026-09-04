const fs = require('fs');
const content = fs.readFileSync('src/pages/GerenteDashboard.jsx', 'utf8');
const lines = content.split('\n');
const returnIndex = lines.findIndex(l => l.trim().startsWith('return ('));
console.log(lines.slice(returnIndex, returnIndex + 50).join('\n'));
