// Duelo 1x1 e em dupla (2x2): o documento era escrito com o gabarito completo ("correct" de cada
// pergunta) e ficava lá, visível pra qualquer um que desse "get"/"list_with_values" na chave do
// duelo — bastava abrir a aba de rede pra ver a resposta certa de cada pergunta antes de responder.
// A correção da pontuação também era feita no CLIENTE (confiava cegamente no que o navegador
// mandava de volta). Este teste confirma: (1) o gabarito nunca aparece pra quem não é professor,
// (2) a nota é calculada e gravada pelo SERVIDOR, com base na config verdadeira, (3) reenviar
// respostas diferentes não muda a nota já registrada, e (4) o gabarito continua intacto no banco
// depois da correção (não é apagado pelo merge do servidor).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

const PORT = 8946;
process.env.KV_REST_API_URL = `http://localhost:${PORT}`;
process.env.KV_REST_API_TOKEN = 'fake-token';
process.env.TEACHER_PASSWORD = 'senha-de-teste-123';
process.env.FAKE_REDIS_PORT = String(PORT);

const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env });
await new Promise(r => setTimeout(r, 500));

function mockReq(body, ip = '10.0.0.50') { return { method: 'POST', body, headers: { 'x-forwarded-for': ip }, socket: {} }; }
function mockRes() {
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return res;
}

const { default: kvHandler } = await import('file:///home/user/Aula-c-/api/kv.js');

// 5 perguntas, gabarito [0,1,2,3,0] — igual ao formato real gerado por generateDuelQuestions
const QUESTIONS = Array.from({ length: 5 }, (_, i) => ({ q: `Pergunta ${i + 1}?`, opts: ['A', 'B', 'C', 'D'], correct: i % 4 }));

// ── 1x1 ──────────────────────────────────────────────────────────────────────
{
  const doc = { from: 'AlunoA', to: 'AlunoB', fromAvatar: {}, toAvatar: {}, questions: QUESTIONS, status: 'active', answersFrom: {}, answersTo: {}, scoreFrom: null, scoreTo: null, createdAt: Date.now() };
  await kvHandler(mockReq({ action: 'set', key: 'duel:matutino:AlunoA__AlunoB', value: JSON.stringify(doc) }), mockRes());

  // 1) "get" sem senha nunca mostra "correct"
  {
    const res = mockRes();
    await kvHandler(mockReq({ action: 'get', key: 'duel:matutino:AlunoA__AlunoB' }), res);
    check('Duelo 1x1: "get" sem senha esconde "correct"', !res._body.value.includes('correct'), res._body.value);
    check('Duelo 1x1: "get" sem senha mantém texto/opções das perguntas', res._body.value.includes('Pergunta 1?') && res._body.value.includes('"A","B","C","D"'), res._body.value);
  }
  // 2) "get" COM a senha do professor mostra o gabarito normalmente
  {
    const res = mockRes();
    await kvHandler(mockReq({ action: 'get', key: 'duel:matutino:AlunoA__AlunoB', auth: 'senha-de-teste-123' }), res);
    check('Duelo 1x1: "get" com senha do professor mostra "correct"', res._body.value.includes('correct'), res._body.value);
  }
  // 3) "list_with_values" (como o app usa pra listar duelos ativos) também esconde "correct"
  {
    const res = mockRes();
    await kvHandler(mockReq({ action: 'list_with_values', prefix: 'duel:matutino:' }), res);
    const item = res._body.items.find(i => i.key === 'duel:matutino:AlunoA__AlunoB');
    check('Duelo 1x1: "list_with_values" sem senha esconde "correct"', item && !item.value.includes('correct'), item?.value);
  }
  // 4) grade_duel: quem não faz parte do duelo é rejeitado
  {
    const res = mockRes();
    await kvHandler(mockReq({ action: 'grade_duel', shift: 'matutino', from: 'AlunoA', to: 'AlunoB', myName: 'Intruso', answers: { 0: 0 } }), res);
    check('grade_duel: quem não é jogador desse duelo é rejeitado', res._body.error === 'not_a_player', JSON.stringify(res._body));
  }
  // 5) grade_duel: AlunoA acerta 2 (respondendo tudo 0: bate em i=0 e i=4)
  {
    const res = mockRes();
    await kvHandler(mockReq({ action: 'grade_duel', shift: 'matutino', from: 'AlunoA', to: 'AlunoB', myName: 'AlunoA', answers: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 } }), res);
    check('grade_duel: AlunoA acerta 2 de 5 (calculado no servidor)', res._body.score === 2, JSON.stringify(res._body));
  }
  // 6) grade_duel: AlunoB acerta as 5 (respondendo o gabarito certo) — prova que a nota de cada um
  // é calculada de verdade contra a config, não copiada/confiada do cliente
  {
    const res = mockRes();
    await kvHandler(mockReq({ action: 'grade_duel', shift: 'matutino', from: 'AlunoA', to: 'AlunoB', myName: 'AlunoB', answers: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 0 } }), res);
    check('grade_duel: AlunoB acerta 5 de 5 (nota independente da de AlunoA)', res._body.score === 5, JSON.stringify(res._body));
  }
  // 7) reenviar respostas diferentes NÃO muda a nota já registrada (evita usar a nota como oráculo)
  {
    const res = mockRes();
    await kvHandler(mockReq({ action: 'grade_duel', shift: 'matutino', from: 'AlunoA', to: 'AlunoB', myName: 'AlunoA', answers: { 0: 1, 1: 2, 2: 3, 3: 0, 4: 1 } }), res);
    check('grade_duel: reenviar respostas diferentes devolve a nota JÁ registrada (2), não recalcula', res._body.score === 2 && res._body.already === true, JSON.stringify(res._body));
  }
  // 8) o documento no banco ficou com status "done" (as duas notas foram gravadas) e o gabarito
  // ORIGINAL continua intacto — o merge do servidor não apaga "correct" pros dois jogadores
  {
    const res = mockRes();
    await kvHandler(mockReq({ action: 'get', key: 'duel:matutino:AlunoA__AlunoB', auth: 'senha-de-teste-123' }), res);
    const saved = JSON.parse(res._body.value);
    check('Duelo 1x1: status virou "done" depois dos dois responderem', saved.status === 'done', JSON.stringify(saved.status));
    check('Duelo 1x1: scoreFrom/scoreTo gravados corretamente (2 e 5)', saved.scoreFrom === 2 && saved.scoreTo === 5, `scoreFrom=${saved.scoreFrom} scoreTo=${saved.scoreTo}`);
    check('Duelo 1x1: o gabarito ORIGINAL continua intacto no banco depois do merge', saved.questions.every(q => typeof q.correct === 'number'), JSON.stringify(saved.questions));
  }
  // 9) rate limit: muitas tentativas seguidas do mesmo IP caem no 429
  {
    const ip = '10.0.0.51';
    let sawRateLimited = false;
    for (let i = 0; i < 20; i++) {
      const res = mockRes();
      await kvHandler(mockReq({ action: 'grade_duel', shift: 'matutino', from: 'AlunoA', to: 'AlunoB', myName: 'AlunoA', answers: {} }, ip), res);
      if (res._status === 429) sawRateLimited = true;
    }
    check('grade_duel: muitas tentativas seguidas do mesmo IP caem no limite (429)', sawRateLimited);
  }
}

// ── 2x2 (duelo em dupla) ───────────────────────────────────────────────────
{
  const players = [
    { name: 'P1', avatar: {}, team: 'A' }, { name: 'P2', avatar: {}, team: 'A' },
    { name: 'P3', avatar: {}, team: 'B' }, { name: 'P4', avatar: {}, team: 'B' },
  ];
  const doc = { from: 'P1', players, status: 'active', accepted: { P1: true, P2: true, P3: true, P4: true }, questions: QUESTIONS, answers: {}, scores: {}, createdAt: Date.now() };
  const key = 'teamduel:matutino:P1__P2__P3__P4';
  await kvHandler(mockReq({ action: 'set', key, value: JSON.stringify(doc) }), mockRes());

  // 1) "get" sem senha esconde "correct"
  {
    const res = mockRes();
    await kvHandler(mockReq({ action: 'get', key }), res);
    check('Duelo 2x2: "get" sem senha esconde "correct"', !res._body.value.includes('correct'), res._body.value);
  }
  // 2) quem não é um dos 4 jogadores é rejeitado
  {
    const res = mockRes();
    await kvHandler(mockReq({ action: 'grade_team_duel', shift: 'matutino', names: ['P1', 'P2', 'P3', 'P4'], myName: 'Intruso', answers: {} }), res);
    check('grade_team_duel: quem não é um dos 4 jogadores é rejeitado', res._body.error === 'not_a_player', JSON.stringify(res._body));
  }
  // 3) cada jogador tem sua própria nota calculada no servidor
  const answersByPlayer = {
    P1: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }, // acerta 2 (i=0, i=4)
    P2: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 0 }, // acerta 5
    P3: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 }, // acerta 1 (i=1)
    P4: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 1 }, // acerta 4
  };
  const expectedScores = { P1: 2, P2: 5, P3: 1, P4: 4 };
  for (const name of ['P1', 'P2', 'P3', 'P4']) {
    const res = mockRes();
    await kvHandler(mockReq({ action: 'grade_team_duel', shift: 'matutino', names: ['P1', 'P2', 'P3', 'P4'], myName: name, answers: answersByPlayer[name] }), res);
    check(`grade_team_duel: ${name} tem a nota certa calculada de forma independente (${expectedScores[name]})`, res._body.score === expectedScores[name], JSON.stringify(res._body));
  }
  // 4) depois dos 4 responderem, status vira "done" e o gabarito continua intacto no banco
  {
    const res = mockRes();
    await kvHandler(mockReq({ action: 'get', key, auth: 'senha-de-teste-123' }), res);
    const saved = JSON.parse(res._body.value);
    check('Duelo 2x2: status virou "done" depois dos 4 responderem', saved.status === 'done', JSON.stringify(saved.status));
    check('Duelo 2x2: as 4 notas batem com o esperado', JSON.stringify(saved.scores) === JSON.stringify(expectedScores), JSON.stringify(saved.scores));
    check('Duelo 2x2: o gabarito continua intacto no banco depois do merge', saved.questions.every(q => typeof q.correct === 'number'), JSON.stringify(saved.questions));
  }
}

console.log(`\n=== SEGURANÇA DO DUELO 1x1/2x2 (GABARITO + NOTA NO SERVIDOR): ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
