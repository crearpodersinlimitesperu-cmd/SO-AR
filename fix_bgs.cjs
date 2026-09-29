const fs = require('fs');
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.split("background: 'rgba(255,255,255,0.05)'").join("background: viewMode === 'lite' ? '#f8fafc' : 'rgba(255,255,255,0.05)'");
content = content.split("border: '1px solid rgba(255,255,255,0.1)'").join("border: viewMode === 'lite' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)'");

fs.writeFileSync(file, content);
console.log('Backgrounds fixed.');
