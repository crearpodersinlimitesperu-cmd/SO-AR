const fs = require('fs');
const path = 'src/pages/Home.jsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Remove the "MI SEDE" / "GLOBAL" toggles and replace them with just "MIS FECHAS" if trainer
const tabsRegex = /<div style=\{\{ display: 'flex', gap: '0\.4rem', borderLeft: '1px solid rgba\(255,255,255,0\.1\)', paddingLeft: '0\.6rem' \}\}>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const newTabs = `<div style={{ display: 'flex', gap: '0.4rem', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '0.6rem' }}>
                    {['entrenador', 'entrenador_llamadas'].includes(currentUser?.appRole) && (
                      <span style={{ color: 'var(--crear-gold)', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        MIS FECHAS
                      </span>
                    )}
                  </div>
                </div>
              </div>`;

code = code.replace(tabsRegex, newTabs);

// 2. Add the Sede selector next to the Training filter
const filtersRegex = /<select \n\s*value=\{selectedTrainingFilter\}[\s\S]*?<\/select>\n\s*<\/div>/;

const newFilters = `<select 
                    value={selectedTrainingFilter}
                    onChange={(e) => setSelectedTrainingFilter(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    <option value="todos" style={{ background: '#0d152d' }}>Todos los tipos</option>
                    <option value="C1" style={{ background: '#0d152d' }}>Capítulo 1</option>
                    <option value="C2" style={{ background: '#0d152d' }}>Capítulo 2</option>
                    <option value="MJ" style={{ background: '#0d152d' }}>Maestría del Juego</option>
                    <option value="C3" style={{ background: '#0d152d' }}>Capítulo 3</option>
                  </select>
                </div>

                {((currentUser?.isSuperAdmin && !currentUser?.isSimulated) || currentUser?.isDireccion || currentUser?.isGerente || ['gerente', 'direccion', 'director_maestria', 'cfo', 'superadmin'].includes(currentUser?.appRole)) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ fontSize: '13px' }}>📍</span>
                    <select 
                      value={selectedSedeFilter}
                      onChange={(e) => setSelectedSedeFilter(e.target.value)}
                      style={{ background: 'rgba(255,255,255,0.07)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      <option value="todas" style={{ background: '#0d152d' }}>Todas las sedes</option>
                      <option value="misede" style={{ background: '#0d152d' }}>Mi Sede</option>
                      <option value="lima" style={{ background: '#0d152d' }}>Lima</option>
                      <option value="quito" style={{ background: '#0d152d' }}>Quito</option>
                      <option value="cuenca" style={{ background: '#0d152d' }}>Cuenca</option>
                      <option value="guayaquil" style={{ background: '#0d152d' }}>Guayaquil</option>
                      <option value="mexico" style={{ background: '#0d152d' }}>México</option>
                      <option value="medellin" style={{ background: '#0d152d' }}>Medellín</option>
                    </select>
                  </div>
                )}`;

code = code.replace(filtersRegex, newFilters);

fs.writeFileSync(path, code);
