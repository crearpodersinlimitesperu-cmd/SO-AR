const fs = require("fs"); let code = fs.readFileSync("src/components/HelpModal.jsx", "utf8"); let startIndex = code.indexOf("3. M"); console.log(code.substring(startIndex, startIndex + 3000));
