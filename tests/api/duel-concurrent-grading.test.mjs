// grade_duel/grade_team_duel faziam um read-modify-write sem nenhuma proteção contra concorrência:
// se dois jogadores enviassem as respostas quase no mesmo instante, os dois liam a MESMA foto
// antiga do documento antes de qualquer um terminar de escrever a sua — o segundo "set" apagava
// silenciosamente a nota que o primeiro tinha acabado de gravar. Este teste dispara as respostas de
// TODOS os jogadores ao mesmo tempo (Promise.all, concorrência de verdade) e confirma que a nota de
// ninguém se perde.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

const PORT = 8948;
process.env.KV_REST_API_URL = `http://localhost:${PORT}`;
process.env.KV_REST_API_TOKEN = 'fake-token';
process.env.TEACHER_PASSWORD = 'senha-de-teste-123';
process.env.FAKE_REDIS_PORT = String(PORT);

const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env });
await new Promise(r => setTimeout(r, 500));

function mockReq(body, ip) { return { method: 'POST', body, headers: { 'x-forwarded-for': ip }, socket: {} }; }
function mockRes() {
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return res;
}

const { default: kvHandler } = await import('file:///home/user/Aula-c-/api/kv.js');

const QUESTIONS = Array.from({ length: 5 }, (_, i) => ({ q: `Pergunta ${i + 1}?`, opts: ['A', 'B', 'C', 'D'], correct: 0 }));

// ── 1x1: os dois jogadores enviam ao MESMO tempo ──
{
  const doc = { from: 'Duel_A', to: 'Duel_B', fromAvatar: {}, toAvatar: {}, questions: QUESTIONS, status: 'active', answersFrom: {}, answersTo: {}, scoreFrom: null, scoreTo: null, createdAt: Date.now() };
  await kvHandler(mockReq({ action: 'set', key: 'duel:matutino:Duel_A__Duel_B', value: JSON.stringify(doc) }, '10.1.0.1'), mockRes());

  const resA = mockRes(), resB = mockRes();
  await Promise.all([
    kvHandler(mockReq({ action: 'grade_duel', shift: 'matutino', from: 'Duel_A', to: 'Duel_B', myName: 'Duel_A', answers: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 } }, '10.1.0.2'), resA),
    kvHandler(mockReq({ action: 'grade_duel', shift: 'matutino', from: 'Duel_A', to: 'Duel_B', myName: 'Duel_B', answers: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 } }, '10.1.0.3'), resB),
  ]);

  check('1x1: os dois envios concorrentes tiveram sucesso (nenhum 409 de conflito não resolvido)', resA._status === 200 && resB._status === 200, JSON.stringify({ a: resA._body, b: resB._body }));

  const final = mockRes();
  await kvHandler(mockReq({ action: 'get', key: 'duel:matutino:Duel_A__Duel_B', auth: 'senha-de-teste-123' }, '10.1.0.4'), final);
  const saved = JSON.parse(final._body.value);
  check('1x1: a nota de AMBOS os jogadores sobreviveu ao envio simultâneo (nenhuma foi apagada por cima)', saved.scoreFrom === 5 && saved.scoreTo === 5, JSON.stringify({ scoreFrom: saved.scoreFrom, scoreTo: saved.scoreTo }));
  check('1x1: status ficou "done" (as duas notas foram registradas)', saved.status === 'done', saved.status);
}

// ── 2x2 (dupla): os 4 jogadores enviam ao MESMO tempo — o pior caso, 4 gravações concorrentes na
// mesma chave, é exatamente o cenário que tinha mais chance de perder nota antes desta correção ──
{
  const players = [{ name: 'TD_P1', avatar: {}, team: 'A' }, { name: 'TD_P2', avatar: {}, team: 'A' }, { name: 'TD_P3', avatar: {}, team: 'B' }, { name: 'TD_P4', avatar: {}, team: 'B' }];
  const key = 'teamduel:matutino:TD_P1__TD_P2__TD_P3__TD_P4';
  const doc = { from: 'TD_P1', players, status: 'active', accepted: { TD_P1: true, TD_P2: true, TD_P3: true, TD_P4: true }, questions: QUESTIONS, answers: {}, scores: {}, createdAt: Date.now() };
  await kvHandler(mockReq({ action: 'set', key, value: JSON.stringify(doc) }, '10.2.0.1'), mockRes());

  const results = await Promise.all(players.map((p, i) =>
    kvHandler(mockReq({ action: 'grade_team_duel', shift: 'matutino', names: players.map(x => x.name), myName: p.name, answers: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 } }, `10.2.0.${i + 2}`), mockRes())
  ));

  check('2x2: os 4 envios concorrentes tiveram sucesso (nenhum 409 de conflito não resolvido)', results.every(r => r._status === 200), JSON.stringify(results.map(r => r._body)));

  const final = mockRes();
  await kvHandler(mockReq({ action: 'get', key, auth: 'senha-de-teste-123' }, '10.2.0.9'), final);
  const saved = JSON.parse(final._body.value);
  const scoreCount = Object.keys(saved.scores || {}).length;
  check('2x2: as notas dos 4 jogadores sobreviveram ao envio simultâneo (nenhuma foi apagada por cima)', scoreCount === 4 && players.every(p => saved.scores[p.name] === 5), JSON.stringify(saved.scores));
  check('2x2: status ficou "done" (as 4 notas foram registradas)', saved.status === 'done', saved.status);
}

console.log(`\n=== GRADE_DUEL/GRADE_TEAM_DUEL: ENVIOS CONCORRENTES NÃO PERDEM NOTA (SEM CORRIDA) ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
