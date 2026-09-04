const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');

const desktopTarget = 
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <button
                onClick={() => navigate('/generador-flyer')}
                className="btn-secondary"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.5)', background: 'rgba(245, 158, 11, 0.12)', fontWeight: 'bold' }}
              >
                🎨 Generador Flyers
              </button>
            </div>
;

const desktopReplace = 
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              {(currentUser?.isSuperAdmin || currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria' || currentUser?.appRole?.includes('coord')) && (
                <button
                  onClick={() => navigate('/generador-flyer')}
                  className="btn-secondary"
                  title="Generador de Flyers Oficiales para Capítulos Uno"
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.5)', background: 'rgba(245, 158, 11, 0.12)', fontWeight: 'bold' }}
                >
                  🎨 Flyers C1 Globales
                </button>
              )}
            </div>
;

const mobileTarget = 
            <button onClick={() => navigate('/generador-flyer')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #f59e0b, #ec4899)', color: 'white', fontWeight: 'bold', border: 'none', boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)' }}>
              🎨 Generador Flyers
            </button>
;

const mobileReplace = 
            {(currentUser?.isSuperAdmin || currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria' || currentUser?.appRole?.includes('coord')) && (
              <button onClick={() => navigate('/generador-flyer')} className="btn-primary" title="Generador de Flyers Oficiales para Capítulos Uno" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #f59e0b, #ec4899)', color: 'white', fontWeight: 'bold', border: 'none', boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)' }}>
                🎨 Flyers C1 Globales
              </button>
            )}
;

code = code.replace(desktopTarget, desktopReplace);
code = code.replace(mobileTarget, mobileReplace);
fs.writeFileSync('src/pages/Home.jsx', code, 'utf8');
