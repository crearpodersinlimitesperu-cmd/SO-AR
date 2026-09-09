const fs = require('fs');
const path = 'src/pages/Home.jsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /<button\n\s*onClick=\{\(\) => navigate\('\/metas'\)\}[\s\S]*?🎯 Mis Metas\n\s*<\/button>\n\)}/g;

const replacement = `{canViewMetas && (\n            <button\n              onClick={() => navigate('/metas')}\n              className="btn-secondary"\n              style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}\n            >\n              🎯 Mis Metas\n            </button>\n          )}`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
