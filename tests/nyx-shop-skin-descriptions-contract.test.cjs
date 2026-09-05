const fs = require('node:fs');
const assert = require('node:assert/strict');

const shop = fs.readFileSync('src/components/NyxShop.jsx', 'utf8');
const skins = ['skinPrismaOrbital','skinOrbita','skinGuardiao','skinAurora','skinLuaNova','skinMare','skinConstelacao'];

for (const skin of skins) {
  assert.ok(shop.includes(`${skin}:`), `${skin} deve possuir descrição temática na loja`);
}
assert.ok(shop.includes('SKIN_DESCRIPTIONS[item.id]'), 'cards de aparência devem exibir a descrição');
assert.ok(shop.includes('SKIN_DESCRIPTIONS[preview.id]'), 'prévia deve exibir a descrição');

console.log('7 aparências do Nyx possuem descrições temáticas na loja e na prévia.');
