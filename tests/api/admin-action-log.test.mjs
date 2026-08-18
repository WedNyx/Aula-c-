// Toda ação que exigia a senha do professor (apagar, travar teclado, mudar configuração de turma
// etc.) acontecia sem deixar rastro nenhum — se a senha vazasse ou fosse usada por engano/má-fé, o
// professor não tinha como saber o que foi feito com ela. Agora cada ação protegida bem-sucedida
// fica registrada (ação/chave/IP/quando, nunca o valor em si), consultável só pelo próprio professor.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

const PORT = 8950;
process.env.KV_REST_API_URL = `http://localhost:${PORT}`;
process.env.KV_REST_API_TOKEN = 'fake-token';
process.env.TEACHER_PASSWORD = 'senha-de-teste-123';
process.env.FAKE_REDIS_PORT = String(PORT);

const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env });
await new Promise(r => setTimeout(r, 500));

function mockReq(body, ip = '10.5.0.1') { return { method: 'POST', body, headers: { 'x-forwarded-for': ip }, socket: {} }; }
function mockRes() {
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return res;
}

const { default: kvHandler } = await import(pathToFileURL(path.join(__dirname, '../../api/kv.js')).href);
const AUTH = 'senha-de-teste-123';

// ação protegida sem senha: falha e não é logada
const resNoAuth = mockRes();
await kvHandler(mockReq({ action: 'set', key: 'kbdlock:matutino', value: '1' }), resNoAuth);
check('Ação protegida SEM senha é bloqueada (403)', resNoAuth._status === 403);

// ação protegida COM senha certa: sucesso, deve ficar registrada
const resAuth = mockRes();
await kvHandler(mockReq({ action: 'set', key: 'kbdlock:matutino', value: '1', auth: AUTH }), resAuth);
check('Ação protegida COM senha funciona', resAuth._body.ok === true);

// ação NÃO protegida (aluno salvando o próprio perfil): não deve virar entrada no log
await kvHandler(mockReq({ action: 'set', key: 'student:matutino:Fulano', value: JSON.stringify({ name: 'Fulano', score: 8 }) }), mockRes());

const resLog = mockRes();
await kvHandler(mockReq({ action: 'get_admin_log', auth: AUTH }), resLog);
const entries = resLog._body.actions || [];
check('Log tem exatamente 1 entrada (só a ação protegida que teve sucesso)', entries.length === 1, JSON.stringify(entries));
check('A entrada é a ação certa ("set")', entries[0]?.action === 'set');
check('A entrada é da chave certa ("kbdlock:matutino")', entries[0]?.key === 'kbdlock:matutino');
check('A entrada NÃO guarda o valor em si (só ação/chave/ip/quando)', entries[0]?.value === undefined);
check('A entrada tem o IP de quem fez', entries[0]?.ip === '10.5.0.1');

// consultar o log SEM senha é bloqueado
const resLogNoAuth = mockRes();
await kvHandler(mockReq({ action: 'get_admin_log' }), resLogNoAuth);
check('Consultar o log SEM senha é bloqueado (403)', resLogNoAuth._status === 403);

// consultar o log não gera uma nova entrada nele mesmo (senão cresceria sozinho a cada olhada)
const resLog2 = mockRes();
await kvHandler(mockReq({ action: 'get_admin_log', auth: AUTH }), resLog2);
check('Consultar o log não cria entrada nova nele mesmo', (resLog2._body.actions || []).length === 1, JSON.stringify(resLog2._body.actions));

// ninguém consegue apagar ou forjar o log direto via set/delete sem senha
const resTamperSet = mockRes();
await kvHandler(mockReq({ action: 'set', key: 'adminlog:recent', value: '[]' }), resTamperSet);
check('Forjar o log direto (set) SEM senha é bloqueado (403)', resTamperSet._status === 403);
const resTamperDel = mockRes();
await kvHandler(mockReq({ action: 'delete', key: 'adminlog:recent' }), resTamperDel);
check('Apagar o log direto (delete) SEM senha é bloqueado (403)', resTamperDel._status === 403);

console.log(`\n=== LOG DE AÇÕES ADMINISTRATIVAS (senha do professor deixa rastro): ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
