const fs = require('fs');
let c = fs.readFileSync('src/pages/Home.jsx', 'utf8');

const t1 = <button
                onClick={() => navigate('/generador-flyer')}
                className="btn-secondary"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.5)', background: 'rgba(245, 158, 11, 0.12)', fontWeight: 'bold' }}
              >
                🎨 Flyers C1 Globales
              </button>;

const r1 = {(currentUser?.isSuperAdmin || currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria' || currentUser?.appRole?.includes('coord')) && (
              <button
                onClick={() => navigate('/generador-flyer')}
                className="btn-secondary"
                title="Generador de Flyers Oficiales para Capítulos Uno"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.5)', background: 'rgba(245, 158, 11, 0.12)', fontWeight: 'bold' }}
              >
                🎨 Flyers C1 Globales
              </button>
            )};

c = c.replace(t1, r1);
c = c.replace(t1.replace(/\n/g, "\r\n"), r1);

const t2 = <button onClick={() => navigate('/generador-flyer')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #f59e0b, #ec4899)', color: 'white', fontWeight: 'bold', border: 'none', boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)' }}>
              🎨 Flyers C1 Globales
            </button>;

const r2 = {(currentUser?.isSuperAdmin || currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria' || currentUser?.appRole?.includes('coord')) && (
            <button onClick={() => navigate('/generador-flyer')} className="btn-primary" title="Generador de Flyers Oficiales para Capítulos Uno" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #f59e0b, #ec4899)', color: 'white', fontWeight: 'bold', border: 'none', boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)' }}>
              🎨 Flyers C1 Globales
            </button>
          )};

c = c.replace(t2, r2);
c = c.replace(t2.replace(/\n/g, "\r\n"), r2);

fs.writeFileSync('src/pages/Home.jsx', c, 'utf8');
