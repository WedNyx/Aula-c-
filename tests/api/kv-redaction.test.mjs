// Dado sensível de aluno (data de nascimento, CPF) não pode vazar em listagens sem senha — mas a
// leitura pontual (action "get") precisa continuar intacta, porque patchStudent() lê o registro
// inteiro, mistura com o patch e regrava tudo (se o "get" escondesse os campos, cada patch de
// nota/fase apagaria a data de nascimento/CPF do aluno sem querer).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

const PORT = 8936;
process.env.KV_REST_API_URL = `http://localhost:${PORT}`;
process.env.KV_REST_API_TOKEN = 'fake-token';
process.env.TEACHER_PASSWORD = 'senha-de-teste-123';
process.env.FAKE_REDIS_PORT = String(PORT);

const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env });
await new Promise(r => setTimeout(r, 500));

function mockReq(body) { return { method: 'POST', body }; }
function mockRes() {
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return res;
}

const { default: kvHandler } = await import(pathToFileURL(path.join(__dirname, '../../api/kv.js')).href);

const studentValue = JSON.stringify({ name: 'Fulano', shift: 'matutino', score: 90, birthDate: '2012-05-01', cpf: '123.456.789-00' });
{
  const req = mockReq({ action: 'set', key: 'student:matutino:Fulano', value: studentValue, auth: 'senha-de-teste-123' });
  const res = mockRes();
  await kvHandler(req, res);
  check('Seed do aluno com dados sensíveis funcionou', res._body.ok === true);
}

// 1) list_with_values SEM senha → esconde birthDate/cpf
{
  const req = mockReq({ action: 'list_with_values', prefix: 'student:' });
  const res = mockRes();
  await kvHandler(req, res);
  const item = res._body.items.find(i => i.key === 'student:matutino:Fulano');
  const parsed = JSON.parse(item.value);
  check('Listagem SEM senha esconde birthDate', parsed.birthDate === undefined, JSON.stringify(parsed));
  check('Listagem SEM senha esconde cpf', parsed.cpf === undefined, JSON.stringify(parsed));
  check('Listagem SEM senha mantém o resto (nome, nota)', parsed.name === 'Fulano' && parsed.score === 90);
}

// 2) list_with_values COM senha do professor → mantém tudo (planilha/certificado precisam disso)
{
  const req = mockReq({ action: 'list_with_values', prefix: 'student:', auth: 'senha-de-teste-123' });
  const res = mockRes();
  await kvHandler(req, res);
  const item = res._body.items.find(i => i.key === 'student:matutino:Fulano');
  const parsed = JSON.parse(item.value);
  check('Listagem COM senha do professor mantém birthDate', parsed.birthDate === '2012-05-01');
  check('Listagem COM senha do professor mantém cpf', parsed.cpf === '123.456.789-00');
}

// 3) list_with_values com senha ERRADA → continua escondendo (não é só "auth presente", tem que ser válida)
{
  const req = mockReq({ action: 'list_with_values', prefix: 'student:', auth: 'senha-errada' });
  const res = mockRes();
  await kvHandler(req, res);
  const item = res._body.items.find(i => i.key === 'student:matutino:Fulano');
  const parsed = JSON.parse(item.value);
  check('Listagem com senha ERRADA continua escondendo os dados sensíveis', parsed.birthDate === undefined);
}

// 4) action "get" (leitura pontual, 1 chave) NUNCA é redigida — nem sem auth — pra não quebrar o
// ciclo de leitura-mistura-regravação do patchStudent (senão cada patch apagaria os dados sensíveis)
{
  const req = mockReq({ action: 'get', key: 'student:matutino:Fulano' });
  const res = mockRes();
  await kvHandler(req, res);
  const parsed = JSON.parse(res._body.value);
  check('Leitura pontual (get) SEM senha mantém birthDate intacto (protege o patchStudent)', parsed.birthDate === '2012-05-01', JSON.stringify(parsed));
  check('Leitura pontual (get) SEM senha mantém cpf intacto', parsed.cpf === '123.456.789-00');
}

// 5) simula o ciclo real do patchStudent: get (sem auth) → mistura patch → set → confere que os
// dados sensíveis sobrevivem depois de um patch comum (nota da atividade, por exemplo)
{
  const getReq = mockReq({ action: 'get', key: 'student:matutino:Fulano' });
  const getRes = mockRes();
  await kvHandler(getReq, getRes);
  const cur = JSON.parse(getRes._body.value);
  const merged = { ...cur, score: 95 }; // patch comum, sem tocar em birthDate/cpf
  const setReq = mockReq({ action: 'set', key: 'student:matutino:Fulano', value: JSON.stringify(merged) });
  const setRes = mockRes();
  await kvHandler(setReq, setRes);

  const checkReq = mockReq({ action: 'list_with_values', prefix: 'student:', auth: 'senha-de-teste-123' });
  const checkRes = mockRes();
  await kvHandler(checkReq, checkRes);
  const after = JSON.parse(checkRes._body.items.find(i => i.key === 'student:matutino:Fulano').value);
  check('Depois de um patch comum (nota), birthDate/cpf continuam salvos (não foram apagados)', after.birthDate === '2012-05-01' && after.cpf === '123.456.789-00', JSON.stringify(after));
  check('E o patch em si funcionou (nota atualizada)', after.score === 95);
}

// 6) list_with_values em prefixos NÃO públicos (support:, checkin:, ou tudo com prefix vazio)
// precisa exigir a senha do professor — antes dessa correção, qualquer um sem login conseguia
// listar em massa qualquer chave do banco (inclusive os snapshots de backup:, que guardam um
// dump completo e não-redigido de todos os alunos)
{
  const seedReq = mockReq({ action: 'set', key: 'support:matutino:Fulano', value: JSON.stringify({ focus: true }), auth: 'senha-de-teste-123' });
  await kvHandler(seedReq, mockRes());

  const req = mockReq({ action: 'list_with_values', prefix: 'support:' });
  const res = mockRes();
  await kvHandler(req, res);
  check('Listar "support:" SEM senha é bloqueado (403)', res._status === 403, JSON.stringify(res._body));

  const req2 = mockReq({ action: 'list_with_values', prefix: 'support:', auth: 'senha-de-teste-123' });
  const res2 = mockRes();
  await kvHandler(req2, res2);
  check('Listar "support:" COM senha do professor funciona', res2._status !== 403 && Array.isArray(res2._body.items));
}
{
  const req = mockReq({ action: 'list_with_values', prefix: 'checkin:' });
  const res = mockRes();
  await kvHandler(req, res);
  check('Listar "checkin:" SEM senha é bloqueado (403)', res._status === 403);
}
{
  // prefix vazio ('') varreria o banco INTEIRO (inclusive backup: com dump não-redigido) — tem
  // que ser bloqueado sem senha
  const req = mockReq({ action: 'list_with_values', prefix: '' });
  const res = mockRes();
  await kvHandler(req, res);
  check('Listar TUDO (prefix vazio) SEM senha é bloqueado (403)', res._status === 403);

  const req2 = mockReq({ action: 'list_with_values', prefix: '', auth: 'senha-de-teste-123' });
  const res2 = mockRes();
  await kvHandler(req2, res2);
  check('Listar TUDO (prefix vazio) COM senha do professor funciona', res2._status !== 403);
}
{
  // prefixos legitimamente públicos continuam liberados sem senha (alunos jogando duelo/parceiro
  // precisam ler isso sem estar logados como professor)
  for (const prefix of ['duel:matutino:', 'teamduel:matutino:', 'partner:matutino:']) {
    const req = mockReq({ action: 'list_with_values', prefix });
    const res = mockRes();
    await kvHandler(req, res);
    check(`Listar "${prefix}" SEM senha continua liberado`, res._status !== 403, JSON.stringify(res._body));
  }
}
{
  // um prefixo "curto demais" (ex: "s") não pode colar carona num prefixo público por acidente —
  // tem que continuar exigindo senha, mesmo que ele "contenha" prefixos públicos por baixo
  const req = mockReq({ action: 'list_with_values', prefix: 's' });
  const res = mockRes();
  await kvHandler(req, res);
  check('Prefixo curto demais ("s") continua exigindo senha', res._status === 403);
}

console.log(`\n=== REDAÇÃO DE DADOS SENSÍVEIS EM /api/kv TEST: ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
