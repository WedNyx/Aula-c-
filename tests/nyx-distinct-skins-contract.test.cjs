const fs = require('node:fs');
const assert = require('node:assert/strict');

const prisma = fs.readFileSync('src/components/NyxPrismaOrbital.jsx', 'utf8');
const skins = ['orbita','guardiao','aurora','lua-nova','mare','constelacao','lunar','eclipse'];

for (const skin of skins) {
  assert.ok(prisma.includes(`data-skin-detail="${skin}"`), `${skin} deve possuir silhueta ou ambiente próprio`);
  assert.ok(prisma.includes(`data-skin-surface="${skin}"`), `${skin} deve possuir detalhes próprios no corpo`);
}
assert.ok(prisma.includes('}, [st, selectedSkin]);'), 'trocar a skin deve atualizar suas cores mesmo sem mudar o humor');

console.log('8 aparências do Nyx possuem estrutura e superfície próprias.');
