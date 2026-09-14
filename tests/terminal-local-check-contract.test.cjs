const assert = require('node:assert/strict')
const fs = require('node:fs')

const terminal = fs.readFileSync('src/components/Terminal.jsx', 'utf8')
const executor = fs.readFileSync('api/execute-code.js', 'utf8')

assert.ok(terminal.includes('fetch("/api/execute-code"'))
assert.ok(terminal.includes('role="log" aria-live="polite" aria-label="Saída do terminal"'))
assert.ok(terminal.includes('disabled={running}'))
assert.ok(terminal.includes('aria-label="Comando do terminal"'))
assert.ok(executor.includes("language !== 'csharp'"))
assert.ok(executor.includes('CODE_LIMIT'))
assert.ok(executor.includes('enable_network: false'))

console.log('Terminal usa executor protegido, estado seguro e nomes acessíveis.')
