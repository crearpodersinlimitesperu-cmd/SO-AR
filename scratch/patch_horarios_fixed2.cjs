const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');

let start = code.indexOf("<button onClick={() => { setShowToolsDropdown(false); navigate('/calendario-equipo'); }}");
let end = code.indexOf("</button>", start) + 9;
let buttonBlock = code.substring(start, end);

let conditionStart = code.lastIndexOf("{(currentUser", start);
let conditionEnd = code.indexOf(")}", end) + 2;

if (conditionStart !== -1 && conditionEnd !== -1 && start !== -1) {
   let fullBlock = code.substring(conditionStart, conditionEnd);
   console.log("Found full block:", fullBlock);
   code = code.replace(fullBlock, buttonBlock);
   fs.writeFileSync('src/pages/Home.jsx', code, 'utf8');
   console.log("Successfully replaced");
} else {
   console.log("Could not find condition block");
}