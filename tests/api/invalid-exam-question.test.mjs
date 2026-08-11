// A prova/atividade é gerada 100% por IA. Se a IA devolver uma questão sem "correct" válido
// (fora do range de opts, ou undefined), o servidor precisa DESCARTAR essa questão do cálculo em
// vez de deixar ela zerar a chance de todo mundo acertar (defesa em profundidade — a validação
// principal já acontece no cliente antes de salvar a prova, isso aqui cobre o caso de alguém
// conseguir gravar uma config malformada de outro jeito).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

const PORT = 8939;
process.env.KV_REST_API_URL = `http://localhost:${PORT}`;
process.env.KV_REST_API_TOKEN = 'fake-token';
process.env.TEACHER_PASSWORD = 'senha-de-teste-123';
process.env.FAKE_REDIS_PORT = String(PORT);

const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env });
await new Promise(r => setTimeout(r, 500));

function mockReq(body, ip) { return { method: 'POST', body, headers: { 'x-forwarded-for': ip || '10.0.0.60' }, socket: {} }; }
function mockRes() {
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return res;
}

const { default: kvHandler } = await import('file:///home/user/Aula-c-/api/kv.js');

// 5 questões válidas + 2 malformadas (correct fora do range / undefined) — como se a IA tivesse
// devolvido isso sem passar pela validação do cliente
const questions = [
  { q: 'O que faz Console.WriteLine?', opts: ['Mostra texto', 'Apaga variável', 'Cria classe', 'Fecha o programa'], correct: 0 },
  { q: 'Qual tipo guarda números inteiros?', opts: ['string', 'int', 'bool', 'void'], correct: 1 },
  { q: 'Questão malformada 1 (correct fora do range)', opts: ['A', 'B'], correct: 5 },
  { q: 'O que é uma classe?', opts: ['Um erro', 'Um número', 'Um molde de objeto', 'Um comentário'], correct: 2 },
  { q: 'Questão malformada 2 (correct undefined)', opts: ['A', 'B', 'C'] },
  { q: 'O que faz um for?', opts: ['Repete código', 'Apaga código', 'Comenta código', 'Compila código'], correct: 0 },
  { q: 'Qual símbolo termina uma instrução em C#?', opts: [',', '.', ':', ';'], correct: 3 },
];
const examConfig = { status: 'active', questions, shift: 'matutino', activatedAt: Date.now() };

{
  const req = mockReq({ action: 'set', key: 'exam:config:matutino', value: JSON.stringify(examConfig), auth: 'senha-de-teste-123' });
  await kvHandler(req, mockRes());
}

// todo mundo acerta as 5 questões válidas (índices 0,1,3,5,6) e "acerta" as malformadas também
// (não deveria contar, já que nenhuma resposta pode bater com um gabarito inválido)
{
  const answers = { 0: 0, 1: 1, 2: 5, 3: 2, 4: 0, 5: 0, 6: 3 };
  const req = mockReq({ action: 'grade_exam', shift: 'matutino', answers, exits: 0 });
  const res = mockRes();
  await kvHandler(req, res);
  check('total ignora as 2 questões malformadas (5, não 7)', res._body.total === 5, JSON.stringify(res._body));
  check('as 5 respostas certas válidas contam normalmente: raw=50', res._body.raw === 50, JSON.stringify(res._body));
  check('nenhuma questão malformada derruba a nota de quem "acertaria" ela', res._body.finalScore === 50, JSON.stringify(res._body));
}

// aluno que erra tudo (inclusive não consegue "acertar" as malformadas, óbvio) também não é
// penalizado extra por causa delas — total continua 5
{
  const answers = { 0: 1, 1: 0, 2: 0, 3: 0, 4: 1, 5: 1, 6: 0 };
  const req = mockReq({ action: 'grade_exam', shift: 'matutino', answers, exits: 0 });
  const res = mockRes();
  await kvHandler(req, res);
  check('0 corretas entre as válidas: raw=0, total continua 5', res._body.raw === 0 && res._body.total === 5, JSON.stringify(res._body));
}

console.log(`\n=== QUESTÃO SEM GABARITO VÁLIDO NÃO PENALIZA NINGUÉM: ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
