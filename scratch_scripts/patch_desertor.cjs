const fs = require('fs');
const file = 'src/pages/CentroManagers.jsx';
let content = fs.readFileSync(file, 'utf8');

// Modificar equiposParaLiquidacion para agregar 'estados'
content = content.replace(
  "entrenadores: new Set(), cierreManual: null",
  "entrenadores: new Set(), estados: new Set(), cierreManual: null"
);

content = content.replace(
  "teams[key].entrenadores.add(t));",
  "teams[key].entrenadores.add(t));\n      teams[key].estados.add(normalizeManagerEstado(m.estado));"
);

// Modificar liquidacionData para usar estados
const targetLogic = `      const cumpleLlamadas = count >= 7;
      const cumpleCierre = !!cierreManual;`;

const replacementLogic = `      const infoEquipoFull = equiposParaLiquidacion[equipoKey] || { estados: new Set() };
      const sinActivos = !infoEquipoFull.estados.has('Activo');
      const tieneDesertorOGraduado = infoEquipoFull.estados.has('Desertor') || infoEquipoFull.estados.has('Graduado');
      const esEquipoInactivo = sinActivos && tieneDesertorOGraduado;

      const cumpleLlamadas = count >= 7;
      const cumpleCierre = !!cierreManual || (esEquipoInactivo && count >= 5);`;

content = content.replace(targetLogic, replacementLogic);

// Además, cuando mostramos el motivo en la tabla, mostrar "Desertor" si aplica
const targetMotivo = `motivo: cumpleLlamadas ? 'llamadas' : 'cierre_manual',`;
const replacementMotivo = `motivo: cumpleLlamadas ? 'llamadas' : (!!cierreManual ? 'cierre_manual' : 'desertor_automatico'),`;
content = content.replace(targetMotivo, replacementMotivo);

// Y en el render:
const targetRenderMotivo = `                                {item.motivo === 'cierre_manual' ? (
                                  <span title={item.cierreManual?.porNombre ? \`Cerrado por \${item.cierreManual.porNombre}\` : ''} style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.5rem', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    🔒 Equipo cerrado
                                  </span>
                                ) : (
                                  <span style={{ background: '#fefce8', color: '#a16207', padding: '0.2rem 0.5rem', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }} title={item.fechaAlcanzo7 ? \`Llegó a 7 el \${item.fechaAlcanzo7}\` : ''}>
                                    ⭐ 7 llamadas
                                  </span>
                                )}`;

const replacementRenderMotivo = `                                {item.motivo === 'cierre_manual' ? (
                                  <span title={item.cierreManual?.porNombre ? \`Cerrado por \${item.cierreManual.porNombre}\` : ''} style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.5rem', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    🔒 Equipo cerrado
                                  </span>
                                ) : item.motivo === 'desertor_automatico' ? (
                                  <span style={{ background: '#fef2f2', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    ⚠️ Inactivo / Desertor
                                  </span>
                                ) : (
                                  <span style={{ background: '#fefce8', color: '#a16207', padding: '0.2rem 0.5rem', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }} title={item.fechaAlcanzo7 ? \`Llegó a 7 el \${item.fechaAlcanzo7}\` : ''}>
                                    ⭐ 7 llamadas
                                  </span>
                                )}`;

content = content.replace(targetRenderMotivo, replacementRenderMotivo);

fs.writeFileSync(file, content);
console.log('Patch desertores done');
