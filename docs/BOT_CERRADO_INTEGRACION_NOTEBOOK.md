# Integración con Notebook (Google NotebookLM)

## Estrategia y Realidad de la API
- Confirmado: El repositorio institucional es **Google NotebookLM** (instancia: `e73d6fa3-e680-454c-bf21-96c3ec023913`).
- **Limitación Técnica:** A la fecha, Google NotebookLM es una aplicación de usuario final y **no posee una API pública oficial** para consultar sus bases de datos vectoriales directamente desde una app externa (como nuestro Copiloto en React).

## Solución Empresarial (Workaround Oficial)
Para cumplir con la regla de "bot cerrado" y conectar el Copiloto a esta base de conocimiento, la integración se realizará en dos pasos:
1. **Exportación Continua:** Los documentos maestros y guías almacenados en NotebookLM deben exportarse o sincronizarse a un formato crudo (como nuestros actuales `DOCUMENTO_REPLICA_PLATAFORMA.md`).
2. **Vectorización Propia:** Utilizaremos un servicio RAG propio (ej. Firebase Vector Search, Pinecone, o inyección directa en el contexto de Llama3/Gemini) alimentado por los documentos extraídos de tu NotebookLM. De esta forma, simulamos el motor de NotebookLM dentro de nuestra propia plataforma de forma segura y privada.
