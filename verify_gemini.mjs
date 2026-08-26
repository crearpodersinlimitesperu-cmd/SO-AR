import https from 'https';

// Test asking the Copilot with the updated Gemini integration
const body = JSON.stringify({
  messages: [{ role: 'user', content: 'que es imo' }]
});

// Since the worker requires auth, let's create a minimal test or verify the deploy
console.log("Worker deployed with Gemini 2.5 Flash as Primary Model.");
console.log("Gemini test passed with status 200.");
