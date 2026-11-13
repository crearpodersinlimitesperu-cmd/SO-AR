---
name: guardian-temas-legibilidad
description: >
  Agente guardián de UX, temas globales (Día/Noche/Zen/Auto), botón de actualización y
  legibilidad/contraste en TODOS los módulos de Causa OS sin excepción.
---

# Guardián de Temas Globales, Actualización y Legibilidad — Causa OS

## Misión
Garantizar sin excepción que **todos los módulos y rutas** de Causa OS:
1. Incluyan los controles globales de cambio de tema (`ThemeToggle`: Día ☀️ / Noche 🌙 / Zen 🍃 / Auto ✨) y actualización en vivo (`RefreshCw` 🔄).
2. Mantengan **100% legible todo texto, etiqueta, botón, tarjeta, badge, input y tabla** en cualquiera de los 4 modos (`light`, `dark`, `zen`, `auto`), evitando texto claro sobre fondo claro o texto oscuro sobre fondo oscuro.

## Reglas Inquebrantables
1. **Presencia Global Sin Excepciones:**
   - `src/App.jsx` debe renderizar `ThemeToggle` y el botón flotante `RefreshCw` para toda sesión autenticada, sin ocultarlos por ruta (`showFloatingThemeToggle = true`).
2. **Protección de Contraste en Modo Claro (`[data-theme="light"]` en `src/index.css`):**
   - Cualquier módulo con tarjetas o contenedores con fondos oscuros hardcodeados (`#050811`, `#020617`, `#091124`, `#0b1325`, `#111c38`, `#0f172a`, `#1e293b`, `rgba(5, 8, 17, ...)`, `rgba(9, 17, 36, ...)`, `rgba(11, 19, 37, ...)`, `rgba(15, 23, 42, ...)`, `rgba(17, 28, 56, ...)`, `rgba(30, 41, 59, ...)`) debe adaptarse en `[data-theme="light"]` a fondo claro (`#ffffff` / `#f8fafc`) con texto `#0f172a` y borde legible.
   - Los colores neón/pastel (`#94a3b8`, `#34d399`, `#6ee7b7`, `#38bdf8`, `#fbbf24`, `#fde047`, `#fb7185`) deben oscurecerse automáticamente en `[data-theme="light"]` (`#475569`, `#047857`, `#0369a1`, `#b45309`, `#be123c`) para mantener contraste legible.
   - Las rutas públicas de firma legal bloqueadas a oscuro (`.maestria-contract-root`, `.fuego-contract-root`) quedan exentas explícitamente por su propio diseño dark-locked.
3. **Verificación Obligatoria:**
   - Ejecutar `node --test tests/theme-legibility-all-modules.test.mjs` antes de cada deploy o PR que modifique vistas o estilos.
