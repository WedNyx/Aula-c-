// grade_duel/grade_team_duel checavam "já respondeu?" (config[scoreField] != null) só UMA vez, no
// início do handler, antes de qualquer escrita. Isso não fecha a janela entre VÁRIAS requisições
// concorrentes do MESMO aluno com respostas DIFERENTES (fácil de automatizar): todas passavam nessa
// checagem antes de qualquer uma escrever, e cada uma calculava e devolvia a nota da SUA própria
// combinação de respostas — dando pra comparar as notas de várias tentativas paralelas e ir
// deduzindo o gabarito aos poucos, exatamente o ataque que a checagem "já respondeu" foi feita pra
// impedir. Este teste dispara N respostas DIFERENTES do MESMO jogador ao mesmo tempo e confirma que
// todas voltam com a MESMA nota (a de quem realmente "venceu" a corrida de escrita), nunca a nota
// individual calculada por cada tentativa.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

const PORT = 8949;
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

const { default: kvHandler } = await import(pathToFileURL(path.join(__dirname, '../../api/kv.js')).href);

const QUESTIONS = Array.from({ length: 5 }, (_, i) => ({ q: `Pergunta ${i + 1}?`, opts: ['A', 'B', 'C', 'D'], correct: 0 }));

// combinações de resposta que dariam notas BEM diferentes (0,1,2,3,4 de 5) se cada requisição fosse
// avaliada de forma isolada — é exatamente esse "leque de notas diferentes" que um script tentando
// adivinhar o gabarito quer ver, comparando qual combinação "rendeu mais"
const GUESSES = [
  { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 }, // 0 certas
  { 0: 0, 1: 1, 2: 1, 3: 1, 4: 1 }, // 1 certa
  { 0: 0, 1: 0, 2: 1, 3: 1, 4: 1 }, // 2 certas
  { 0: 0, 1: 0, 2: 0, 3: 1, 4: 1 }, // 3 certas
  { 0: 0, 1: 0, 2: 0, 3: 0, 4: 1 }, // 4 certas
];

// ── 1x1: um script manda N chutes DIFERENTES em paralelo, se passando pelo mesmo jogador ──
{
  const doc = { from: 'Sneaky', to: 'Vitima', fromAvatar: {}, toAvatar: {}, questions: QUESTIONS, status: 'active', answersFrom: {}, answersTo: {}, scoreFrom: null, scoreTo: null, createdAt: Date.now() };
  await kvHandler(mockReq({ action: 'set', key: 'duel:matutino:Sneaky__Vitima', value: JSON.stringify(doc) }, '10.3.0.1'), mockRes());

  const results = await Promise.all(GUESSES.map((answers, i) =>
    kvHandler(mockReq({ action: 'grade_duel', shift: 'matutino', from: 'Sneaky', to: 'Vitima', myName: 'Sneaky', answers }, `10.3.0.${i + 2}`), mockRes())
  ));

  const scores = results.map(r => r._body?.score);
  check('Todas as respostas paralelas voltaram com sucesso (nenhum 500/erro cru)', results.every(r => r._status === 200 || r._status === 409), JSON.stringify(results.map(r => r._body)));
  const successScores = results.filter(r => r._status === 200).map(r => r._body.score);
  check('TODAS as tentativas bem-sucedidas devolveram a MESMA nota (nenhuma vazou a nota calculada da SUA combinação isolada)', new Set(successScores).size === 1, JSON.stringify(scores));

  const final = mockRes();
  await kvHandler(mockReq({ action: 'get', key: 'duel:matutino:Sneaky__Vitima', auth: 'senha-de-teste-123' }, '10.3.0.9'), final);
  const saved = JSON.parse(final._body.value);
  check('A nota devolvida bate com a que ficou REALMENTE gravada no banco', successScores[0] === saved.scoreFrom, `devolvida=${successScores[0]} gravada=${saved.scoreFrom}`);
}

// ── 2x2: mesmo ataque, um jogador da dupla manda N chutes diferentes em paralelo ──
{
  const players = [{ name: 'SneakyTeam', avatar: {}, team: 'A' }, { name: 'Colega', avatar: {}, team: 'A' }, { name: 'Rival1', avatar: {}, team: 'B' }, { name: 'Rival2', avatar: {}, team: 'B' }];
  // mesma derivação de chave que teamDuelKeyFor usa no servidor: nomes ordenados alfabeticamente
  const key = `teamduel:matutino:${players.map(p => p.name).sort().join('__')}`;
  const doc = { from: 'SneakyTeam', players, status: 'active', accepted: { SneakyTeam: true, Colega: true, Rival1: true, Rival2: true }, questions: QUESTIONS, answers: {}, scores: {}, createdAt: Date.now() };
  await kvHandler(mockReq({ action: 'set', key, value: JSON.stringify(doc) }, '10.4.0.1'), mockRes());

  const results = await Promise.all(GUESSES.map((answers, i) =>
    kvHandler(mockReq({ action: 'grade_team_duel', shift: 'matutino', names: players.map(p => p.name), myName: 'SneakyTeam', answers }, `10.4.0.${i + 2}`), mockRes())
  ));
  const successScores = results.filter(r => r._status === 200).map(r => r._body.score);
  check('2x2: TODAS as tentativas bem-sucedidas devolveram a MESMA nota', new Set(successScores).size === 1, JSON.stringify(results.map(r => r._body)));

  const final = mockRes();
  await kvHandler(mockReq({ action: 'get', key, auth: 'senha-de-teste-123' }, '10.4.0.9'), final);
  const saved = JSON.parse(final._body.value);
  check('2x2: a nota devolvida bate com a que ficou gravada no banco', successScores[0] === saved.scores['SneakyTeam'], `devolvida=${successScores[0]} gravada=${saved.scores['SneakyTeam']}`);
}

console.log(`\n=== DUELO: RESPOSTAS PARALELAS DO MESMO JOGADOR NÃO VAZAM O GABARITO POR COMPARAÇÃO DE NOTAS: ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
