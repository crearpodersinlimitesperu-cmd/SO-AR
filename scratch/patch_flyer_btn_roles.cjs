const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');

// Replace both instances of "Generador Flyers"
code = code.replace(
  '🎨 Generador Flyers',
  '🎨 Flyers C1 Globales'
);
code = code.replace(
  '🎨 Generador Flyers',
  '🎨 Flyers C1 Globales'
);

// We also need to restrict to "gerente" and "coordinador"
// First occurrence (in desktop mode)
code = code.replace(
  /<button\s+onClick=\{\(\) => navigate\('\/generador-flyer'\)\}\s+className="btn-secondary"\s+style=\{\{ padding: '0\.45rem 0\.9rem', fontSize: '0\.85rem', color: '#f59e0b', borderColor: 'rgba\(245, 158, 11, 0\.5\)', background: 'rgba\(245, 158, 11, 0\.12\)', fontWeight: 'bold' \}\}\s+>\s+🎨 Flyers C1 Globales\s+<\/button>/,
  {(currentUser?.isSuperAdmin || currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria' || currentUser?.appRole?.includes('coord')) && (
              <button
                onClick={() => navigate('/generador-flyer')}
                className="btn-secondary"
                title="Generador de Flyers Oficiales"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.5)', background: 'rgba(245, 158, 11, 0.12)', fontWeight: 'bold' }}
              >
                🎨 Flyers C1 Globales
              </button>
            )}
);

// Second occurrence (in mobile mode)
code = code.replace(
  /<button onClick=\{\(\) => navigate\('\/generador-flyer'\)\} className="btn-primary" style=\{\{ padding: '0\.35rem 0\.8rem', fontSize: '0\.8rem', background: 'linear-gradient\(135deg, #f59e0b, #ec4899\)', color: 'white', fontWeight: 'bold', border: 'none', boxShadow: '0 0 15px rgba\(245, 158, 11, 0\.4\)' \}\}>\s+🎨 Flyers C1 Globales\s+<\/button>/,
  {(currentUser?.isSuperAdmin || currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria' || currentUser?.appRole?.includes('coord')) && (
            <button 
              onClick={() => navigate('/generador-flyer')} 
              className="btn-primary" 
              title="Generador de Flyers Oficiales"
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #f59e0b, #ec4899)', color: 'white', fontWeight: 'bold', border: 'none', boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)' }}
            >
              🎨 Flyers C1 Globales
            </button>
          )}
);

fs.writeFileSync('src/pages/Home.jsx', code, 'utf8');
