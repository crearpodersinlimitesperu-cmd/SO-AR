const fs = require('fs');
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

let newContent = content.replace(/color: '#e2e8f0'/g, "color: viewMode === 'lite' ? '#0f172a' : '#e2e8f0'");
newContent = newContent.replace(/color: '#94a3b8'/g, "color: viewMode === 'lite' ? '#64748b' : '#94a3b8'");
newContent = newContent.replace(/color: 'rgba\\(255,255,255,0\\.2\\)'/g, "color: viewMode === 'lite' ? '#cbd5e1' : 'rgba(255,255,255,0.2)'");
newContent = newContent.replace(/background: 'rgba\\(255,255,255,0\\.05\\)'/g, "background: viewMode === 'lite' ? '#f8fafc' : 'rgba(255,255,255,0.05)'");
newContent = newContent.replace(/border: '1px solid rgba\\(255,255,255,0\\.1\\)'/g, "border: viewMode === 'lite' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)'");

// Add local clock right after flexWrap: 'wrap' }}>
const clockInjection = `
            {/* 👤 RELOJ LOCAL (Ubicación del Usuario) 👤 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: viewMode === 'lite' ? '#f8fafc' : 'rgba(255,255,255,0.05)', borderRadius: '8px',
              padding: '3px 8px', border: viewMode === 'lite' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)'
            }}>
              <span style={{ fontSize: '14px' }}>📍</span>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.92rem', color: viewMode === 'lite' ? '#0f172a' : '#e2e8f0', letterSpacing: '0.5px' }}>
                  {time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span style={{ fontSize: '0.7rem', color: viewMode === 'lite' ? '#64748b' : '#94a3b8' }}>
                  {time.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '')} (TÚ)
                </span>
              </div>
            </div>

            <span style={{ color: viewMode === 'lite' ? '#cbd5e1' : 'rgba(255,255,255,0.2)', fontSize: '0.9rem' }}>|</span>
`;
newContent = newContent.replace(/<div style={{ display: 'flex', alignItems: 'center', gap: '0\.8rem', marginTop: '0\.8rem', flexWrap: 'wrap' }}>/g, 
  `<div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>\n${clockInjection}`
);

fs.writeFileSync(file, newContent);
console.log('Colors and clock fixed.');
