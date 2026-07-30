// A prova (exam:config:<turno>) era corrigida no NAVEGADOR do aluno — o campo "correct" de cada
// questão viajava junto com o resto pra montar a tela, então qualquer aluno via a resposta certa
// antes de responder, só olhando a aba de rede do navegador. Agora: (1) "get" sem senha do
// professor esconde "correct" de toda questão em exam:config:, e (2) a correção de verdade
// acontece no servidor via a ação "grade_exam", que nunca devolve o gabarito, só a nota final.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

const PORT = 8938;
process.env.KV_REST_API_URL = `http://localhost:${PORT}`;
process.env.KV_REST_API_TOKEN = 'fake-token';
process.env.TEACHER_PASSWORD = 'senha-de-teste-123';
process.env.FAKE_REDIS_PORT = String(PORT);

const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env });
await new Promise(r => setTimeout(r, 500));

function mockReq(body, ip) { return { method: 'POST', body, headers: { 'x-forwarded-for': ip || '10.0.0.50' }, socket: {} }; }
function mockRes() {
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return res;
}

const { default: kvHandler } = await import('file:///home/user/Aula-c-/api/kv.js');

const questions = [
  { q: 'O que faz Console.WriteLine?', opts: ['Mostra texto', 'Apaga variável', 'Cria classe', 'Fecha o programa'], correct: 0 },
  { q: 'Qual tipo guarda números inteiros?', opts: ['string', 'int', 'bool', 'void'], correct: 1 },
  { q: 'O que é uma classe?', opts: ['Um erro', 'Um número', 'Um molde de objeto', 'Um comentário'], correct: 2 },
  { q: 'O que faz um for?', opts: ['Repete código', 'Apaga código', 'Comenta código', 'Compila código'], correct: 0 },
  { q: 'Qual símbolo termina uma instrução em C#?', opts: [',', '.', ':', ';'], correct: 3 },
];
const examConfig = { status: 'active', questions, shift: 'matutino', activatedAt: Date.now() };

// seed direto (ação protegida "set", com senha) — simula o professor tendo criado a prova
{
  const req = mockReq({ action: 'set', key: 'exam:config:matutino', value: JSON.stringify(examConfig), auth: 'senha-de-teste-123' });
  await kvHandler(req, mockRes());
}

// 1) "get" SEM senha esconde o campo "correct" de toda pergunta
{
  const req = mockReq({ action: 'get', key: 'exam:config:matutino' });
  const res = mockRes();
  await kvHandler(req, res);
  const parsed = JSON.parse(res._body.value);
  check('Listagem SEM senha tem as 5 perguntas', parsed.questions.length === 5);
  check('Nenhuma pergunta tem o campo "correct" exposto', parsed.questions.every(q => !('correct' in q)), JSON.stringify(parsed.questions[0]));
  check('O texto/opções da pergunta continuam intactos (só o gabarito some)', parsed.questions[0].q === questions[0].q && parsed.questions[0].opts.length === 4);
  check('A resposta bruta (string) não contém a palavra "correct" em lugar nenhum', !JSON.stringify(res._body).includes('correct'), JSON.stringify(res._body).slice(0, 300));
}

// 2) "get" COM a senha do professor mantém o gabarito completo
{
  const req = mockReq({ action: 'get', key: 'exam:config:matutino', auth: 'senha-de-teste-123' });
  const res = mockRes();
  await kvHandler(req, res);
  const parsed = JSON.parse(res._body.value);
  check('Listagem COM senha do professor mantém "correct" em todas as perguntas', parsed.questions.every((q, i) => q.correct === questions[i].correct));
}

// 3) "get" com senha ERRADA continua escondendo (não é só "auth presente", tem que ser válida)
{
  const req = mockReq({ action: 'get', key: 'exam:config:matutino', auth: 'senha-errada' });
  const res = mockRes();
  await kvHandler(req, res);
  const parsed = JSON.parse(res._body.value);
  check('Listagem com senha ERRADA continua escondendo o gabarito', parsed.questions.every(q => !('correct' in q)));
}

// 4) grade_exam: gabarito 100% certo
{
  const answers = { 0: 0, 1: 1, 2: 2, 3: 0, 4: 3 };
  const req = mockReq({ action: 'grade_exam', shift: 'matutino', answers, exits: 0 });
  const res = mockRes();
  await kvHandler(req, res);
  check('grade_exam NÃO exige senha do professor (é o próprio aluno enviando)', res._status !== 403, JSON.stringify(res._body));
  check('5 de 5 corretas: raw=50, finalScore=50, total=5', res._body.raw === 50 && res._body.finalScore === 50 && res._body.total === 5, JSON.stringify(res._body));
  check('A resposta do grade_exam NUNCA inclui o gabarito', !JSON.stringify(res._body).match(/correct|opts/i));
}

// 5) grade_exam: tudo errado
{
  const answers = { 0: 1, 1: 0, 2: 0, 3: 1, 4: 0 };
  const req = mockReq({ action: 'grade_exam', shift: 'matutino', answers, exits: 0 });
  const res = mockRes();
  await kvHandler(req, res);
  check('0 de 5 corretas: finalScore=0', res._body.finalScore === 0 && res._body.raw === 0);
}

// 6) grade_exam: 3 certas + 2 saídas de aba (desconta 10 por saída)
{
  const answers = { 0: 0, 1: 1, 2: 2, 3: 1, 4: 0 }; // 3 certas (0,1,2), 2 erradas (3,4)
  const req = mockReq({ action: 'grade_exam', shift: 'matutino', answers, exits: 2 });
  const res = mockRes();
  await kvHandler(req, res);
  check('3 certas (raw=30) com 2 saídas (desconta 20) = finalScore 10', res._body.raw === 30 && res._body.finalScore === 10, JSON.stringify(res._body));
}

// 7) grade_exam: desconto de saídas nunca deixa a nota negativa
{
  const answers = { 0: 0, 1: 0, 2: 0, 3: 1, 4: 0 }; // 1 certa (raw=10)
  const req = mockReq({ action: 'grade_exam', shift: 'matutino', answers, exits: 9 });
  const res = mockRes();
  await kvHandler(req, res);
  check('Desconto nunca deixa a nota negativa (fica em 0, não -80)', res._body.finalScore === 0, JSON.stringify(res._body));
}

// 8) grade_exam pra um turno sem prova nenhuma → 404
{
  const req = mockReq({ action: 'grade_exam', shift: 'vespertino', answers: {}, exits: 0 });
  const res = mockRes();
  await kvHandler(req, res);
  check('Turno sem prova configurada devolve 404', res._status === 404, JSON.stringify(res._body));
}

// 9) limite de tentativas: a nota devolvida entrega "quantas" acertou — sem um limite, dava pra
// tentar dezenas de combinações e descobrir o gabarito só olhando a nota subir/descer
{
  const ip = '10.0.0.77';
  let lastStatus = 200;
  for (let i = 0; i < 16; i++) {
    const req = mockReq({ action: 'grade_exam', shift: 'matutino', answers: { 0: 0 }, exits: 0 }, ip);
    const res = mockRes();
    await kvHandler(req, res);
    lastStatus = res._status;
  }
  check('Depois de muitas tentativas seguidas do mesmo IP, cai no limite (429)', lastStatus === 429, `último status: ${lastStatus}`);
}

console.log(`\n=== SEGURANÇA DA PROVA (GABARITO NUNCA SAI DO SERVIDOR): ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
