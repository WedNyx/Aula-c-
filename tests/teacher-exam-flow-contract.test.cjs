const fs = require('node:fs');
const assert = require('node:assert/strict');

const app = fs.readFileSync('src/App.jsx', 'utf8');
const css = fs.readFileSync('src/redesign.css', 'utf8');

for (const stage of ['Preparar','Revisão','Em andamento','Resultados']) assert.ok(app.includes(`'${stage}'`), `provas devem indicar a etapa ${stage}`);
assert.ok(app.includes("aria-current={index===examStageIndex?'step':undefined}"), 'a etapa atual deve ser comunicada de forma acessível');
assert.ok(app.includes('Criação manual') && app.includes('Rascunho com o Nyx'), 'criação manual e IA devem ser escolhas separadas');
assert.ok(app.includes('nada começa imediatamente'), 'a interface deve explicar a revisão antes do início');
assert.ok(!app.includes('🚀 Gerar e Iniciar Prova'), 'o botão não deve prometer início imediato quando abre revisão');
assert.ok(css.includes('.teacher-exam-progress') && css.includes('@media(max-width:650px)'), 'o fluxo de prova deve ser responsivo');

console.log('Provas apresentam etapas claras e separam criação manual do rascunho com IA.');
