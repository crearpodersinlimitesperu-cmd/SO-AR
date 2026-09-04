const fs = require('fs');
let content = fs.readFileSync('src/pages/GerenteDashboard.jsx', 'utf8');

// find the last occurrence of "  );\n}"
let lastClose = content.lastIndexOf("  );\n}");
if (lastClose !== -1) {
    // we want to move the injection BEFORE the closing tags
    let lines = content.split('\n');
    let injectedIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('{/* SECCION DE HORARIOS */}')) {
            injectedIndex = i;
            break;
        }
    }
    
    if (injectedIndex !== -1 && injectedIndex > lastClose) {
        // the injection happened after the close. Let's extract it.
        let injectionBlock = lines.splice(injectedIndex);
        
        // Find the return close again in the new lines array
        for(let i=lines.length-1; i>=0; i--) {
            if(lines[i].includes('  );')) {
                // insert right before it
                lines.splice(i-1, 0, ...injectionBlock);
                break;
            }
        }
        
        fs.writeFileSync('src/pages/GerenteDashboard.jsx', lines.join('\n'), 'utf8');
        console.log("Fixed!");
    }
}