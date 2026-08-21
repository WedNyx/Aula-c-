// A ação "get" (leitura de 1 chave) nunca teve proteção nenhuma, de propósito, pra não travar as
// leituras anônimas legítimas (aluno lendo o próprio duelo, sala de quiz, etc). Mas isso também
// deixava "get" ler o BACKUP inteiro do banco (que embute todo mundo sem redação nenhuma) e o log
// de erros sem senha nenhuma — bem pior que o vazamento de list_with_values já corrigido antes,
// porque dá pra baixar a base inteira de uma vez só sabendo o nome de uma chave de backup (que o
// próprio /api/backup?list=1, sem senha, já entrega).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

const PORT = 8941;
process.env.KV_REST_API_URL = `http://localhost:${PORT}`;
process.env.KV_REST_API_TOKEN = 'fake-token';
process.env.TEACHER_PASSWORD = 'senha-de-teste-123';
process.env.FAKE_REDIS_PORT = String(PORT);

const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env });
await new Promise(r => setTimeout(r, 500));

function mockReq(body) { return { method: 'POST', body, headers: {}, socket: {} }; }
function mockRes() {
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return res;
}

const { default: kvHandler } = await import(pathToFileURL(path.join(__dirname, '../../api/kv.js')).href);

// seed uma chave de backup de verdade (mesmo formato que createBackupSnapshot geraria: embute o
// valor CRU de cada chave, sem passar pela redação de campo sensível)
const backupBlob = JSON.stringify({
  'student:matutino:Fulano': JSON.stringify({ name: 'Fulano', birthDate: '2010-05-12', cpf: '111.111.111-11' }),
  'exam:config:matutino': JSON.stringify({ questions: [{ q: 'pergunta', opts: ['a','b'], correct: 0 }] }),
})
await kvHandler(mockReq({ action: 'set', key: 'backup:2026-07-30T03:00:00.000Z', value: backupBlob, auth: 'senha-de-teste-123' }), mockRes())
await kvHandler(mockReq({ action: 'set', key: 'errorlog:recent', value: JSON.stringify([{ message: 'algo quebrou' }]), auth: 'senha-de-teste-123' }), mockRes())
const teacherNotes = JSON.stringify([{ id: 'nota-1', title: 'Planejamento', body: 'Revisar arrays na próxima aula.' }])
await kvHandler(mockReq({ action: 'set', key: 'teachernotes:main', value: teacherNotes, auth: 'senha-de-teste-123' }), mockRes())

// 1) get de backup SEM senha é bloqueado
{
  const res = mockRes()
  await kvHandler(mockReq({ action: 'get', key: 'backup:2026-07-30T03:00:00.000Z' }), res)
  check('get de backup: SEM senha é bloqueado (403)', res._status === 403, JSON.stringify(res._body))
  check('a resposta bloqueada não vaza nenhum pedaço do backup', !JSON.stringify(res._body).includes('Fulano'))
}

// 2) get de errorlog SEM senha é bloqueado
{
  const res = mockRes()
  await kvHandler(mockReq({ action: 'get', key: 'errorlog:recent' }), res)
  check('get de errorlog: SEM senha é bloqueado (403)', res._status === 403, JSON.stringify(res._body))
}

// 3) get de backup COM a senha do professor continua funcionando (não quebrou a função normal)
{
  const res = mockRes()
  await kvHandler(mockReq({ action: 'get', key: 'backup:2026-07-30T03:00:00.000Z', auth: 'senha-de-teste-123' }), res)
  check('get de backup COM senha do professor funciona normalmente', res._status !== 403 && res._body.value === backupBlob)
}

// 4) get de errorlog COM senha continua funcionando
{
  const res = mockRes()
  await kvHandler(mockReq({ action: 'get', key: 'errorlog:recent', auth: 'senha-de-teste-123' }), res)
  check('get de errorlog COM senha do professor funciona normalmente', res._status !== 403 && res._body.value != null)
}

// 5) get de senha ERRADA continua bloqueado (não é só "auth presente")
{
  const res = mockRes()
  await kvHandler(mockReq({ action: 'get', key: 'backup:2026-07-30T03:00:00.000Z', auth: 'senha-errada' }), res)
  check('get de backup com senha ERRADA continua bloqueado', res._status === 403)
}

// 6) leituras anônimas legítimas de OUTRAS chaves continuam funcionando (não quebrou nada)
{
  await kvHandler(mockReq({ action: 'set', key: 'duel:matutino:A__B', value: JSON.stringify({ status: 'active' }), auth: 'senha-de-teste-123' }), mockRes())
  const res = mockRes()
  await kvHandler(mockReq({ action: 'get', key: 'duel:matutino:A__B' }), res)
  check('get de outras chaves (ex: duel:) SEM senha continua liberado', res._status !== 403 && res._body.value != null, JSON.stringify(res._body))
}

// 7) as anotações pessoais do professor também são privadas: só a sessão autenticada lê/escreve
{
  const anonymousRead = mockRes()
  await kvHandler(mockReq({ action: 'get', key: 'teachernotes:main' }), anonymousRead)
  check('get de anotações do professor SEM senha é bloqueado (403)', anonymousRead._status === 403 && !JSON.stringify(anonymousRead._body).includes('Planejamento'))

  const teacherRead = mockRes()
  await kvHandler(mockReq({ action: 'get', key: 'teachernotes:main', auth: 'senha-de-teste-123' }), teacherRead)
  check('get de anotações COM senha funciona normalmente', teacherRead._status !== 403 && teacherRead._body.value === teacherNotes)

  const anonymousWrite = mockRes()
  await kvHandler(mockReq({ action: 'set', key: 'teachernotes:main', value: '[]' }), anonymousWrite)
  check('alterar anotações SEM senha é bloqueado (403)', anonymousWrite._status === 403)
}

console.log(`\n=== LEITURAS PRIVADAS (BACKUP/ERRORLOG/ANOTAÇÕES): ${pass}/${pass + fail} passed ===`)
server.kill()
process.exit(fail > 0 ? 1 : 0)
