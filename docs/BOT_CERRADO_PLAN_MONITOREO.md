# Monitoreo de IA

- **Registro de Latencia**: Monitorizar el TTFT (Time To First Token) de la API Groq. Objetivo: < 1.5s.
- **Trazabilidad en Firestore**: Evaluar el crecimiento de la colección `copilot_chats`.
- **Alertas**: Notificar a Firebase Crashlytics en caso de timeout del LLM.
