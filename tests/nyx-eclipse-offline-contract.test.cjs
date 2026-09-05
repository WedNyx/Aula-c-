const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('src/App.jsx', 'utf8');

assert.ok(
  app.includes('const nyxUnavailable = aiDown || connected === false;'),
  'Nyx Eclipse deve considerar falha dos provedores e perda de conexão'
);
assert.ok(
  app.includes('skin: nyxUnavailable ? "skinEclipse" : hasNyxNews ? "skinLunar" : nyxGear.skin'),
  'Eclipse deve ter prioridade sobre Lunar e sobre a skin equipada'
);
assert.ok(
  app.includes('{hasNyxNews && !nyxUnavailable && <button'),
  'novidades não devem disputar atenção com o estado Eclipse'
);
assert.ok(
  app.includes('Nyx Eclipse · sem conexão'),
  'o aluno deve receber uma explicação específica quando estiver offline'
);

console.log('Nyx Eclipse representa de forma consistente toda indisponibilidade da IA.');
