const https = require('https');
const options = {
  hostname: 'api.github.com',
  path: '/repos/crearpodersinlimitesperu-cmd/SO-AR/actions/runs/33811582370/jobs',
  headers: {
    'User-Agent': 'node.js'
  }
};
https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    json.jobs.forEach(j => console.log(j.name, j.conclusion));
  });
});