const fs = require('fs');
let code = fs.readFileSync('src/pages/CentroManagers.jsx', 'utf8');

const regex = /<span key=\{t\} style=\{\{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 \}\}>[\s\S]*?<\/span>/;
const replacement = "<button key={t} onClick={() => handleTrainerClick(t)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>🎓 {t}</button>";

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/CentroManagers.jsx', code, 'utf8');
