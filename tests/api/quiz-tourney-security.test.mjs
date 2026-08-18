// O Quiz estilo Kahoot e o Torneio da turma vazavam o gabarito de toda pergunta (inclusive as
// ainda não reveladas) via "get" sem senha — o mesmo tipo de furo já fechado pra prova. O torneio
// tinha um problema mais fundo ainda: a pontuação era calculada e auto-declarada pelo próprio
// cliente do aluno, sem nenhuma verificação do servidor, e concedia pontos permanentes (nyxPoints)
// com base nisso. Este teste cobre a redação condicional (revela só o que já fechou) e a nova
// correção server-side do torneio (grade_tourney_round).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

const PORT = 8942;
process.env.KV_REST_API_URL = `http://localhost:${PORT}`;
process.env.KV_REST_API_TOKEN = 'fake-token';
process.env.TEACHER_PASSWORD = 'senha-de-teste-123';
process.env.FAKE_REDIS_PORT = String(PORT);

const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env });
await new Promise(r => setTimeout(r, 500));

function mockReq(body, ip) { return { method: 'POST', body, headers: { 'x-forwarded-for': ip || '10.0.0.70' }, socket: {} }; }
function mockRes() {
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return res;
}

const { default: kvHandler } = await import(pathToFileURL(path.join(__dirname, '../../api/kv.js')).href);

// ═══════════════ QUIZ ═══════════════
const quizQuestions = [
  { q: 'Pergunta 1', opts: ['a', 'b', 'c', 'd'], correct: 0 },
  { q: 'Pergunta 2', opts: ['a', 'b', 'c', 'd'], correct: 1 },
  { q: 'Pergunta 3', opts: ['a', 'b', 'c', 'd'], correct: 2 },
];

async function seedQuiz(status, qIndex) {
  const room = { status, qIndex, questions: quizQuestions, startedAts: { [qIndex]: Date.now() }, code: '123456', secs: 20, themeTitle: 'Teste' };
  await kvHandler(mockReq({ action: 'set', key: 'quiz:room', value: JSON.stringify(room), auth: 'senha-de-teste-123' }), mockRes());
}

// pergunta atual ("question", cronômetro rodando): esconde a certa da pergunta atual E das futuras
{
  await seedQuiz('question', 0);
  const res = mockRes();
  await kvHandler(mockReq({ action: 'get', key: 'quiz:room' }), res);
  const room = JSON.parse(res._body.value);
  check('Quiz "question": pergunta ATUAL (0) não expõe "correct"', !('correct' in room.questions[0]));
  check('Quiz "question": pergunta FUTURA (1) não expõe "correct"', !('correct' in room.questions[1]));
  check('Quiz "question": texto/opções continuam intactos', room.questions[0].q === 'Pergunta 1' && room.questions[0].opts.length === 4);
}

// pergunta revelada ("reveal", cronômetro fechou): mostra a certa SÓ da pergunta atual, esconde as futuras
{
  await seedQuiz('reveal', 0);
  const res = mockRes();
  await kvHandler(mockReq({ action: 'get', key: 'quiz:room' }), res);
  const room = JSON.parse(res._body.value);
  check('Quiz "reveal": pergunta ATUAL (0) mostra "correct" (é assim que o jogo funciona)', room.questions[0].correct === 0);
  check('Quiz "reveal": pergunta FUTURA (1) continua escondida', !('correct' in room.questions[1]));
}

// avançou pra pergunta 1: pergunta 0 (já passada) continua visível, mesmo sem "reveal" explícito
{
  await seedQuiz('question', 1);
  const res = mockRes();
  await kvHandler(mockReq({ action: 'get', key: 'quiz:room' }), res);
  const room = JSON.parse(res._body.value);
  check('Quiz: pergunta JÁ PASSADA (0) continua revelada mesmo com a atual (1) escondida', room.questions[0].correct === 0 && !('correct' in room.questions[1]));
}

// pódio: revela tudo (acabou)
{
  await seedQuiz('podium', 2);
  const res = mockRes();
  await kvHandler(mockReq({ action: 'get', key: 'quiz:room' }), res);
  const room = JSON.parse(res._body.value);
  check('Quiz "podium": TODAS as perguntas ficam reveladas (acabou o jogo)', room.questions.every(q => 'correct' in q));
}

// professor autenticado sempre vê tudo, em qualquer status
{
  await seedQuiz('question', 0);
  const res = mockRes();
  await kvHandler(mockReq({ action: 'get', key: 'quiz:room', auth: 'senha-de-teste-123' }), res);
  const room = JSON.parse(res._body.value);
  check('Quiz: professor autenticado vê o gabarito completo mesmo em "question"', room.questions.every(q => 'correct' in q));
}

// ═══════════════ TORNEIO ═══════════════
const tourneyQuestions1 = [
  { pergunta: 'T1-Q1', alternativas: ['a', 'b', 'c', 'd'], correta: 0 },
  { pergunta: 'T1-Q2', alternativas: ['a', 'b', 'c', 'd'], correta: 1 },
];
const tourneyQuestions2 = [
  { pergunta: 'T2-Q1', alternativas: ['a', 'b', 'c', 'd'], correta: 2 },
];

const TURMA = 'vespertino';
async function seedTourney(round, status, turmaId = TURMA) {
  const config = {
    id: 999, status, round,
    questions: { 1: tourneyQuestions1, 2: tourneyQuestions2 },
    matches: [{ round: 1, a: 'Ana', b: 'Beto' }],
    usedQuestions: [],
  };
  await kvHandler(mockReq({ action: 'set', key: `tourney:config:${turmaId}`, value: JSON.stringify(config), auth: 'senha-de-teste-123' }), mockRes());
  return config;
}

// rodada 1 ainda ativa: esconde "correta" da rodada 1 (a que está valendo)
{
  await seedTourney(1, 'active');
  const res = mockRes();
  await kvHandler(mockReq({ action: 'get', key: `tourney:config:${TURMA}` }), res);
  const config = JSON.parse(res._body.value);
  check('Torneio: rodada ATIVA (1) não expõe "correta"', config.questions['1'].every(q => !('correta' in q)));
  check('Torneio: texto/alternativas da rodada ativa continuam intactos', config.questions['1'][0].pergunta === 'T1-Q1' && config.questions['1'][0].alternativas.length === 4);
}

// avançou pra rodada 2: rodada 1 (já fechada) fica visível, rodada 2 (ativa) continua escondida
{
  await seedTourney(2, 'active');
  const res = mockRes();
  await kvHandler(mockReq({ action: 'get', key: `tourney:config:${TURMA}` }), res);
  const config = JSON.parse(res._body.value);
  check('Torneio: rodada JÁ FECHADA (1) fica revelada', config.questions['1'].every(q => 'correta' in q));
  check('Torneio: rodada ATIVA (2) continua escondida', config.questions['2'].every(q => !('correta' in q)));
}

// torneio "done" (campeão coroado): revela a última rodada também
{
  await seedTourney(2, 'done');
  const res = mockRes();
  await kvHandler(mockReq({ action: 'get', key: `tourney:config:${TURMA}` }), res);
  const config = JSON.parse(res._body.value);
  check('Torneio "done": última rodada (2) também fica revelada', config.questions['2'].every(q => 'correta' in q));
}

// professor sempre vê tudo
{
  await seedTourney(1, 'active');
  const res = mockRes();
  await kvHandler(mockReq({ action: 'get', key: `tourney:config:${TURMA}`, auth: 'senha-de-teste-123' }), res);
  const config = JSON.parse(res._body.value);
  check('Torneio: professor vê o gabarito completo mesmo com rodada ativa', config.questions['1'].every(q => 'correta' in q));
}

// grade_tourney_round: corrige no servidor, nunca revela o gabarito na resposta
{
  await seedTourney(1, 'active');
  const picks = { 0: 0, 1: 3 }; // Q1 certa (correta=0), Q2 errada (correta=1, respondeu 3)
  const res = mockRes();
  await kvHandler(mockReq({ action: 'grade_tourney_round', tourneyId: 999, round: 1, picks, turmaId: TURMA }), res);
  check('grade_tourney_round: 1 de 2 certas', res._body.score === 1 && res._body.total === 2, JSON.stringify(res._body));
  check('grade_tourney_round: resposta nunca inclui "correta"', !JSON.stringify(res._body).includes('correta'));
  check('grade_tourney_round: NÃO exige senha (é o próprio aluno enviando)', res._status !== 403);
}

// rodada errada (já avançou) é rejeitada — não deixa mandar nota de rodada velha
{
  await seedTourney(2, 'active'); // agora a rodada 1 já não é mais a atual
  const res = mockRes();
  await kvHandler(mockReq({ action: 'grade_tourney_round', tourneyId: 999, round: 1, picks: { 0: 0, 1: 1 }, turmaId: TURMA }), res);
  check('grade_tourney_round: rodada velha (já avançada) é rejeitada (409)', res._status === 409, JSON.stringify(res._body));
}

// torneio de id diferente (outro torneio) também é rejeitado
{
  await seedTourney(1, 'active');
  const res = mockRes();
  await kvHandler(mockReq({ action: 'grade_tourney_round', tourneyId: 111, round: 1, picks: { 0: 0 }, turmaId: TURMA }), res);
  check('grade_tourney_round: id de torneio diferente é rejeitado (409)', res._status === 409, JSON.stringify(res._body));
}

// outra turma (mesmo turno ou não) nunca vê nem afeta o torneio desta — cada turma tem sua própria chave
{
  await seedTourney(1, 'active');
  const res = mockRes();
  await kvHandler(mockReq({ action: 'grade_tourney_round', tourneyId: 999, round: 1, picks: { 0: 0 }, turmaId: 'vespertino-b' }), res);
  check('grade_tourney_round: turma DIFERENTE (sem torneio próprio) é rejeitada (404, não acerta o torneio da outra turma)', res._status === 404 || res._body?.error === 'tourney_not_found', JSON.stringify(res._body));
}

// limite de tentativas por IP (mesmo risco de "descobrir o gabarito testando" do grade_exam)
{
  await seedTourney(1, 'active');
  const ip = '10.0.0.88';
  let sawRateLimited = false;
  for (let i = 0; i < 16; i++) {
    const res = mockRes();
    await kvHandler(mockReq({ action: 'grade_tourney_round', tourneyId: 999, round: 1, picks: { 0: 0 }, turmaId: TURMA }, ip), res);
    if (res._status === 429) sawRateLimited = true;
  }
  check('grade_tourney_round: depois de muitas tentativas do mesmo IP, cai no limite (429)', sawRateLimited);
}

console.log(`\n=== SEGURANÇA DO QUIZ E TORNEIO: ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
