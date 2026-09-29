import fs from 'fs';
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

const startIdx = content.indexOf('{/* 📍 RELOJ LOCAL (Ubicación');
if (startIdx === -1) {
  console.log("Could not find start");
  process.exit(1);
}

// Find the end of the ECU/PER/COL block
const endStr = "{/* 🇪🇨 🇵🇪 🇨🇴 RELOJ ECU/PER/COL (UTC-5) */}";
const endBlockIdx = content.indexOf(endStr, startIdx);
if (endBlockIdx === -1) {
  console.log("Could not find end block");
  process.exit(1);
}

const finalEndIdx = content.indexOf('</div>', endBlockIdx) + 6;
const veryFinalEndIdx = content.indexOf('</div>', finalEndIdx) + 6;

let blockToReplace = content.substring(startIdx, veryFinalEndIdx);
blockToReplace = blockToReplace.replace(/viewMode === 'lite'/g, "themeMode === 'light'");

content = content.substring(0, startIdx) + blockToReplace + content.substring(veryFinalEndIdx);
fs.writeFileSync(file, content, 'utf8');
console.log("Replaced themeMode successfully!");
