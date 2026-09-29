import fs from 'fs';
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const { themeMode, setThemeMode } = useTheme();",
  "const { themeMode, setThemeMode, activeTheme } = useTheme();"
);

content = content.replace(/themeMode === 'light'/g, "activeTheme === 'light'");

fs.writeFileSync(file, content, 'utf8');
console.log("activeTheme replace successful");
