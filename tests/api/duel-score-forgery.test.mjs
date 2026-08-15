// grade_duel/grade_team_duel existem JUSTAMENTE pra nota nunca ser calculada nem gravada pelo
// cliente — mas a ação genérica "set" (usada de verdade só pra criar o convite e pra aceitar)
// aceitava, sem senha nenhuma, um documento "duel:"/"teamduel:" inteiro por cima, JÁ COM
// scoreFrom/scoreTo/scores preenchidos. Bastava chamar /api/kv direto (fora do app) com um "set"
// contendo a nota que quisesse pra "vencer" qualquer duelo sem responder nada. Este teste confirma
// que esse forjamento agora é bloqueado, sem quebrar a criação/aceite legítimos (que nunca mandam
// nota preenchida via "set").
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

const PORT = 8947;
process.env.KV_REST_API_URL = `http://localhost:${PORT}`;
process.env.KV_REST_API_TOKEN = 'fake-token';
process.env.TEACHER_PASSWORD = 'senha-de-teste-123';
process.env.FAKE_REDIS_PORT = String(PORT);

const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env });
await new Promise(r => setTimeout(r, 500));

function mockReq(body, ip = '10.0.0.60') { return { method: 'POST', body, headers: { 'x-forwarded-for': ip }, socket: {} }; }
function mockRes() {
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return res;
}

const { default: kvHandler } = await import('file:///home/user/Aula-c-/api/kv.js');

const QUESTIONS = Array.from({ length: 5 }, (_, i) => ({ q: `Pergunta ${i + 1}?`, opts: ['A', 'B', 'C', 'D'], correct: i % 4 }));

// ── 1) criação legítima do convite (scoreFrom/scoreTo NULOS) continua permitida sem senha ──
{
  const doc = { from: 'Ana', to: 'Beto', fromAvatar: {}, toAvatar: {}, questions: QUESTIONS, status: 'invited', answersFrom: {}, answersTo: {}, scoreFrom: null, scoreTo: null, createdAt: Date.now() };
  const res = mockRes();
  await kvHandler(mockReq({ action: 'set', key: 'duel:matutino:Ana__Beto', value: JSON.stringify(doc) }), res);
  check('Criar convite de duelo (scoreFrom/scoreTo nulos) continua permitido sem senha', res._status === 200 && res._body.ok === true, JSON.stringify(res._body));
}

// ── 2) aceitar o duelo (só muda "status") continua permitido sem senha ──
{
  const doc = { from: 'Ana', to: 'Beto', fromAvatar: {}, toAvatar: {}, questions: QUESTIONS, status: 'active', answersFrom: {}, answersTo: {}, scoreFrom: null, scoreTo: null, createdAt: Date.now() };
  const res = mockRes();
  await kvHandler(mockReq({ action: 'set', key: 'duel:matutino:Ana__Beto', value: JSON.stringify(doc) }), res);
  check('Aceitar o duelo (sem tocar na nota) continua permitido sem senha', res._status === 200 && res._body.ok === true, JSON.stringify(res._body));
}

// ── 3) forjar a nota direto via "set" (sem passar por grade_duel) é BLOQUEADO ──
{
  const forged = { from: 'Ana', to: 'Beto', fromAvatar: {}, toAvatar: {}, questions: QUESTIONS, status: 'done', answersFrom: { 0: 0 }, answersTo: {}, scoreFrom: 5, scoreTo: 0, createdAt: Date.now() };
  const res = mockRes();
  await kvHandler(mockReq({ action: 'set', key: 'duel:matutino:Ana__Beto', value: JSON.stringify(forged) }), res);
  check('Forjar scoreFrom/scoreTo direto via "set" é bloqueado (403)', res._status === 403, JSON.stringify(res._body));

  // confirma que a tentativa de forjar não alterou o que já estava salvo (só a nota "0" de Beto tentando ganhar)
  const check2 = mockRes();
  await kvHandler(mockReq({ action: 'get', key: 'duel:matutino:Ana__Beto', auth: 'senha-de-teste-123' }), check2);
  const saved = JSON.parse(check2._body.value);
  check('O documento no banco NÃO foi sobrescrito pela tentativa de forjar', saved.scoreFrom == null && saved.status === 'active', JSON.stringify({ scoreFrom: saved.scoreFrom, status: saved.status }));
}

// ── 4) só uma das notas preenchida (scoreTo forjado, scoreFrom ainda nulo) também é bloqueado ──
{
  const forged = { from: 'Ana', to: 'Beto', fromAvatar: {}, toAvatar: {}, questions: QUESTIONS, status: 'active', answersFrom: {}, answersTo: { 0: 0 }, scoreFrom: null, scoreTo: 99, createdAt: Date.now() };
  const res = mockRes();
  await kvHandler(mockReq({ action: 'set', key: 'duel:matutino:Ana__Beto', value: JSON.stringify(forged) }), res);
  check('Forjar só scoreTo (deixando scoreFrom nulo) também é bloqueado', res._status === 403, JSON.stringify(res._body));
}

// ── 5) mesma proteção pro duelo em dupla (teamduel: "scores" preenchido) ──
{
  const players = [{ name: 'P1', avatar: {}, team: 'A' }, { name: 'P2', avatar: {}, team: 'A' }, { name: 'P3', avatar: {}, team: 'B' }, { name: 'P4', avatar: {}, team: 'B' }];
  const key = 'teamduel:matutino:P1__P2__P3__P4';

  // criação legítima (scores vazio) continua permitida
  const okDoc = { from: 'P1', players, status: 'active', accepted: {}, questions: QUESTIONS, answers: {}, scores: {}, createdAt: Date.now() };
  const okRes = mockRes();
  await kvHandler(mockReq({ action: 'set', key, value: JSON.stringify(okDoc) }), okRes);
  check('Criar duelo em dupla (scores vazio) continua permitido sem senha', okRes._status === 200 && okRes._body.ok === true, JSON.stringify(okRes._body));

  // forjar scores é bloqueado
  const forgedDoc = { ...okDoc, scores: { P1: 5, P2: 5, P3: 0, P4: 0 }, status: 'done' };
  const forgedRes = mockRes();
  await kvHandler(mockReq({ action: 'set', key, value: JSON.stringify(forgedDoc) }), forgedRes);
  check('Forjar "scores" no duelo em dupla direto via "set" é bloqueado (403)', forgedRes._status === 403, JSON.stringify(forgedRes._body));
}

// ── 6) "errorlog:" — leitura já exigia senha; agora "set"/"delete" direto (sem passar por
// log_error/get_recent_errors) também exigem, então ninguém apaga ou injeta lixo no log sem senha ──
{
  await kvHandler(mockReq({ action: 'log_error', message: 'erro de verdade', role: 'aluno' }), mockRes());

  const setRes = mockRes();
  await kvHandler(mockReq({ action: 'set', key: 'errorlog:recent', value: 'lixo' }), setRes);
  check('"set" direto em errorlog: sem senha é bloqueado', setRes._status === 403, JSON.stringify(setRes._body));

  const delRes = mockRes();
  await kvHandler(mockReq({ action: 'delete', key: 'errorlog:recent' }), delRes);
  check('"delete" direto em errorlog: sem senha é bloqueado', delRes._status === 403, JSON.stringify(delRes._body));

  // log_error (o jeito de verdade de registrar um erro) continua livre, sem senha
  const logRes = mockRes();
  await kvHandler(mockReq({ action: 'log_error', message: 'outro erro de verdade', role: 'aluno' }), logRes);
  check('"log_error" (registrar um erro de verdade) continua sem exigir senha', logRes._status === 200 && logRes._body.ok === true, JSON.stringify(logRes._body));

  // o log não foi corrompido pela tentativa bloqueada de "set"
  const listRes = mockRes();
  await kvHandler(mockReq({ action: 'get_recent_errors', auth: 'senha-de-teste-123' }), listRes);
  check('O log de erros continua com as entradas de verdade (não virou "lixo")', listRes._body.errors.some(e => e.message === 'erro de verdade') && !listRes._body.errors.some(e => e.message === 'lixo'), JSON.stringify(listRes._body.errors));
}

// ── 7) "kbdlock:" — travar já exigia senha; destravar (delete) também precisa exigir ──
{
  const setRes = mockRes();
  await kvHandler(mockReq({ action: 'set', key: 'kbdlock:matutino', value: '1', auth: 'senha-de-teste-123' }), setRes);
  check('Professor consegue travar o teclado da turma (com senha)', setRes._status === 200 && setRes._body.ok === true, JSON.stringify(setRes._body));

  const delRes = mockRes();
  await kvHandler(mockReq({ action: 'delete', key: 'kbdlock:matutino' }), delRes);
  check('"delete" direto em kbdlock: sem senha é bloqueado (não destrava escondido)', delRes._status === 403, JSON.stringify(delRes._body));

  const getRes = mockRes();
  await kvHandler(mockReq({ action: 'get', key: 'kbdlock:matutino' }), getRes);
  check('O teclado continua travado depois da tentativa bloqueada de destravar', getRes._body.value === '1', JSON.stringify(getRes._body));

  const delOkRes = mockRes();
  await kvHandler(mockReq({ action: 'delete', key: 'kbdlock:matutino', auth: 'senha-de-teste-123' }), delOkRes);
  check('Professor consegue destravar o teclado (com senha)', delOkRes._status === 200 && delOkRes._body.ok === true, JSON.stringify(delOkRes._body));
}

console.log(`\n=== FORJAMENTO DE NOTA DE DUELO E PROTEÇÃO DE ERRORLOG/KBDLOCK BLOQUEADOS: ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
