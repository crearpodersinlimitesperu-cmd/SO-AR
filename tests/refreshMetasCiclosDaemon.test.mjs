import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarSede,
  estructurar3RIsTransicion,
  refreshMetasCicloGraduacion,
  SEDES_VALIDAS
} from '../scripts/refreshMetasCiclosDaemon.mjs';

test('normalizarSede converts abbreviations and names to canonical sede', () => {
  assert.equal(normalizarSede('LIM'), 'Lima');
  assert.equal(normalizarSede('UIO'), 'Quito');
  assert.equal(normalizarSede('GYE'), 'Guayaquil');
  assert.equal(normalizarSede('CUE'), 'Cuenca');
  assert.equal(normalizarSede('MED'), 'Medellín');
  assert.equal(normalizarSede('CDMX'), 'México');
  assert.equal(normalizarSede('MTY'), 'Monterrey');
  assert.equal(normalizarSede('Monterrey'), 'Monterrey');
  assert.equal(normalizarSede('Cuenca'), 'Cuenca');
});

test('estructurar3RIsTransicion generates exactly 3 RIs with strict partner terminology and EMPOR reset', () => {
  const fisPrevios = [
    { titulo: 'Aumentar ventas $15,000 USD', categoria: 'Financiera', metrica_objetivo: 15000 },
    { titulo: 'Certificación Profesional', categoria: 'Profesional', metrica_objetivo: 100 }
  ];

  const participante = { partnerNombre: 'Diana Morales' };
  const tresRIs = estructurar3RIsTransicion(fisPrevios, participante);

  assert.equal(tresRIs.length, 3, 'Debe haber exactamente 3 Resultados Imposibles');
  
  // Verificación de terminología estricta: NUNCA sombra
  const jsonStr = JSON.stringify(tresRIs);
  assert.ok(!jsonStr.toLowerCase().includes('sombra'), "Queda terminantemente prohibido el término 'sombra'");
  
  // Verificación de partner asignado y rol
  tresRIs.forEach((ri, idx) => {
    assert.equal(ri.prioridad, idx + 1);
    assert.equal(ri.estadoAprobacion, 'EN_REVISION_PARTNER');
    assert.equal(ri.metrica_actual, 0, 'La métrica actual debe reiniciarse para el nuevo ciclo');
    assert.equal(ri.partnerAsignado.rol, 'partner');
    assert.equal(ri.partnerAsignado.nombre, 'Diana Morales');
    assert.equal(ri.evaluacionEMPOR.estado, 'PENDIENTE_AUDITORIA');
    assert.equal(ri.evaluacionEMPOR.puntaje, 0);
  });
});

test('refreshMetasCicloGraduacion performs idempotent transition, filters demo accounts and updates cache invalidation in mock DB', async () => {
  const fakeDocs = [
    {
      id: 'doc-1',
      data: () => ({
        nombre: 'Participante Activo 1',
        sede: 'Lima',
        equipo: 'Equipo 1',
        cycleId: 'C1',
        activo: true,
        fis: [{ titulo: 'Meta 1' }, { titulo: 'Meta 2' }]
      }),
      ref: { id: 'doc-1' }
    },
    {
      id: 'doc-demo',
      data: () => ({
        nombre: 'Usuario Demo',
        sede: 'Lima',
        equipo: 'Equipo 1000 (DEMO)',
        cycleId: 'C1',
        activo: true,
        fis: []
      }),
      ref: { id: 'doc-demo' }
    }
  ];

  const committedBatches = [];
  const systemMetadataWrites = [];
  const auditLogWrites = [];

  const mockDb = {
    collection: (colName) => {
      if (colName === 'nodus_futuros_imposibles') {
        return {
          where: () => ({
            where: () => ({
              where: () => ({
                get: async () => ({
                  size: fakeDocs.length,
                  empty: false,
                  forEach: (cb) => fakeDocs.forEach(cb)
                })
              }),
              get: async () => ({
                size: fakeDocs.length,
                empty: false,
                forEach: (cb) => fakeDocs.forEach(cb)
              })
            })
          })
        };
      }
      if (colName === 'system_metadata') {
        return {
          doc: (docId) => ({
            set: async (data, opts) => {
              systemMetadataWrites.push({ docId, data, opts });
            }
          })
        };
      }
      if (colName === 'audit_logs') {
        return {
          add: async (data) => {
            auditLogWrites.push(data);
          }
        };
      }
      return {};
    },
    batch: () => {
      const ops = [];
      return {
        set: (ref, patch, opts) => ops.push({ ref, patch, opts }),
        commit: async () => {
          committedBatches.push([...ops]);
        }
      };
    }
  };

  const res = await refreshMetasCicloGraduacion({
    sede: 'Lima',
    cicloIdOrigen: 'C1',
    cicloIdDestino: 'C2',
    dryRun: false,
    db: mockDb
  });

  assert.equal(res.participantesProcesados, 2);
  assert.equal(res.participantesActualizados, 1, 'Debe actualizar solo el participante no-demo');
  assert.equal(res.participantesOmitidosDemo, 1, 'Debe omitir la cuenta demo');
  assert.equal(committedBatches.length, 1);
  
  const committedItem = committedBatches[0][0];
  assert.equal(committedItem.patch.cycleId, 'C2');
  assert.equal(committedItem.patch.futurosImposiblesAlert, true);
  assert.equal(committedItem.patch.historialCiclos.length, 1);
  assert.equal(committedItem.patch.historialCiclos[0].origen, 'C1');
  assert.equal(committedItem.patch.historialCiclos[0].destino, 'C2');

  // Verificar invalidación de caché
  assert.equal(systemMetadataWrites.length, 1);
  assert.equal(systemMetadataWrites[0].data.key, 'cpsl_managers_data_v3');

  // Verificar audit_logs
  assert.equal(auditLogWrites.length, 1);
  assert.equal(auditLogWrites[0].tipoAccion, 'REFRESCO_METAS_CICLOS_GRADUACION');
  assert.equal(auditLogWrites[0].cacheKeyInvalidada, 'cpsl_managers_data_v3');
});
