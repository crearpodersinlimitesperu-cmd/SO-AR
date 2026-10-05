const fs = require('fs');
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove isDataAdmin from react import
content = content.replace("import {\n  isDataAdmin, useState, useEffect, useRef } from 'react';", "import { useState, useEffect, useRef } from 'react';");

// 2. Add isDataAdmin to config/permissions import
content = content.replace(
  "canUseAsignadorEntrenadores, PORTFOLIO_FI_REVIEW_EMAILS",
  "canUseAsignadorEntrenadores, PORTFOLIO_FI_REVIEW_EMAILS, isDataAdmin"
);

fs.writeFileSync(file, content);
console.log('Imports fixed');
