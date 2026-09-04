const fs = require('fs');
let content = fs.readFileSync('src/pages/Home.jsx', 'utf8');

// desktop
const s1 = content.indexOf('Flyers C1 Globales');
if (s1 !== -1) {
  let start = content.lastIndexOf('<button', s1);
  let end = content.indexOf('</button>', s1) + 9;
  let block = content.substring(start, end);
  let repl = {(currentUser?.isSuperAdmin || currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria' || currentUser?.appRole?.includes('coord')) && (\n              <button onClick={() => navigate('/generador-flyer')} className="btn-secondary" title="Generador de Flyers Oficiales para Capítulos Uno" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.5)', background: 'rgba(245, 158, 11, 0.12)', fontWeight: 'bold' }}>\n                🎨 Flyers C1 Globales\n              </button>\n            )};
  content = content.replace(block, repl);
}

// mobile
const s2 = content.indexOf('Flyers C1 Globales', s1 + 10);
if (s2 !== -1) {
  let start = content.lastIndexOf('<button', s2);
  let end = content.indexOf('</button>', s2) + 9;
  let block = content.substring(start, end);
  let repl = {(currentUser?.isSuperAdmin || currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria' || currentUser?.appRole?.includes('coord')) && (\n            <button onClick={() => navigate('/generador-flyer')} className="btn-primary" title="Generador de Flyers Oficiales para Capítulos Uno" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #f59e0b, #ec4899)', color: 'white', fontWeight: 'bold', border: 'none', boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)' }}>\n              🎨 Flyers C1 Globales\n            </button>\n          )};
  content = content.replace(block, repl);
}

fs.writeFileSync('src/pages/Home.jsx', content, 'utf8');
