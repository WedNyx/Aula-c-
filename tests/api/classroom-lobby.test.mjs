import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
let pass = 0, fail = 0
const check = (name, condition, extra = '') => condition ? (pass++, console.log(`✅ ${name}`)) : (fail++, console.log(`❌ ${name}${extra ? ` | ${extra}` : ''}`))
const PORT = 8962
process.env.KV_REST_API_URL = `http://localhost:${PORT}`
process.env.KV_REST_API_TOKEN = 'fake-token'
process.env.TEACHER_PASSWORD = 'senha-lobby'
process.env.FAKE_REDIS_PORT = String(PORT)
const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env })
await new Promise(resolve => setTimeout(resolve, 500))

const req = body => ({ method: 'POST', body, headers: { 'x-forwarded-for': '10.6.0.1' }, socket: {} })
const res = () => { let code = 200; const value = { status(v){ code=v; return value }, json(body){ value.body=body; value.code=code; return value } }; return value }
const { default: handler } = await import(pathToFileURL(path.join(__dirname, '../../api/kv.js')).href)
const call = async body => { const output=res(); await handler(req(body),output); return output }

const first = await call({ action:'lobby_join', turmaId:'vespertino', studentName:'Ana Silva', avatar:'avatar-1' })
check('Turma comum começa com os portões fechados', first.body?.granted === false)
const forbidden = await call({ action:'lobby_list' })
check('Lista de espera exige senha do professor', forbidden.code === 403)
const list = await call({ action:'lobby_list', auth:'senha-lobby' })
check('Professor vê o aluno e o horário de chegada', list.body?.waiting?.[0]?.name === 'Ana Silva' && Number.isFinite(list.body.waiting[0].joinedAt), JSON.stringify(list.body))

await call({ action:'lobby_grant', turmaId:'vespertino', studentName:'Ana Silva', auth:'senha-lobby' })
const granted = await call({ action:'lobby_join', turmaId:'vespertino', studentName:'Ana Silva', avatar:'avatar-1' })
check('Liberação individual permite entrar', granted.body?.granted === true)

await call({ action:'lobby_set_gate', turmaId:'vespertino', open:false, auth:'senha-lobby' })
const relocked = await call({ action:'lobby_join', turmaId:'vespertino', studentName:'Ana Silva', avatar:'avatar-1' })
check('Fechar os portões inicia novo ciclo e invalida a liberação anterior', relocked.body?.granted === false)
await call({ action:'lobby_set_gate', turmaId:'vespertino', open:true, auth:'senha-lobby' })
const classGranted = await call({ action:'lobby_join', turmaId:'vespertino', studentName:'Rafa Lima', avatar:'avatar-2' })
check('Abrir a turma libera quem entrar', classGranted.body?.granted === true)
const testProfile = await call({ action:'lobby_join', turmaId:'teste', studentName:'Perfil Teste' })
check('Perfil especial de teste não fica bloqueado', testProfile.body?.granted === true)

console.log(`\n=== SALA DE EMBARQUE: ${pass}/${pass + fail} passed ===`)
server.kill()
process.exit(fail ? 1 : 0)
