const fs = require('fs');
let content = fs.readFileSync('src/pages/Home.jsx', 'utf8');

const replacement = {hasRoleAccess(['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin']) && (
                  <>
                    <button
                      className="btn-secondary hover-glow"
                      onClick={() => navigate('/superadmin')}
                      title="Directorio Global — Panel Super Admin"
                      style={{ flex: 1, minWidth: '150px', padding: '0.85rem 1rem', fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'rgba(139, 92, 246, 0.12)', borderColor: 'rgba(139, 92, 246, 0.4)', color: '#a78bfa' }}
                    >
                      ?? Directorio Global
                    </button>
                    <button
                      className="btn-secondary hover-glow"
                      onClick={() => navigate('/crm-maestro')}
                      title="Base Maestra CRM"
                      style={{ flex: 1, minWidth: '150px', padding: '0.85rem 1rem', fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'rgba(52, 211, 153, 0.12)', borderColor: 'rgba(52, 211, 153, 0.4)', color: '#34d399' }}
                    >
                      <Users size={18} /> CRM Nodus
                    </button>
                  </>
                )};

// We replace the block matching "Directorio Global — Panel Super Admin"
content = content.replace(/\{hasRoleAccess\(\['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin'\]\) && \([\s\S]*??? Directorio Global[\s\S]*?<\/button>\s*\)\}/m, replacement);

fs.writeFileSync('src/pages/Home.jsx', content);
console.log('done');
