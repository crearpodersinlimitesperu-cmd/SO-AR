const fs = require('fs');
const path = require('path');

const srcDir = '../crm/imose31lima';
const destDir = '../crm/imose30lima';

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

if (!fs.existsSync(destDir)) {
  console.log('Copiando archivos...');
  copyRecursiveSync(srcDir, destDir);
}

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/imose31lima/g, 'imose30lima');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Actualizado:', filePath);
}

replaceInFile(path.join(destDir, 'index.html'));

const assetsDir = path.join(destDir, 'assets');
if (fs.existsSync(assetsDir)) {
  fs.readdirSync(assetsDir).forEach(file => {
    if (file.endsWith('.js')) {
      replaceInFile(path.join(assetsDir, file));
    }
  });
}

console.log('Carpeta imose30lima generada con éxito. Ya puedes subir los cambios a GitHub Pages.');
