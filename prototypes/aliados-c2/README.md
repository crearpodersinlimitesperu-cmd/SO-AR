# Guía local de Aliados C2

Prototipo separado de Causa OS. No modifica el login, el home, las reglas ni las rutas de la aplicación. No importa Firebase, no recoge datos personales y no utiliza analítica, fuentes remotas ni servicios externos.

Desde la raíz del worktree:

```sh
npm exec vite -- --config prototypes/aliados-c2/vite.config.js
```

Abrir `http://127.0.0.1:4312/`. El servidor se limita al loopback y falla si el puerto está ocupado. No cambiarlo a `0.0.0.0` para compartir esta guía interna.

```sh
npm exec vite build -- --config prototypes/aliados-c2/vite.config.js
node --test tests/aliados-c2.test.mjs
```

El build separado se genera en `prototypes/aliados-c2/dist`, no en el `dist` de Causa OS. El build habitual con `npm exec vite build` no incluye este HTML. No usar `npm run build`: el prebuild del repositorio reescribe documentación ajena.

## Interacciones y contenido

Navegación por las cuatro fases mediante enlaces con hash y acceso a toda la agenda. Checklist con nueve acuerdos de preparación, persistencia local de marcas y borrado confirmado. Consulta rápida desplegable. Impresión completa con todas las fases y notas de consulta, incluso si se está filtrando.

El progreso solo conserva identificadores de casillas, no nombres, pagos, registros ni evidencias. Los fallos de almacenamiento se muestran; la lista sigue disponible durante la sesión. Las marcas no acreditan el cumplimiento de las misiones.

Fuente: adjunto “Guía Práctica Operativa: Aliado de Capítulo Dos (C2)”, 115 líneas. Se conserva la terminología y se reorganizan fases, horarios y misiones. La sección de conversaciones es una síntesis editorial: no reproduce instrucciones de presión ni presenta los nombres del programa como evidencia neurocientífica. Las notas de cuidado están identificadas y no pretenden modificar políticas del programa.

## Límite de publicación

crearpsl.net es un dominio solicitado, **no configurado ni publicado**. No se ha autorizado acceso público al contenido operativo. `noindex` es una señal para buscadores, **no un control de acceso**. Antes de publicar, definir y autorizar la audiencia, revisar el contenido y añadir acceso apropiado en el hosting. No desplegar este prototipo con el despliegue de Causa OS.
