const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');

const b1 = `<button
              onClick={() => navigate('/metas')}
              className="btn-secondary"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
            >
              🎯 Mis Metas
            </button>`;
code = code.replace(b1, `{canViewMetas && (\n            ` + b1 + `\n            )}`);

const b2 = `<button
                className="btn-secondary"
                onClick={() => navigate('/metas')}
                style={{ flex: 1, minWidth: '130px', padding: '0.85rem 1rem', fontSize: '0.95rem', fontWeight: 'bold' }}
              >
                🎯 Mis Metas
              </button>`;
code = code.replace(b2, `{canViewMetas && (\n              ` + b2 + `\n              )}`);

fs.writeFileSync('src/pages/Home.jsx', code);
