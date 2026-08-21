# Plan de Rollback Inmediato (SO-AR)

En caso de que las reparaciones arquitectónicas introduzcan efectos colaterales no deseados en producción, se debe seguir este procedimiento de rollback de "1 minuto" para devolver el sistema exactamente a su estado previo (21 de Agosto de 2026, 15:08).

## 1. Restauración del Código Fuente Frontend
1. Navega a la raíz del proyecto `SO-AR`.
2. Borra el contenido actual del directorio `src/`.
3. Copia el contenido íntegro de la carpeta `backup/pre-repair-2026-08-21-15-08/src/` hacia la carpeta raíz `src/`.
4. Restaura los archivos raíz copiando `package.json`, `vite.config.js` y `firestore.rules` desde el backup hacia la raíz.

## 2. Reversión de Reglas de Seguridad de Firestore
Si los usuarios reportan que no pueden guardar tareas por las nuevas reglas restrictivas:
1. Abre la consola de Firebase -> Firestore Database -> Rules.
2. Como alternativa directa local, ejecuta desde la consola en la raíz del proyecto:
   ```bash
   # Copiar las reglas viejas
   cp backup/pre-repair-2026-08-21-15-08/firestore.rules .
   
   # Desplegar inmediatamente
   firebase deploy --only firestore:rules
   ```

## 3. Despliegue de Emergencia
Una vez restaurado el código local:
```bash
npm run build
firebase deploy --only hosting
```

## 4. Notas de Datos
Debido a que **NO SE EJECUTARON MIGRACIONES DESTRUCTIVAS** (todos los ajustes fueron in-memory), no es necesario ejecutar scripts de base de datos para revertir campos. La base de datos sigue operando exactamente con el mismo esquema histórico.
