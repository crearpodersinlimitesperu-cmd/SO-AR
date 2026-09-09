const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');

const injection = `
  const canViewMetas = Boolean(
    currentUser?.isSuperAdmin ||
    currentUser?.isDireccion ||
    currentUser?.isGerente ||
    ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin', 'consolidado', 'coord_c1', 'coordinador_c1c2', 'coord_c2', 'coord_maestria', 'coordinador_mj'].includes(currentUser?.activeRole || currentUser?.appRole || currentUser?.role) ||
    (currentUser?.roles || []).some(r => ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin', 'consolidado', 'coord_c1', 'coordinador_c1c2', 'coord_c2', 'coord_maestria', 'coordinador_mj'].includes(r))
  );
`;

const target1 = "export default function Home() {";
if (!code.includes('const canViewMetas =')) {
    code = code.replace(target1, target1 + injection);
}

// Line 587
code = code.replace("{ id: 'metas', label: 'Mis Metas', emoji: '🏆', route: '/metas', roles: null },", "{ id: 'metas', label: 'Mis Metas', emoji: '🏆', route: '/metas', roles: ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin', 'consolidado', 'coord_c1', 'coordinador_c1c2', 'coord_c2', 'coord_maestria', 'coordinador_mj'] },");

// Line 1530:
const targetCompact = `<button
              onClick={() => navigate('/metas')}
              className="btn-secondary"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
            >
              🎯 Mis Metas
            </button>`;
const newCompact = `{canViewMetas && (
            <button
              onClick={() => navigate('/metas')}
              className="btn-secondary"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
            >
              🎯 Mis Metas
            </button>
            )}`;
code = code.replace(targetCompact, newCompact);

// Line 2021:
const targetList = `<button
                className="btn-secondary"
                onClick={() => navigate('/metas')}
                style={{ flex: 1, minWidth: '130px', padding: '0.85rem 1rem', fontSize: '0.95rem', fontWeight: 'bold' }}
              >
                🎯 Mis Metas
              </button>`;
const newList = `{canViewMetas && (
              <button
                className="btn-secondary"
                onClick={() => navigate('/metas')}
                style={{ flex: 1, minWidth: '130px', padding: '0.85rem 1rem', fontSize: '0.95rem', fontWeight: 'bold' }}
              >
                🎯 Mis Metas
              </button>
              )}`;
code = code.replace(targetList, newList);

// Line 2623:
const targetFooter = `<button className="btn-secondary" onClick={() => navigate('/metas')} style={{ padding: '0.8rem 1.4rem', fontSize: '1rem', fontWeight: 'bold' }}>
                VER MIS METAS
              </button>`;
const newFooter = `{canViewMetas && (
              <button className="btn-secondary" onClick={() => navigate('/metas')} style={{ padding: '0.8rem 1.4rem', fontSize: '1rem', fontWeight: 'bold' }}>
                VER MIS METAS
              </button>
              )}`;
code = code.replace(targetFooter, newFooter);

fs.writeFileSync('src/pages/Home.jsx', code);
