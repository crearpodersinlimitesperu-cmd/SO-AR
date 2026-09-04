const fs = require('fs');
console.log(fs.readFileSync('.github/workflows/deploy.yml', 'utf8'));