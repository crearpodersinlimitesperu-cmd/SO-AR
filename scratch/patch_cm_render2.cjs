const fs = require('fs');
let code = fs.readFileSync('src/pages/CentroManagers.jsx', 'utf8');

const target2 =                             {mTrainers.length > 0 && mTrainers[0] !== "" ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                {mTrainers.map(t => (
                                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>;

const replacement2 =                             {mTrainers.length > 0 && mTrainers[0] !== "" ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                {mTrainers.map(t => (
                                  <button key={t} onClick={() => handleTrainerClick(t)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>;

const target3 =                                   </span>
                                ))}
                              </div>
                            ) : (;

const replacement3 =                                   </button>
                                ))}
                              </div>
                            ) : (;

code = code.replace(target2, replacement2).replace(target3, replacement3);
fs.writeFileSync('src/pages/CentroManagers.jsx', code, 'utf8');
