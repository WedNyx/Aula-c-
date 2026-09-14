const assert = require('node:assert/strict')
const fs = require('node:fs')

const app = fs.readFileSync('src/App.jsx', 'utf8')
const ai = fs.readFileSync('src/lib/ai.js', 'utf8')

assert.match(app, /const resumoAbortRef = useRef\(null\)/)
assert.match(app, /⏹️ Parar de gerar/)
assert.match(app, /resumoAbortRef\.current\.abort\(\)/)
assert.match(app, /Nada foi enviado e os alunos continuam no editor de código/)
assert.match(app, /signal:controller\.signal/)
assert.match(ai, /body: JSON\.stringify\(\{ prompt, system, \.\.\.bodyOpts \}\), signal/)
assert.match(ai, /if \(e\.name === 'AbortError'\) throw e/)

console.log('Geração de resumo pode ser cancelada sem retirar alunos do editor.')
