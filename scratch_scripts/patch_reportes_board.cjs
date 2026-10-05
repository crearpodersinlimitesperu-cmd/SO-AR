const fs = require('fs');

const path = 'src/pages/ReportesBoard.jsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Inyectar canViewLlamadasForm justo después de canViewEvolucionDashboard
const target1 = `  const canViewEvolucionDashboard = Boolean(
    currentUser?.isSuperAdmin ||
    isDireccion ||
    isGerente ||
    ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'superadmin', 'consolidado', 'director_maestria'].includes(role) ||
    roles.some(r => ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'superadmin', 'consolidado', 'director_maestria'].includes(r))
  );`;

const injection1 = `  const canViewEvolucionDashboard = Boolean(
    currentUser?.isSuperAdmin ||
    isDireccion ||
    isGerente ||
    ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'superadmin', 'consolidado', 'director_maestria'].includes(role) ||
    roles.some(r => ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'superadmin', 'consolidado', 'director_maestria'].includes(r))
  );

  const canViewLlamadasForm = Boolean(
    currentUser?.isSuperAdmin ||
    isDireccion ||
    isGerente ||
    ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'superadmin', 'consolidado', 'coord_c1', 'coordinador_c1c2', 'coord_c2'].includes(role) ||
    roles.some(r => ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'superadmin', 'consolidado', 'coord_c1', 'coordinador_c1c2', 'coord_c2'].includes(r))
  );`;
code = code.replace(target1, injection1);

// 2. Wrap CARD 3 in {canViewLlamadasForm && ( ... )}
// The target is EXACTLY the CARD 3 comment
const target2 = `            {/* CARD 3: REPORTE DIARIO DE LLAMADAS (COORDINADORES C1 & C2) */}
            <div 
              onClick={() => {
                setReportType('Llamadas');`;

const injection2 = `            {/* CARD 3: REPORTE DIARIO DE LLAMADAS (COORDINADORES C1 & C2) */}
            {canViewLlamadasForm && (
            <div 
              onClick={() => {
                setReportType('Llamadas');`;
code = code.replace(target2, injection2);

// Close the wrapper right after the card
const target3 = `              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Revisión diaria a las 12:00 M (Nuevos y Rezagados). Precarga automática del último reporte y enlace directo a Nodus.
              </p>
            </div>
          </div>`;

const injection3 = `              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Revisión diaria a las 12:00 M (Nuevos y Rezagados). Precarga automática del último reporte y enlace directo a Nodus.
              </p>
            </div>
            )}
          </div>`;
code = code.replace(target3, injection3);

// And we also need to hide it in the Dropdown below!
// The dropdown has: <option value="Llamadas">📞 Reporte Diario de Llamadas (12:00 M)</option>
const target4 = `<option value="Llamadas">📞 Reporte Diario de Llamadas (12:00 M)</option>`;
const injection4 = `{canViewLlamadasForm && <option value="Llamadas">📞 Reporte Diario de Llamadas (12:00 M)</option>}`;
code = code.replace(target4, injection4);


fs.writeFileSync(path, code);
