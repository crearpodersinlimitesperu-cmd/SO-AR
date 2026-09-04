const fs = require('fs');
let code = fs.readFileSync('src/pages/DirectorioQT.jsx', 'utf8');
let search = "const isTargetQTGlobal = m.sede === 'Global' || m.email?.toLowerCase().includes('brunis')";
let replaceStr = "const isTargetQTGlobal = m.sede === 'Global' || m.email?.toLowerCase().includes('brunis') || m.email?.toLowerCase().includes('cardenas')";

if (code.includes(search)) {
  code = code.replace(search, replaceStr);
  fs.writeFileSync('src/pages/DirectorioQT.jsx', code, 'utf8');
  console.log("Patched correctly");
} else {
  console.log("Not found part 2");
}