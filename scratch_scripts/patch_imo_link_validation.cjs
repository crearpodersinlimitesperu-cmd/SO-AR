const fs = require('fs');
const path = './src/pages/MonitorImos.jsx';
let content = fs.readFileSync(path, 'utf8');

const regexModal = /<div className="glass-panel" style={{ background: 'var\(--bg-card\)', padding: '2\.5rem', borderRadius: '16px', maxWidth: '600px', width: '100%', border: '1px solid var\(--border-subtle\)', boxShadow: '0 25px 50px -12px rgba\(0, 0, 0, 0\.5\)' }}>([\s\S]*?)<\/button>\s*<\/div>\s*<\/div>/;

const newModalContent = `<div className="glass-panel" style={{ background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '16px', maxWidth: '600px', width: '100%', border: '1px solid var(--border-subtle)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <h2 style={{ margin: '0 0 1rem 0', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.4rem' }}>
              🔗 Generador de Link IMO (Linaje)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Comparte este enlace único con los IMOs para que reporten el estado de sus enrolados. 
              <br/><br/>
              <strong style={{ color: '#38bdf8' }}>Regla de Linaje Dinámica (N-3, N-2, N-1):</strong> El sistema generará el link automáticamente para el equipo destino actual.
              <br/><br/>
              {(() => {
                if (filterSede === 'todos' || filterEquipo === 'todos') {
                   return (
                     <div style={{ background: 'rgba(255, 183, 3, 0.1)', borderLeft: '4px solid #ffb703', padding: '10px 15px', borderRadius: '0 6px 6px 0', marginTop: '10px', color: '#e2e8f0', fontSize: '0.9rem' }}>
                       ⚠️ <strong>Atención:</strong> Por favor selecciona una <strong>Sede específica</strong> y un <strong>Equipo específico</strong> en los filtros arriba para poder generar el enlace coherente.
                     </div>
                   );
                }
                
                const match = filterEquipo.match(/\\d+/);
                if (match) {
                  const n = parseInt(match[0], 10);
                  if (n > 3) {
                    return (
                      <div style={{ background: 'rgba(56, 189, 248, 0.1)', borderLeft: '4px solid #38bdf8', padding: '10px 15px', borderRadius: '0 6px 6px 0', marginTop: '10px', color: '#e2e8f0' }}>
                        Configuración detectada para <strong>Equipo {n} ({filterSede})</strong>:
                        <br/>
                        IMOs de Equipos <strong>{n-3}, {n-2} y {n-1}</strong> enrolan para el <strong>Equipo {n}</strong>.
                      </div>
                    );
                  }
                }
                return null;
              })()}
            </p>
            
            {(filterSede !== 'todos' && filterEquipo !== 'todos') ? (
              <div style={{ background: '#0f172a', padding: '1.2rem', borderRadius: '8px', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                {(() => {
                    let sedeStr = filterSede.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z]/g, '');
                    let eqStr = '';
                    const match = filterEquipo.match(/\\d+/);
                    if (match) {
                      eqStr = 'e' + match[0];
                    } else {
                      eqStr = filterEquipo.replace(/\\s+/g, '').toLowerCase();
                    }
                    const dynamicLink = \`https://crearpsl.net/imos\${eqStr}\${sedeStr}/\`;
                    
                    return (
                      <>
                        <span style={{ color: '#10b981', fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {dynamicLink}
                        </span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(dynamicLink);
                            alert('¡Link copiado al portapapeles!');
                          }} 
                          style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', transition: 'background 0.2s', boxShadow: '0 4px 6px rgba(56, 189, 248, 0.3)' }}
                          onMouseOver={(e) => e.currentTarget.style.background = '#0ea5e9'}
                          onMouseOut={(e) => e.currentTarget.style.background = '#38bdf8'}
                        >
                          Copiar Link
                        </button>
                      </>
                    );
                })()}
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center', color: '#64748b', marginBottom: '2rem', fontStyle: 'italic' }}>
                El enlace dinámico aparecerá aquí cuando selecciones el equipo.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowImoLinkModal(false)} className="btn-secondary" style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', padding: '0.6rem 1.5rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>`;

content = content.replace(regexModal, newModalContent);
fs.writeFileSync(path, content, 'utf8');
console.log("Modal de IMO refactorizado para forzar validación y UI correcta.");
