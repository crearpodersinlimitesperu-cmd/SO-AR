const fs = require('fs');

async function testGitActions() {
   // The error says "All jobs have failed" 
   // It probably didn't pass the build or deploy step.
   // Let's get the exact github actions logs by making a groq or fetch request.
   // Or since I can't run gh, I'll see if I pushed some code with a syntax error that fails lint/build.
}
testGitActions();