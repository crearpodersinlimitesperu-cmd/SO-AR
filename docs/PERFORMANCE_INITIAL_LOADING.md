# Carga inicial de Causa OS

## Resultados tardios durante cambios de sesion

El observer de Auth invalida ahora cada verificacion anterior al recibir otro
estado de sesion o desmontarse el provider. Una lectura lenta de perfil o roles
ya no puede restaurar una sesion cerrada, reemplazar una sesion posterior ni
borrarla por un error tardio. El gate vuelve a cerrarse mientras se verifica el
nuevo estado; solo la verificacion vigente puede liberarlo. Tambien se limpia
el estado de simulacion en memoria al cambiar la sesion autenticada.

`tests/auth-session-race.test.mjs` ejecuta el effect real con Auth, Firestore,
storage y setters simulados, usando solo fixtures `example.invalid` y promesas
controladas. Cubre cierre durante busqueda de users/staff, roles, lectura propia
y persistencia inicial, resultados fuera de orden, error obsoleto mientras la
sesion nueva espera, desmontaje y fallo vigente con aviso generico.

No se cancelan operaciones del SDK ya enviadas: una escritura de perfil iniciada
antes del cambio puede finalizar, pero su resultado no publica sesion ni auditoria
de acceso. No cambian consultas, matriz RBAC, normalizacion de roles, calendarios,
reintentos del SDK ni plazos de timeout. Este cambio protege el observer de sesion
persistida; no unifica el flujo paralelo del popup de login. No prueba ni resuelve
un incidente individual. Las esperas sin respuesta siguen requiriendo evidencia
de la fase afectada y una politica explicita antes de introducir timeouts.

```sh
node --test tests/auth-session-race.test.mjs tests/auth-startup-latency.test.mjs tests/auth-startup-critical-path.test.mjs
```

## Sesion autenticada: segunda optimizacion posterior a PR #145

La base de comparacion es `d1c07eaa128038df90d6a5db0a1c6b2a39b824f9`.
Quedaban hasta cuatro consultas indexadas consecutivas a `users`, dos a
`staff_directory` en fallback y una lectura de `users/{uid}` iniciada solo al
terminar el agente de roles. Ahora cada busqueda usa una consulta OR; se conserva
la prioridad `emails > email > corporateEmail > personalEmail` y, dentro del
campo ganador, el mismo desempate UID/slug. No se usa un UID como atajo que
pueda saltarse un perfil de mayor prioridad. Staff conserva `emails > email`.
Normalizacion `.com/.net`, fallback estatico, participantes y directorios
de roles no cambian.

Despues del gate de inactivos, solo la **lectura** self-profile se solapa con
roles. Ambas terminan antes de persistir y dar acceso. La creacion inicial sigue
esperandose; los metadatos de un documento existente siguen enviandose con el
mismo SDK/reintentos y reporte de error no bloqueante de PR #145. Un fallo en
busqueda, roles o lectura/creacion inicial ahora aborta con registro y aviso:
no se confunde con ausencia de perfil ni se concede acceso sin verificacion.
No cambian reglas, permisos, roles escritos ni el spinner por timeout.

`tests/auth-startup-critical-path.test.mjs` ejecuta los helpers y el callback
real de ambas versiones contra Firestore/Auth simulados a 60 ms por RTT.
Incluye 60 ms separados para restaurar Auth; es una entrada simulada, **no**
una medicion del SDK autenticado. El test imprime tiempos observados y verifica
estos presupuestos (sin descarga de JS, TLS, CPU, token refresh ni payload):

| Perfil encontrado en | Firestore PR145 | Firestore nuevo | Total con Auth simulado, antes / despues |
| --- | ---: | ---: | ---: |
| users.emails | 3 RTT | 2 RTT | 240 / 180 ms |
| users.email | 4 RTT | 2 RTT | 300 / 180 ms |
| users.corporateEmail | 5 RTT | 2 RTT | 360 / 180 ms |
| users.personalEmail | 6 RTT | 2 RTT | 420 / 180 ms |
| staff.email | 8 RTT | 3 RTT | 540 / 240 ms |

Primera ejecucion CI Node 22, run `38153536740`: tiempos observados (una muestra
por ruta, incluyendo Auth simulado) `emails` 242.4 -> 182.2 ms, `email`
301.7 -> 181.2 ms, `corporateEmail` 361.5 -> 181.0 ms, `personalEmail`
422.0 -> 181.0 ms y `staff.email` 542.2 -> 241.5 ms. Son observaciones de timers
en runner, no medianas ni datos productivos. Requests de lectura respectivos:
4 -> 4, 5 -> 4, 6 -> 4, 7 -> 4 y 9 -> 5. `npm test` paso 142/142,
build y emulador OR/reglas pasaron en ese run.

Una creacion inicial suma 1 RTT esperado a ambas versiones. Roles conserva
dos lecturas de directorios en paralelo, no se descarga el directorio completo
de users. OR puede devolver mas documentos coincidentes que la antigua consulta
que acertaba en el primer campo; todos estan limitados al mismo correo, sin
lecturas especulativas de directorios de fallback. Los tests verifican paridad
de perfil/roles, prioridad y duplicados, escritura critica, errores, inactivos
y ausencia de acceso prematuro. El emulador comprueba OR con reglas existentes,
incluyendo denegacion anonima. CI obtiene el historial para ejecutar la base
fijada, y ejecuta las pruebas junto al build y suites de reglas.

```sh
node --test tests/auth-startup-latency.test.mjs tests/auth-startup-critical-path.test.mjs
```

Instrumentacion local (sin enviar datos ni incluir identidad): en DevTools,
`performance.getEntriesByType('measure').filter(e => e.name.startsWith('causa-auth:'))`
muestra `auth-state-wait` (registro del observer hasta primer callback),
`users-lookup`, `staff-lookup` si aplica, `roles`, `self-profile-read`,
`profile-metadata` y `total-to-gate`. Roles y self-read se solapan: no sumar sus
duraciones. Metadata mide lanzamiento en existentes o creacion awaited en nuevos.
Son tiempos de operaciones SDK, no RTT de red puros: incluyen caché, token,
conectividad y procesamiento. Total termina al liberar el gate de React, no al
pintar la pagina. No hay credenciales personales/productivas ni medicion real
de una sesion autenticada en este cambio; no se garantiza igual reduccion en vivo.

## Medicion publica previa (PR #144)

Medición del 11 de octubre de 2026, base `3809dd4`, sin sesión ni credenciales.

## Resultado reproducible

Chrome 152 / Node 22, cinco contextos de navegador nuevos por versión, caché
deshabilitada, 1.6 Mbps de descarga, 150 ms de latencia y CPU ralentizada 4 veces.
Servidor local de assets de producción con Brotli calidad 5, misma máquina,
viewport por defecto de Puppeteer. Son bytes decimales, no KiB.

| Medida | Base | Optimizado |
| --- | ---: | ---: |
| JS solicitado hasta mostrar login, sin comprimir | 1,376,564 B | 1,198,658 B |
| Mismo conjunto de JS, gzip de Node | 374,020 B | 349,218 B |
| Mismo conjunto de JS, Brotli servido localmente | 351,680 B | 330,077 B |
| Fondo de login, archivo original / nuevo | 731,716 B | 141,950 B |
| Favicon, archivo original / nuevo | 446,595 B | 1,942 B |
| Payload same-origin observado, HTML y recursos completados | 2,398,159 B | 483,402 B |
| FCP, mediana | 2,784 ms | 2,376 ms |
| Botón de login presente en DOM, mediana | 3,079 ms | 2,645 ms |
| LCP, mediana | 13,272 ms | 4,088 ms |
| LCP, rango de cinco muestras | 13,256–13,332 ms | 4,084–4,160 ms |

La reducción de payload observado es 79.8%; LCP local baja 69.2%. El navegador
solicitó el favicon original tres veces con la caché deshabilitada: ese coste
está incluido en el payload, pero no se debe interpretar como tres descargas
obligatorias en todos los navegadores. El gzip se calcula una vez por archivo JS
único; no es la compresión Brotli de Firebase Hosting.

## Causas y cambio

- `vite.config.js` ya utiliza Vite y React sin configuración especial.
  `App.jsx` ya separa las páginas con `React.lazy`; imponer un vendor monolítico
  o precargar todas las rutas no resolvería el coste observado.
- `AuthContext` importaba `isInactiveTrainer` desde el directorio de managers.
  La dependencia compartida arrastraba unos 178 KB de JS sin comprimir al login.
  `trainerIdentity.js` contiene exactamente la implementación anterior y su
  lista de inactivos; `managersData.js` reexporta la misma API. No cambian las
  comprobaciones de acceso, alias, consultas ni orden de autenticación.
- La imagen de fondo y, especialmente, el logo completo utilizado como favicon
  competían por ancho de banda con el login. El fondo WebP conserva 1376×768,
  calidad 0.88 y 40.57 dB de PSNR frente al JPEG decodificado. El icono es una
  reducción proporcional a un lienzo transparente de 32×32. El logo y JPEG
  originales siguen disponibles para sus otros consumidores.
- Ambos assets nuevos son imports de Vite con nombre fingerprinted. No se
  modifican cabeceras de caché, service workers, datos ni feeds productivos.

## Repetir y proteger

```sh
npm ci --include=optional
npm run build --ignore-scripts
node scripts/measure-public-loading.mjs local 5 > loading-local.json
node scripts/measure-public-loading.mjs https://centro-operativo-cpsl.web.app/ 3 > loading-live.json
npm test
npm run test:loading
```

El build directo evita solamente el `prebuild` que vuelca el código a documentos
de auditoría; el workflow de deploy conserva su `npm run build` habitual.
`scripts/optimize-login-background.mjs` regenera los dos assets con Puppeteer ya
existente; no es necesario ejecutarlo en cada build.

Los tests cubren aliases/inactivos, compatibilidad de los reexports, dimensiones
y presupuestos de imágenes, redirección anónima real del build a login, ausencia
del chunk de managers y ausencia del logo/JPEG grande en sus solicitudes. Se
comprobó además paridad frente a la implementación original de Git en 2,912
entradas derivadas del directorio, con mayúsculas, espacios y Unicode NFD.
CI ejecuta `test:loading` junto a las suites existentes y el emulador de reglas.

## Producción y límites

Antes del cambio, tres navegaciones públicas a Hosting bajo las mismas
condiciones dieron FCP mediano 2,660 ms, botón presente 2,934 ms, LCP 13,184 ms
y 316,983 B de JS Brotli. Hosting usa otra compresión y variables de build:
no comparar sus bytes con los del servidor local como si fueran idénticos.

Firebase Auth/Firestore/Storage/Performance siguen inicializándose como antes;
el chunk Firebase local pesa 607.7 KB sin comprimir / 180.4 KB gzip. Fonts mantiene
su `@import` de Google con `display=swap` y preconnects; la hoja tardó unos 266 ms
en una muestra base. El waterfall también mostró lecturas de calendario público
y listeners ya existentes durante el login: no se alteraron, porque forman parte
de los contextos compartidos y requieren una investigación funcional aparte.

No hay configuración de Lighthouse/Playwright en el repositorio; se reutiliza
Puppeteer. FCP/LCP son observaciones de navegador, no una puntuación Lighthouse.
El botón presente mide render, no finalización de OAuth ni tiempo de una página
autenticada. Las entradas cross-origin pueden ocultar bytes por falta de
Timing-Allow-Origin. Se espera un segundo adicional tras completarse el fondo
para observar el LCP; no se espera `networkidle`, por los listeners persistentes.
Los resultados no garantizan la misma mejora para módulos autenticados ni
atribuyen toda la lentitud reportada a la carga inicial.
