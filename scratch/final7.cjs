const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');

const s1 = code.indexOf('Generador Flyers');
if (s1 !== -1) {
  let start = code.lastIndexOf('<button', s1);
  let end = code.indexOf('</button>', s1) + 9;
  let block = code.substring(start, end);
  let repl = "{(" + "currentUser?.isSuperAdmin || currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria' || currentUser?.appRole?.includes('coord')" + ")} && (\n" +
             "              <button onClick={() => navigate('/generador-flyer')} className=\"btn-secondary\" title=\"Generador de Flyers Oficiales para Capítulos Uno\" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.5)', background: 'rgba(245, 158, 11, 0.12)', fontWeight: 'bold' }}>\n" +
             "                🎨 Flyers C1 Globales\n" +
             "              </button>\n" +
             "            )}";
  code = code.replace(block, repl);
}

const s2 = code.indexOf('Generador Flyers');
if (s2 !== -1) {
  let start = code.lastIndexOf('<button', s2);
  let end = code.indexOf('</button>', s2) + 9;
  let block = code.substring(start, end);
  let repl = "{(" + "currentUser?.isSuperAdmin || currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria' || currentUser?.appRole?.includes('coord')" + ")} && (\n" +
             "            <button onClick={() => navigate('/generador-flyer')} className=\"btn-primary\" title=\"Generador de Flyers Oficiales para Capítulos Uno\" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #f59e0b, #ec4899)', color: 'white', fontWeight: 'bold', border: 'none', boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)' }}>\n" +
             "              🎨 Flyers C1 Globales\n" +
             "            </button>\n" +
             "          )}";
  code = code.replace(block, repl);
}

fs.writeFileSync('src/pages/Home.jsx', code, 'utf8');