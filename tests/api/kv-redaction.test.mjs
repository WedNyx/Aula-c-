// Dado sensível de aluno (data de nascimento, CPF) não pode vazar em listagens sem senha — mas a
// leitura pontual (action "get") precisa continuar intacta, porque patchStudent() lê o registro
// inteiro, mistura com o patch e regrava tudo (se o "get" escondesse os campos, cada patch de
// nota/fase apagaria a data de nascimento/CPF do aluno sem querer).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const { default: kvHandler } = await import('file:///home/user/Aula-c-/api/kv.js');

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

console.log(`\n=== REDAÇÃO DE DADOS SENSÍVEIS EM /api/kv TEST: ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
