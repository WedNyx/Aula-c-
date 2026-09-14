const assert = require('node:assert/strict')
const fs = require('node:fs')
const terminal = fs.readFileSync('src/components/Terminal.jsx', 'utf8')

assert.match(terminal, /\/api\/execute-code/)
assert.match(terminal, /execution real pelo Judge0|execução real pelo Judge0/)
assert.match(terminal, /Console\.ReadLine/)
assert.match(terminal, /navigator\.clipboard\.writeText/)
assert.match(terminal, /execute\("build"\)/)
assert.match(terminal, /event\.ctrlKey && event\.key\.toLowerCase\(\) === "l"/)
assert.match(terminal, /lineColor\(line\)/)
assert.doesNotMatch(terminal, /askClaude|RUN_SYSTEM/)

console.log('Terminal usa execução real, entrada preparada, atalhos, cópia e leitura visual.')
