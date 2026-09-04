const https = require('https');
const options = {
  hostname: 'api.github.com',
  path: '/repos/crearpodersinlimitesperu-cmd/SO-AR/actions/runs?per_page=3',
  headers: {
    'User-Agent': 'node.js'
  }
};
https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    json.workflow_runs.forEach(r => console.log(r.id, r.status, r.conclusion, r.head_commit.message));
  });
});