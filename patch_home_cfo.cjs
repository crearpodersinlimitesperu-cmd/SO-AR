const fs = require('fs');
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. TOOL_LINKS Array
const toolsTarget = `{ id: 'panel-legal', label: 'Auditoría Legal (Firmas)', emoji: '⚖️', route: '/legal-admin', roles: null, visible: (u) => isDataAdmin(u) },`;
const toolsReplacement = `{ id: 'cfo-dashboard', label: 'Dirección Financiera Global', emoji: '🏦', route: '/cfo-dashboard', roles: null, visible: (u) => ['cfo', 'ceo', 'superadmin', 'direccion'].includes(u?.appRole) || u?.isSuperAdmin },
  { id: 'panel-legal', label: 'Auditoría Legal (Firmas)', emoji: '⚖️', route: '/legal-admin', roles: null, visible: (u) => isDataAdmin(u) },`;
content = content.replace(toolsTarget, toolsReplacement);

// 2. Dropdown Buttons
const dropTarget = `{isDataAdmin(currentUser) && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/legal-admin'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}>
                    ⚖️ Auditoría Legal
                  </button>
                )}`;
const dropReplacement = `{hasRoleAccess(['cfo', 'ceo', 'superadmin', 'direccion']) && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/cfo-dashboard'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', fontWeight: 'bold' }}>
                    🏦 Dirección Financiera Global
                  </button>
                )}
                {isDataAdmin(currentUser) && (
                  <button onClick={() => { setShowToolsDropdown(false); navigate('/legal-admin'); }} className="btn-secondary" style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'flex-start', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}>
                    ⚖️ Auditoría Legal
                  </button>
                )}`;
content = content.replace(dropTarget, dropReplacement);

// 3. Pro Bar Buttons
const barTarget = `{isDataAdmin(currentUser) && (
            <button onClick={() => navigate('/legal-admin')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fbbf24', border: '1px solid #fbbf24' }}>
              ⚖️ Auditoría Legal
            </button>
          )}`;
const barReplacement = `{hasRoleAccess(['cfo', 'ceo', 'superadmin', 'direccion']) && (
            <button onClick={() => navigate('/cfo-dashboard')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #1e293b, #064e3b)', color: '#10b981', border: '1px solid #10b981', fontWeight: 'bold' }}>
              🏦 Dir. Financiera
            </button>
          )}
          {isDataAdmin(currentUser) && (
            <button onClick={() => navigate('/legal-admin')} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fbbf24', border: '1px solid #fbbf24' }}>
              ⚖️ Auditoría Legal
            </button>
          )}`;
content = content.replace(barTarget, barReplacement);

fs.writeFileSync(file, content);
console.log('Home.jsx patched with CFO buttons');
