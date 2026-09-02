// Dados fictícios: leituras públicas não expõem CPF/nascimento; o servidor
// preserva esses campos durante atualizações de progresso sem autenticação.
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

// 4) A leitura individual também deve ocultar dados privados.
{
  const req = mockReq({ action: 'get', key: 'student:matutino:Fulano' });
  const res = mockRes();
  await kvHandler(req, res);
  const parsed = JSON.parse(res._body.value);
  check('Leitura pontual SEM senha esconde birthDate', parsed.birthDate === undefined);
  check('Leitura pontual SEM senha esconde cpf', parsed.cpf === undefined);
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

// Regressões de leitura, autosave e remoção autenticada de dados privados.
const teacher = 'senha-de-teste-123';
const studentKey = 'student:matutino:Fulano';
async function call(body) {
  const res = mockRes();
  await kvHandler(mockReq(body), res);
  return res;
}
async function readStudent(key = studentKey, auth = teacher) {
  const res = await call({ action: 'get', key, auth });
  return JSON.parse(res._body.value);
}
async function writeStudent(value, auth, key = studentKey) {
  return call({ action: 'set', key, value: JSON.stringify(value), auth });
}
{
  const wrong = await readStudent(studentKey, 'senha-errada');
  check('Get com senha inválida oculta ambos os campos privados', !Object.hasOwn(wrong, 'cpf') && !Object.hasOwn(wrong, 'birthDate'));
  const original = await readStudent();
  check('Get autenticado permite leitura dos dados privados', original.cpf === '123.456.789-00' && original.birthDate === '2012-05-01');
  await writeStudent({ ...original, cpf: '', birthDate: 'valor-forjado', score: 96 });
  const preserved = await readStudent();
  check('Autosave público não apaga nem altera dados privados', preserved.cpf === original.cpf && preserved.birthDate === original.birthDate);
  check('Autosave público ainda atualiza progresso', preserved.score === 96);
  await writeStudent({ name: 'Fulano', score: 97 }, teacher);
  const omitted = await readStudent();
  check('Patch autenticado sem campos privados também os preserva', omitted.cpf === original.cpf && omitted.birthDate === original.birthDate);
  await writeStudent({ ...omitted, cpf: 'cpf-ficticio-novo', birthDate: '2013-02-03' }, teacher);
  const changed = await readStudent();
  check('Professor autenticado pode corrigir os dados privados', changed.cpf === 'cpf-ficticio-novo' && changed.birthDate === '2013-02-03');
  const results = await Promise.all([
    writeStudent({ ...original, score: 98 }),
    writeStudent({ ...changed, cpf: '', birthDate: '' }, teacher),
    writeStudent({ ...original, score: 99 }),
  ]);
  check('Salvamentos concorrentes terminam com sucesso', results.every(r => r._body.ok === true));
  await writeStudent(original);
  const cleared = await readStudent();
  check('Autosave antigo não restaura dados removidos pelo professor', cleared.cpf === '' && cleared.birthDate === '');
  const publicRes = await call({ action: 'get', key: studentKey });
  const redacted = JSON.parse(publicRes._body.value);
  check('Campos privados vazios também são omitidos da resposta pública', !Object.hasOwn(redacted, 'cpf') && !Object.hasOwn(redacted, 'birthDate'));
}
{
  const key = 'student:vespertino:CadastroFicticio';
  const created = await writeStudent({ name: 'CadastroFicticio', cpf: 'cpf-ficticio', birthDate: '2012-01-01' }, undefined, key);
  check('Cadastro inicial sem senha continua permitido', created._body.ok === true);
  check('Cadastro inicial mantém dados para o professor', (await readStudent(key)).cpf === 'cpf-ficticio');
  const res = await call({ action: 'get', key });
  check('Cadastro inicial não expõe CPF na leitura pública', !Object.hasOwn(JSON.parse(res._body.value), 'cpf'));
  const emptyKey = 'student:vespertino:SemDados';
  await writeStudent({ name: 'SemDados' }, undefined, emptyKey);
  await writeStudent({ name: 'SemDados', cpf: 'injetado', birthDate: 'injetada' }, undefined, emptyKey);
  const empty = await readStudent(emptyKey);
  check('Cadastro existente não aceita inserção pública de dados privados', !Object.hasOwn(empty, 'cpf') && !Object.hasOwn(empty, 'birthDate'));
  const before = await readStudent(key);
  for (const value of ['null', '[]', '{invalido', '"texto"']) {
    const invalid = await call({ action: 'set', key, value });
    check(`Cadastro inválido rejeitado: ${value}`, invalid._status === 400);
  }
  check('Escritas inválidas não corrompem cadastro existente', JSON.stringify(await readStudent(key)) === JSON.stringify(before));
}

console.log(`\n=== REDAÇÃO DE DADOS SENSÍVEIS EM /api/kv TEST: ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
