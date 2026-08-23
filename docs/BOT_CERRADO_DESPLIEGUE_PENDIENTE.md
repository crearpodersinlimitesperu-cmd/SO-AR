# [RUTA ALTERNATIVA — requiere plan Blaze de pago] Activar el Copiloto vía Firebase Cloud Functions

⚠️ Esta NO es la ruta activa. Se decidió no pagar Blaze — la ruta activa es Cloudflare Workers, ver `BOT_CERRADO_DESPLIEGUE_CLOUDFLARE.md`. Este documento queda por si en el futuro cambian de opinión sobre Blaze; `functions/index.js` ya está listo para ese escenario.

Código ya escrito y en el repositorio (`functions/index.js`, `AICopilot.jsx` actualizado). NO está desplegado. Faltan estos pasos, en orden, todos a ejecutar por José desde su propia terminal/consola (ninguno se puede hacer de forma remota):

## 1. Confirmar/activar el plan Blaze (bloqueante)

Cloud Functions no se puede desplegar en el plan Spark (gratuito) bajo ninguna circunstancia — es un requisito de Google, no una opción de configuración. Ya vimos en una captura anterior que el proyecto está en Spark ("Sin costo (USD 0 al mes)").

- Firebase Console → ⚙️ (esquina inferior izquierda) → **Uso y facturación** → **Detalles y configuración** → **Modificar plan** → elegir **Blaze**.
- Blaze sigue teniendo la misma cuota gratuita mensual que Spark; solo cobra lo que exceda esa cuota. Con el volumen de uso de este Copiloto, el costo esperado es mínimo, pero requiere una tarjeta/cuenta de facturación de Google Cloud vinculada.

## 2. Guardar la key de Groq como Secret (no en `.env`)

En la terminal, dentro de `C:\Users\josem\Downloads\SO-AR`:
```
firebase functions:secrets:set GROQ_API_KEY
```
Va a pedir el valor de forma interactiva (no lo pegues en ningún archivo ni me lo mandes a mí). Si la key que ya tienes en `.env` (`VITE_GROQ_API_KEY`) sigue siendo válida, es la que se usa aquí — pero **sin el prefijo `VITE_`**, porque ese prefijo es justamente lo que hace que Vite la incruste en el navegador; el nombre del secret debe ser exactamente `GROQ_API_KEY`.

## 3. Instalar dependencias de la función y desplegar

```
cd functions
npm install
cd ..
firebase deploy --only functions
```
Pégame la salida completa cuando termine.

## 4. Probar por rol (no declarar terminado sin esto)

Idealmente con una persona real de cada nivel (o usando el Rules Playground / una cuenta de prueba si la consigues):
- Un usuario de **equipo operativo**: pregunta un KPI y confirma que NO ve el detalle de otras sedes.
- Un **coordinador**: pregunta un KPI de su propia sede (debe responder) y de otra sede (debe decir que no tiene esa información).
- **Gerencia/SuperAdmin**: confirma que sí ve datos de todas las sedes.
- Revisa la colección `audit_logs` en Firestore y confirma que cada consulta quedó registrada con el rol y sede correctos.

## 5. Solo después de lo anterior

Recién ahí se puede decir que el Copiloto con Groq está "en producción" — no antes.
