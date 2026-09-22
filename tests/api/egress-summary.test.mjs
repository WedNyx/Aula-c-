import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
let pass = 0, fail = 0
const check = (name, condition, detail = '') => {
  if (condition) { pass++; console.log(`✅ ${name}`) }
  else { fail++; console.log(`❌ ${name}${detail ? ` | ${detail}` : ''}`) }
}

process.env.KV_REST_API_URL = 'http://localhost:8936'
process.env.KV_REST_API_TOKEN = 'fake-token'
process.env.TEACHER_PASSWORD = 'senha-de-teste-123'
process.env.FAKE_REDIS_PORT = '8936'

const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env })
await new Promise(resolve => setTimeout(resolve, 500))

const mockReq = body => ({ method: 'POST', body, headers: {}, query: {} })
const mockRes = () => {
  let statusCode = 200
  const response = {
    status(code) { statusCode = code; return response },
    json(body) { response._body = body; response._status = statusCode; return response },
  }
  return response
}
const handler = (await import(pathToFileURL(path.join(__dirname, '../../api/kv.js')).href)).default
const call = async body => { const res = mockRes(); await handler(mockReq(body), res); return res }

const key = 'student:vespertino:Aluno_Teste'
const profile = {
  name: 'Aluno Teste', shift: 'vespertino', lastSeen: Date.now(), phase: 'coding', score: 80,
  files: [{ name: 'Program.cs', code: 'Console.WriteLine("payload grande");'.repeat(500) }],
  code: 'Console.WriteLine("payload grande");'.repeat(500),
  dynamicSummary: { text: 'resumo pesado'.repeat(500) },
  attendance: { '2026-09-22': 'present' },
}

const saved = await call({ action: 'set', key, value: JSON.stringify(profile) })
check('Perfil completo continua sendo salvo normalmente', saved._body?.ok === true, JSON.stringify(saved._body))

const listed = await call({ action: 'list_with_values', prefix: 'student-summary:' })
const summary = JSON.parse(listed._body?.items?.[0]?.value || '{}')
check('Projeção leve é criada junto com o perfil', listed._body?.items?.length === 1)
check('Projeção mantém estado necessário ao monitoramento', summary.name === profile.name && summary.lastSeen === profile.lastSeen && summary.phase === 'coding')
check('Projeção não transporta código, resumo nem presença histórica', !('files' in summary) && !('code' in summary) && !('dynamicSummary' in summary) && !('attendance' in summary))
check('Projeção é muito menor que o perfil completo', JSON.stringify(summary).length < JSON.stringify(profile).length / 20)

const removed = await call({ action: 'delete', key, auth: 'senha-de-teste-123' })
const afterDelete = await call({ action: 'list_with_values', prefix: 'student-summary:' })
check('Excluir aluno remove também sua projeção', removed._body?.ok === true && afterDelete._body?.items?.length === 0)

console.log(`\n=== EGRESS SUMMARY TEST: ${pass}/${pass + fail} passed ===`)
server.kill()
process.exit(fail ? 1 : 0)
