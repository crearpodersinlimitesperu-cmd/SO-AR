const fs = require('fs');
let code = fs.readFileSync('src/data/managersData.js', 'utf8');
code = code.replace(
  '"Marcos Josue Vera": "Josue Vera",',
  '"Marcos Josue Vera": "Josue Vera",\n  "David Sosa": "Freddy Sosa",\n  "Freddy Sosa": "Freddy Sosa",\n  "Freddy David Sosa Carrera": "Freddy Sosa",'
);
fs.writeFileSync('src/data/managersData.js', code, 'utf8');
