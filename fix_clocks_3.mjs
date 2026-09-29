import fs from 'fs';
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

const startIdx = content.indexOf('{/* 👤 RELOJ LOCAL (Ubicación');
if (startIdx === -1) {
  console.log("Could not find start");
  process.exit(1);
}

// Find the end of the Colombia block
const columbiaStr = "RELOJ COLOMBIA";
const columbiaIdx = content.indexOf(columbiaStr, startIdx);
if (columbiaIdx === -1) {
  console.log("Could not find columbia");
  process.exit(1);
}

const endDivIdx = content.indexOf('</div>', columbiaIdx);
const finalEndIdx = content.indexOf('</div>', endDivIdx + 1) + 6;

const replacement = `{/* 📍 RELOJ LOCAL (Ubicación del Usuario) 📍 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: viewMode === 'lite' ? '#f8fafc' : 'rgba(255,255,255,0.05)', borderRadius: '8px',
              padding: '3px 8px', border: viewMode === 'lite' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)'
            }}>
              {localCountryCode ? (
                <img src={flagUrl(localCountryCode)} alt="Tu Ubicación" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} />
              ) : (
                <span style={{ fontSize: '14px' }}>📍</span>
              )}
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

            {/* 🇲🇽 RELOJ CDMX 🇲🇽 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: viewMode === 'lite' ? '#f8fafc' : 'rgba(255,255,255,0.05)', borderRadius: '8px',
              padding: '3px 8px', border: viewMode === 'lite' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)'
            }}>
              <img src={flagUrl('mx')} alt="Mexico" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.92rem', color: viewMode === 'lite' ? '#0f172a' : '#e2e8f0', letterSpacing: '0.5px' }}>
                  {getTimeInZone('America/Mexico_City')}
                </span>
                <span style={{ fontSize: '0.7rem', color: viewMode === 'lite' ? '#64748b' : '#94a3b8' }}>
                  {getDateInZone('America/Mexico_City')}
                </span>
              </div>
            </div>

            <span style={{ color: viewMode === 'lite' ? '#cbd5e1' : 'rgba(255,255,255,0.2)', fontSize: '0.9rem' }}>|</span>

            {/* 🇪🇨 🇵🇪 🇨🇴 RELOJ ECU/PER/COL (UTC-5) */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: viewMode === 'lite' ? '#f8fafc' : 'rgba(255,255,255,0.05)', borderRadius: '8px',
              padding: '3px 8px', border: viewMode === 'lite' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ display: 'flex', gap: '3px' }}>
                <img src={flagUrl('ec')} alt="Ecuador" title="Ecuador" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} />
                <img src={flagUrl('pe')} alt="Peru" title="Perú" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} />
                <img src={flagUrl('co')} alt="Colombia" title="Colombia" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, marginLeft: '2px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.92rem', color: viewMode === 'lite' ? '#0f172a' : '#e2e8f0', letterSpacing: '0.5px' }}>
                  {getTimeInZone('America/Lima')}
                </span>
                <span style={{ fontSize: '0.7rem', color: viewMode === 'lite' ? '#64748b' : '#94a3b8' }}>
                  {getDateInZone('America/Lima')}
                </span>
              </div>
            </div>`;

content = content.substring(0, startIdx) + replacement + content.substring(finalEndIdx);
fs.writeFileSync(file, content, 'utf8');
console.log("Replaced successfully!");
