const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');

code = code.replace(
  "return evSede.toLowerCase().includes(userSede.toLowerCase()) || userSede.toLowerCase().includes(evSede.toLowerCase());",
  "if (!evSede) return false;\n                          return evSede.toLowerCase().includes(userSede.toLowerCase()) || userSede.toLowerCase().includes(evSede.toLowerCase());"
);

// Also let's completely hide non-C1/C2/Creacion events for QT
code = code.replace(
  "if (name.includes(\"CREACION\") || name.includes(\"CREACIÓN\")) {\n                               creacionCount++;\n                               return creacionCount <= 2;\n                            }\n                            return true;",
  "if (name.includes(\"CREACION\") || name.includes(\"CREACIÓN\")) {\n                               creacionCount++;\n                               return creacionCount <= 2;\n                            }\n                            return false; // QTs ONLY see C1, C2, and Creacion"
);

fs.writeFileSync('src/pages/Home.jsx', code, 'utf8');