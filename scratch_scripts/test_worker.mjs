// Test directo al Worker para ver qué responde exactamente
import https from 'https';

function testWorker(token) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      messages: [{ role: 'user', content: 'hola' }]
    });
    const options = {
      hostname: 'so-ar-copiloto.crearpsl-cpsl.workers.dev',
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Origin': 'https://centro-operativo-cpsl.web.app'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
        console.log(`Body: ${data}`);
        resolve();
      });
    });
    req.on('error', (e) => {
      console.log(`Error de red: ${e.message}`);
      resolve();
    });
    req.write(body);
    req.end();
  });
}

async function main() {
  // Test 1: Sin token (debe devolver 401 con mensaje claro)
  console.log('=== TEST 1: Sin token ===');
  await testWorker('');
  
  // Test 2: Con token falso (debe devolver 401)
  console.log('\n=== TEST 2: Token falso ===');
  await testWorker('fake-token-for-testing');
  
  // Test 3: OPTIONS (CORS preflight)
  console.log('\n=== TEST 3: CORS Preflight ===');
  await new Promise((resolve) => {
    const options = {
      hostname: 'so-ar-copiloto.crearpsl-cpsl.workers.dev',
      path: '/',
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://centro-operativo-cpsl.web.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    };
    const req = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`CORS Headers:`);
      console.log(`  Allow-Origin: ${res.headers['access-control-allow-origin']}`);
      console.log(`  Allow-Methods: ${res.headers['access-control-allow-methods']}`);
      console.log(`  Allow-Headers: ${res.headers['access-control-allow-headers']}`);
      resolve();
    });
    req.on('error', (e) => { console.log(`Error: ${e.message}`); resolve(); });
    req.end();
  });
}

main().catch(console.error);
