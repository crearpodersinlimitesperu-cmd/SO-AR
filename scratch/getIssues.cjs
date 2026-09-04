const https = require('https');
const options = {
  hostname: 'api.github.com',
  path: '/repos/crearpodersinlimitesperu-cmd/SO-AR/issues?state=open',
  method: 'GET',
  headers: {
    'User-Agent': 'Node.js'
  }
};
const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const issues = JSON.parse(data);
    if(Array.isArray(issues)) {
       issues.forEach(i => console.log('Issue #', i.number, i.title));
    } else {
       console.log('Error fetching issues:', issues);
    }
  });
});
req.end();
