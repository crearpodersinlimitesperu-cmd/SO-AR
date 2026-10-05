const fs = require('fs');

const path = '../crm/imose30lima/index.html';
let content = fs.readFileSync(path, 'utf8');

// Revisemos detenidamente cómo inyectamos la autenticación anónima
const target = `    } catch (e) {
      console.error(e);
      document.getElementById("view-loading").innerHTML = '<p class="text-red-500 font-bold">Error conectando al servidor Nodus.</p>';
    }`;
const replacement = `    } catch (e) {
      console.error("DEBUG FATAL:", e);
      document.getElementById("view-loading").innerHTML = '<p class="text-red-500 font-bold">Error conectando a Nodus: ' + e.message + '</p>';
    }`;

content = content.replace(target, replacement);
fs.writeFileSync(path, content, 'utf8');
fs.copyFileSync(path, '../crm/imose31lima/index.html');
console.log("Manejo de errores mejorado.");
