const assert = require('node:assert/strict');
const fs = require('node:fs');

const terminal = fs.readFileSync('src/components/Terminal.jsx', 'utf8');

assert.ok(terminal.includes('import { quickCheck } from "../lib/utils.js"'));
assert.ok(terminal.includes('const localError = quickCheck(projectSrc())'));
assert.ok(terminal.includes('Verificação local: ${localError.message}'));
assert.ok(terminal.includes('role="log" aria-live="polite" aria-label="Saída do terminal"'));
assert.ok(terminal.includes('disabled={running}'), 'limpeza e execução devem respeitar o estado ocupado');
assert.ok(terminal.includes('"Comando do terminal" : "Entrada do programa"'));

console.log('Terminal possui verificação local, estado seguro e nomes acessíveis.');
