const fs = require('fs');

const path = './src/pages/MonitorImos.jsx';
let content = fs.readFileSync(path, 'utf8');

const oldLink = `https://cpsl.com/imo/registro-progreso?sede={filterSede}&linaje=auto`;
const newLink = `https://crearpsl.net/imo/registro-progreso?sede={filterSede}&linaje=auto`;

content = content.replace(oldLink, newLink);
fs.writeFileSync(path, content, 'utf8');
console.log("Dominio de link IMO actualizado a crearpsl.net");
