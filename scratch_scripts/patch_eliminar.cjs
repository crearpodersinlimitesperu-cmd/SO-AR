const fs = require('fs');
const file = 'src/pages/CentroManagers.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Agregar handleEliminarLiquidacion después de handleMarcarPagado
const hookCode = `
  const handleEliminarLiquidacion = async (item) => {
    if (!canViewLiquidacion) return;
    if (!window.confirm(\`¿Estás seguro de que deseas ocultar/eliminar el equipo \${item.equipo} de esta lista? Esto no borra el equipo del sistema, solo lo remueve del reporte de pagos pendientes.\`)) return;

    try {
      await setDoc(doc(db, 'liquidaciones_pagos', item.equipoKey), {
        equipoKey: item.equipoKey,
        equipo: item.equipo,
        numEquipo: item.numEquipo || '',
        sede: item.sede,
        estado: 'eliminado',
        eliminadoPorEmail: currentUser?.email || '',
        eliminadoPorNombre: currentUser?.name || '',
        fechaEliminacion: new Date().toISOString(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      recordAuditEvent({
        action: 'ELIMINAR_CANDIDATO_PAGO',
        details: \`Candidato a pago de equipo \${item.equipo} marcado como eliminado/ignorado.\`,
        module: 'Liquidacion_Equipos'
      });
      showToast(\`El equipo \${item.equipo} fue retirado de la lista de pendientes.\`, 'success');
    } catch (e) {
      console.error(e);
      showToast("Error al ocultar el equipo.", "error");
    }
  };
`;

content = content.replace(
  "const handleMarcarPagado = async (item) => {",
  hookCode + "\n\n  const handleMarcarPagado = async (item) => {"
);

// 2. Modificar el useMemo de liquidacionData para ignorar los eliminados
const ignoreCode = `
      if (pago && pago.estado === 'eliminado') {
        return; // Ignorar el equipo completamente
      }
      const item = {
`;

content = content.replace(
  /const item = \{[\s\S]*?equipoKey,/,
  ignoreCode + "\n        equipoKey,"
);

// 3. Reemplazar el botón en la tabla por los dos botones
const buttonCode = `
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'nowrap' }}>
                                  <button
                                    onClick={() => handleMarcarPagado(item)}
                                    style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                                  >
                                    Marcar como pagado
                                  </button>
                                  <button
                                    onClick={() => handleEliminarLiquidacion(item)}
                                    title="Ocultar / Eliminar de esta lista"
                                    style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: 'none', background: '#fef2f2', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
`;

content = content.replace(
  /<button[\s\S]*?onClick=\{\(\) => handleMarcarPagado\(item\)\}[\s\S]*?Marcar como pagado[\s\S]*?<\/button>/g,
  buttonCode
);

fs.writeFileSync(file, content);
console.log('Patch aplicado correctamente');
