# Carga inicial de Causa OS

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
