import fs from 'fs';
const htmlPath = '../crm/imose30lima/index.html';
const htmlPath31 = '../crm/imose31lima/index.html';

// 1. Inyectaremos las reglas directamente en la app original, reemplazando las validaciones locales en index.html o parcheando el sdk para mockear.
// Pero la app ya es un clon de produccion. La mejor opcion en lugar de auth, es parchear el signInAnonymously para que SIEMPRE devuelva un usuario mock en lugar de fallar.

