# Integración con Nodus

## Estrategia Actual
- Se utiliza un robot extractor (`dump_code.py` / automatización) validado con token de seguridad (`NODUS_ROBOT_CPSL_2026_SECRET`).
- Los datos se alojan de forma asíncrona en `nodus_kpis_sincronizados` en Firestore.

## Mejoras a Implementar
- Paginación nativa.
- Cacheo distribuido en frontend para reducir latencia.
