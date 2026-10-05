const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');

// Inject the variable
const target1 = "export default function Home() {";
const injection = `
  const canViewMetas = Boolean(
    currentUser?.isSuperAdmin ||
    currentUser?.isDireccion ||
    currentUser?.isGerente ||
    ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin', 'consolidado', 'coord_c1', 'coordinador_c1c2', 'coord_c2', 'coord_maestria', 'coordinador_mj'].includes(currentUser?.activeRole || currentUser?.appRole || currentUser?.role) ||
    (currentUser?.roles || []).some(r => ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin', 'consolidado', 'coord_c1', 'coordinador_c1c2', 'coord_c2', 'coord_maestria', 'coordinador_mj'].includes(r))
  );
`;
if (!code.includes('const canViewMetas =')) {
    code = code.replace(target1, target1 + injection);
}

// 1. Roles array in Grid
code = code.replace(/\{ id: 'metas', label: 'Mis Metas', emoji: '🏆', route: '\/metas', roles: null \},/g, "{ id: 'metas', label: 'Mis Metas', emoji: '🏆', route: '/metas', roles: ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin', 'consolidado', 'coord_c1', 'coordinador_c1c2', 'coord_c2', 'coord_maestria', 'coordinador_mj'] },");

// 2. Compact button
const compactRegex = /<button[\s\S]*?onClick=\{\(\) => navigate\('\/metas'\)\}[\s\S]*?className="btn-secondary"[\s\S]*?style=\{\{ padding: '0\.45rem 0\.9rem', fontSize: '0\.85rem' \}\}[\s\S]*?>[\s\S]*?🎯 Mis Metas[\s\S]*?<\/button>/;
code = code.replace(compactRegex, match => `{canViewMetas && (\n${match}\n)}`);

// 3. List button
const listRegex = /<button[\s\S]*?className="btn-secondary"[\s\S]*?onClick=\{\(\) => navigate\('\/metas'\)\}[\s\S]*?style=\{\{ flex: 1, minWidth: '130px', padding: '0\.85rem 1rem', fontSize: '0\.95rem', fontWeight: 'bold' \}\}[\s\S]*?>[\s\S]*?🎯 Mis Metas[\s\S]*?<\/button>/;
code = code.replace(listRegex, match => `{canViewMetas && (\n${match}\n)}`);

// 4. Footer button
const footerRegex = /<button className="btn-secondary" onClick=\{\(\) => navigate\('\/metas'\)\} style=\{\{ padding: '0\.8rem 1\.4rem', fontSize: '1rem', fontWeight: 'bold' \}\}>[\s\S]*?VER MIS METAS[\s\S]*?<\/button>/;
code = code.replace(footerRegex, match => `{canViewMetas && (\n${match}\n)}`);

fs.writeFileSync('src/pages/Home.jsx', code);
