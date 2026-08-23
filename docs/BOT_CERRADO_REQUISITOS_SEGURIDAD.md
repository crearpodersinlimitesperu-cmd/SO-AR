# Requisitos de Seguridad

## 1. Protección de Datos (Data Privacy)
- Minimización: Solo se envía al modelo el contexto estrictamente necesario.
- Prevención de Exfiltración: El modelo tiene prohibido mostrar datos masivos no solicitados.

## 2. Anti-Jailbreak y Prompt Injection
- El System Prompt fuerza al modelo a rechazar cualquier orden de ignorar instrucciones previas.
- Bloqueo de consultas sobre la configuración del modelo o tokens internos.
