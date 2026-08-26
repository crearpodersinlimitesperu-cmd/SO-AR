# Dictamen OMNI-AUDITOR: Nodus vs Causa OS

## 1. Módulos de Nodus y Estado de Migración
Se han analizado **35 módulos** en Nodus.

### ✅ Módulos Integrados (Sincronización Activa)
- **usuarios**: En sincronización parcial.
- **participantes**: En sincronización parcial.

### 🚨 Módulos Huérfanos (RIESGO DE PÉRDIDA DE DATOS)
Los siguientes módulos críticos existen en Nodus con data viva, pero NO tienen contraparte estructurada ni sincronizada en Causa OS:
- **dashboard**: Aprox 3 registros en peligro de desincronización.
- **roles**: Aprox 9 registros en peligro de desincronización.
- **permisos**: Aprox 39 registros en peligro de desincronización.
- **sedes**: Aprox 6 registros en peligro de desincronización.
- **entrenamientos**: Aprox 6 registros en peligro de desincronización.
- **entrenadores**: Aprox 17 registros en peligro de desincronización.
- **configuracion**: Aprox 1 registros en peligro de desincronización.
- **cronograma**: Aprox 1 registros en peligro de desincronización.
- **saltoscuanticos**: Aprox 1 registros en peligro de desincronización.
- **equipos**: Aprox 18 registros en peligro de desincronización.
- *...y 23 módulos más.*

## 2. Hallazgos Cuantitativos
- **Usuarios en Nodus**: ~15
- **Usuarios en Causa OS**: 108

## 3. Recomendación Arquitectónica
No podemos migrar módulo por módulo manualmente (son 35). Sugiero desplegar un **Pipeline de Migración Masiva** usando Cloud Functions que lea el inventario completo y lo vierta en colecciones espejo de Firestore automáticamente.
