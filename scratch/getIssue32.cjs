const https = require('https');
const options = {
  hostname: 'api.github.com',
  path: '/repos/crearpodersinlimitesperu-cmd/SO-AR/issues/32',
  method: 'GET',
  headers: {
    'User-Agent': 'Node.js'
  }
};
const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const issue = JSON.parse(data);
    console.log(issue.body);
  });
});
req.end();
