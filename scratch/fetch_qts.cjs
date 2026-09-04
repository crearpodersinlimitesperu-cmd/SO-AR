const fs = require('fs');
fetch('https://docs.google.com/spreadsheets/d/10sz7KNvZ31GOgGDhzH0P3gbISGLW8HPBsSAZwOw5L8U/export?format=csv&gid=0')
  .then(res => res.text())
  .then(text => {
    fs.writeFileSync('scratch/qts.csv', text, 'utf8');
    console.log('Saved CSV');
  });