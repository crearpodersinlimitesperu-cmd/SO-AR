const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "return currentUser ? children : <Navigate to=\"/login\" replace />;",
  "return currentUser ? children : <Navigate to={`/login?from=${window.location.pathname}`} replace />;"
);

fs.writeFileSync(file, content);
console.log('PrivateRoute patched');
