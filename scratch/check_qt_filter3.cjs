const fs = require('fs');
let code = fs.readFileSync('src/pages/DirectorioQT.jsx', 'utf8');

// Find the filter function body
let filterMatch = code.match(/return members\.filter\(m => \{([\s\S]*?)\}\);/);
if (filterMatch) {
    console.log(filterMatch[1]);
} else {
    console.log("Could not match filter body");
}