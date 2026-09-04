const https = require('https');
const options = {
  hostname: 'api.github.com',
  path: '/repos/crearpodersinlimitesperu-cmd/SO-AR/issues?state=open&per_page=5',
  headers: {
    'User-Agent': 'node.js'
  }
};
https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    json.forEach(issue => console.log(issue.number, issue.title));
  });
});