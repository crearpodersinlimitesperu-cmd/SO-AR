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
    const jobId = json.jobs[0].id;
    console.log("Job ID:", jobId);
    
    // Can't download logs easily without auth, but I can check if they failed in tests or build.
    // wait I'm authenticated through ssh locally, but github api requires PAT.
  });
});