const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('src/App.jsx', 'utf8');
const tour = fs.readFileSync('src/components/TourOverlay.jsx', 'utf8');
const mobile = fs.readFileSync('src/components/MobileMonitor.jsx', 'utf8');

assert.ok(app.includes('data-tour-prof="student-code-editor"'), 'o monitoramento deve expor o editor de código do aluno');
assert.ok(app.includes('Salvar no editor do aluno'), 'o professor deve ter uma ação explícita para salvar');
assert.ok(app.includes('codeSignature(latest) !== studentCodeBaseline'), 'o salvamento deve detectar edição concorrente');
assert.ok(app.includes('kind:"teacher-code-edit"'), 'a sessão do aluno deve receber a correção do professor');
assert.ok(app.includes('setFiles(editedFiles)'), 'o editor aberto do aluno deve aplicar os arquivos corrigidos');
assert.ok(app.includes('teacherCodeEditedAt'), 'a intervenção deve registrar quando ocorreu');
assert.ok(tour.includes('Corrigir código à distância'), 'o tour do professor deve explicar a nova função');
assert.ok(mobile.includes('✏️ Editar código'), 'o modo simples deve oferecer um caminho direto para a edição');

console.log('Edição remota do código do aluno: contrato aprovado.');
