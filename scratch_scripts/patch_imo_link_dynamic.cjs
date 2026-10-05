const fs = require('fs');
const path = './src/pages/MonitorImos.jsx';
let content = fs.readFileSync(path, 'utf8');

const oldLinkSpan = `<span style={{ color: '#10b981', fontFamily: 'monospace', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                https://crearpsl.net/imo/registro-progreso?sede={filterSede}&linaje=auto
              </span>`;

const newLinkSpan = `<span style={{ color: '#10b981', fontFamily: 'monospace', fontSize: '1rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {(() => {
                  let sedeStr = filterSede === 'todos' ? 'SEDE' : filterSede.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z]/g, '');
                  let eqStr = 'EQUIPO';
                  const match = filterEquipo.match(/\\d+/);
                  if (match) {
                    eqStr = 'e' + match[0];
                  } else if (filterEquipo !== 'todos') {
                    eqStr = filterEquipo.replace(/\\s+/g, '').toLowerCase();
                  }
                  return \`https://crearpsl.net/imos\${eqStr}\${sedeStr}/\`;
                })()}
              </span>`;

content = content.replace(oldLinkSpan, newLinkSpan);
fs.writeFileSync(path, content, 'utf8');
console.log("Link dinámico de IMO configurado correctamente.");
