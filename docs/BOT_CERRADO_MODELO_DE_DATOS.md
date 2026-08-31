# Modelo de Datos Normalizado

## Nodus (Esquema Firestore Actual)
```json
{
  "timestamp": "ISO-8601",
  "secciones": {
    "actividadCoordinadores": { "kpis": [...] },
    "reporteEntrenadores": { "tablas": [...] }
  }
}
```
*Diferencia con lo propuesto*: Actualmente Nodus en nuestro entorno entrega agregados (KPIs). El detalle individual se almacena bajo demanda o por extracción estructurada.
