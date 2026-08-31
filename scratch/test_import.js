const { USERS_TO_IMPORT } = require('./src/data/usersToImport.js');
console.log(USERS_TO_IMPORT.filter(u => u.name.includes('Aguirre')));
