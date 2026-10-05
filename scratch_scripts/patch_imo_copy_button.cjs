const fs = require('fs');
const path = './src/pages/MonitorImos.jsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /<div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>([\\s\\S]*?)<\/button>\\s*<\/div>/g;

const replacement = `<div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
              {(() => {
                  let sedeStr = filterSede === 'todos' ? 'SEDE' : filterSede.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z]/g, '');
                  let eqStr = 'EQUIPO';
                  const match = filterEquipo.match(/\\d+/);
                  if (match) {
                    eqStr = 'e' + match[0];
                  } else if (filterEquipo !== 'todos') {
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
                        style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', transition: 'background 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#0ea5e9'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#38bdf8'}
                      >
                        Copiar Link
                      </button>
                    </>
                  );
              })()}
            </div>`;

content = content.replace(regex, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log("Botón de copiado y Link dinámico configurados correctamente.");
