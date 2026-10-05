import fs from 'fs';
const src = fs.readFileSync('src/pages/AsignadorEntrenadores.jsx', 'utf8');

const regexNames = /export const NOMBRES_LEGALES_ENTRENADORES = ({[\s\S]*?});/
// wait, I can just grep NOMBRES_LEGALES_ENTRENADORES
