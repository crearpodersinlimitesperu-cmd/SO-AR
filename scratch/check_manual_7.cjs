const fs = require("fs"); let code = fs.readFileSync("src/components/HelpModal.jsx", "utf8"); let startIndex = code.indexOf("Tab CMJ"); console.log(code.substring(startIndex-500, startIndex + 2000));
