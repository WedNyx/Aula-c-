const assert=require('node:assert/strict');const fs=require('node:fs');
const nyx=fs.readFileSync('src/components/NyxPrismaOrbital.jsx','utf8');
assert.match(nyx,/data-skin-silhouette="mare-fins"/);assert.match(nyx,/data-skin-silhouette="mare-bubbles"/);assert.match(nyx,/M128 205Q63 172 27 207/);assert.match(nyx,/M151 326q29 28 58 0/);assert.match(nyx,/M137 273q21-19 43 0t43 0/);
console.log('Nyx Maré possui barbatanas, cauda, bolhas e marcas próprias de ondas.');
