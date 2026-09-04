const { execSync } = require('child_process');

try {
  console.log("Running firebase deploy test...");
  execSync('npx firebase-tools deploy --only hosting --project centro-operativo-cpsl --non-interactive', {stdio: 'inherit'});
} catch(e) {
  console.log("Failed deploy", e.message);
}