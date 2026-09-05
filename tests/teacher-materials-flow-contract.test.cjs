const fs = require('node:fs');
const assert = require('node:assert/strict');

const app = fs.readFileSync('src/App.jsx', 'utf8');
const css = fs.readFileSync('src/redesign.css', 'utf8');

for (const step of ['1 · CRIAR', '2 · REVISAR', '3 · ENVIAR']) assert.ok(app.includes(step), `fluxo deve mostrar ${step}`);
assert.ok(app.includes('Gerar rascunho com Nyx'), 'IA deve ser apresentada como opção de rascunho');
assert.ok(app.includes('Nada será enviado automaticamente'), 'revisão deve ocorrer antes do envio');
assert.ok(app.includes('aria-current={tab===\'materials\'?\'page\':undefined}'), 'abas devem indicar a seção atual');
assert.ok(css.includes('.teacher-materials-flow') && css.includes('@media(max-width:800px)'), 'fluxo deve ter hierarquia responsiva');

console.log('Materiais seguem o fluxo Criar, Revisar e Enviar com IA opcional.');
