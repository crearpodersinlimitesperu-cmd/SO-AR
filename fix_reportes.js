const fs = require('fs');

const path = 'src/pages/ReportesBoard.jsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add canViewLlamadasForm
const roleBlock = "  const isGerente = currentUser?.isGerente || role === 'gerente' || roles.includes('gerente');";
if (!code.includes('const canViewLlamadasForm =')) {
  code = code.replace(roleBlock, roleBlock + `

  const canViewLlamadasForm = Boolean(
    currentUser?.isSuperAdmin ||
    isDireccion ||
    isGerente ||
    ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'superadmin', 'consolidado', 'coord_c1', 'coordinador_c1c2', 'coord_c2'].includes(role) ||
    roles.some(r => ['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'superadmin', 'consolidado', 'coord_c1', 'coordinador_c1c2', 'coord_c2'].includes(r))
  );
  `);
}

// 2. Hide Card 3
if (!code.includes('{canViewLlamadasForm && (\\n            <div \\n              onClick={() => {\\n                setReportType(\\'Llamadas\\');')) {
  const cardStart = `{/* CARD 3: REPORTE DIARIO DE LLAMADAS (COORDINADORES C1 & C2) */}`;
  code = code.replace(
    cardStart + `
            <div 
              onClick={() => {
                setReportType('Llamadas');`,
    cardStart + `
            {canViewLlamadasForm && (
            <div 
              onClick={() => {
                setReportType('Llamadas');`
  );
  
  const cardEnd = `Revisión diaria a las 12:00 M (Nuevos y Rezagados). Precarga automática del último reporte y enlace directo a Nodus.
              </p>
            </div>
          </div>`;
  code = code.replace(cardEnd, `Revisión diaria a las 12:00 M (Nuevos y Rezagados). Precarga automática del último reporte y enlace directo a Nodus.
              </p>
            </div>
            )}
          </div>`);
}

// 3. Hide Dropdown
code = code.replace('<option value="Llamadas">1. Reporte de Llamadas (C1)</option>', '{canViewLlamadasForm && <option value="Llamadas">1. Reporte de Llamadas (C1)</option>}');

fs.writeFileSync(path, code);
