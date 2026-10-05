const fs = require('fs');

// Fix Home.jsx
const homePath = 'src/pages/Home.jsx';
let homeCode = fs.readFileSync(homePath, 'utf8');
homeCode = homeCode.replace("            </button>\n)}", "            </button>");
fs.writeFileSync(homePath, homeCode);

// Fix EmbudoConversionBoard.jsx
const embudoPath = 'src/pages/EmbudoConversionBoard.jsx';
let embudoCode = fs.readFileSync(embudoPath, 'utf8');
// Let's rewrite the ternary clearly
const embudoRegex = /\{snapshotData\?\.secciones\?\.reporteAsistenciaPorEquipo \? [\s\S]*?\}\)\) : <tr><td colSpan="13">No data<\/td><\/tr>\}/;

const cleanBlock = `{snapshotData?.secciones?.reporteAsistenciaPorEquipo ? (
                  Object.keys(snapshotData.secciones.reporteAsistenciaPorEquipo).map((k, idx) => {
                    const eqData = snapshotData.secciones.reporteAsistenciaPorEquipo[k];
                    let sc1 = 0, mc2 = 0;
                    if (eqData?.kpis) {
                      eqData.kpis.forEach(kp => {
                        const text = kp.content?.join(' ') || '';
                        if (text.includes('Asistieron') && !isNaN(parseInt(kp.content[0]))) sc1 = parseInt(kp.content[0]);
                        if (text.includes('Pagaron C2') && !isNaN(parseInt(kp.content[0]))) mc2 = parseInt(kp.content[0]);
                      });
                    }
                    return {
                      eq: k,
                      sede: 'NODUS',
                      c1: sc1,
                      promo: mc2,
                      pctPromo: sc1 > 0 ? ((mc2/sc1)*100).toFixed(1) + '%' : '0%',
                      c2: mc2,
                      pctC2: sc1 > 0 ? ((mc2/sc1)*100).toFixed(1) + '%' : '0%',
                      asig: '-',
                      conf: '-',
                      pctConfSent: '-',
                      des: '-',
                      viaje: Math.round(mc2 * 0.75),
                      pctViaje: '83.3%'
                    };
                  }).map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: \`1px solid \${borderCard}\`, background: row.eq === selectedEquipo ? '#1e3a8a33' : 'transparent' }}>
                      <td style={{ padding: '0.8rem', fontWeight: 'bold', color: row.eq === selectedEquipo ? gold : textLight }}>{row.eq}</td>
                      <td style={{ padding: '0.8rem' }}>{row.sede}</td>
                      <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{row.c1}</td>
                      <td style={{ padding: '0.8rem' }}>{row.promo}</td>
                      <td style={{ padding: '0.8rem', color: gold }}>{row.pctPromo}</td>
                      <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{row.c2}</td>
                      <td style={{ padding: '0.8rem' }}>{row.pctC2}</td>
                      <td style={{ padding: '0.8rem' }}>{row.asig}</td>
                      <td style={{ padding: '0.8rem' }}>{row.conf}</td>
                      <td style={{ padding: '0.8rem', color: '#34d399', fontWeight: 'bold' }}>{row.pctConfSent}</td>
                      <td style={{ padding: '0.8rem', color: row.des > 0 ? '#f87171' : textMuted }}>{row.des}</td>
                      <td style={{ padding: '0.8rem' }}>{row.viaje}</td>
                      <td style={{ padding: '0.8rem', color: '#a855f7', fontWeight: 'bold' }}>{row.pctViaje}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="13">No data</td></tr>
                )}`;

embudoCode = embudoCode.replace(embudoRegex, cleanBlock);
fs.writeFileSync(embudoPath, embudoCode);

