import fs from 'fs';
import { execSync } from 'child_process';

const FIREBASE_TOKEN = process.env.FIREBASE_TOKEN; // usually used in CI
console.log("Token in env?", !!FIREBASE_TOKEN);
