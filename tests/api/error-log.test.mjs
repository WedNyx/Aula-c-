// Log de erros de JS (errorlog:recent): qualquer sessão pode registrar um erro sem senha (é
// telemetria, não dado sensível), mas só o professor autenticado pode LER o log agregado. A lista
// nunca cresce sem limite (capa nas últimas ERROR_LOG_MAX entradas) e tem rate limit por IP.
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

// 1) registrar um erro NÃO exige senha (o objetivo é pegar erro de quem nem sabe que precisa avisar)
{
  const req = mockReq({ action: 'log_error', message: 'TypeError: x is not a function', stack: 'at foo.js:10', url: '/aluno', role: 'student' });
  const res = mockRes();
  await kvHandler(req, res);
  check('Registrar erro NÃO exige senha do professor', res._status !== 403 && res._body.ok === true, JSON.stringify(res._body));
}

// 2) ler o log SEM senha é bloqueado
{
  const req = mockReq({ action: 'get_recent_errors' });
  const res = mockRes();
  await kvHandler(req, res);
  check('Ler o log de erros SEM senha é bloqueado (403)', res._status === 403);
}

// 3) ler o log COM senha do professor mostra o erro registrado
{
  const req = mockReq({ action: 'get_recent_errors', auth: 'senha-de-teste-123' });
  const res = mockRes();
  await kvHandler(req, res);
  check('Ler o log COM senha do professor funciona', res._status !== 403 && Array.isArray(res._body.errors));
  check('O erro registrado aparece na lista', res._body.errors.some(e => e.message.includes('TypeError: x is not a function')), JSON.stringify(res._body.errors));
  check('O erro guarda de onde veio (role/url)', res._body.errors.some(e => e.role === 'student' && e.url === '/aluno'));
}

// 3b) "get_recent_errors" com senha errada seguida do mesmo IP atrasa cada vez mais — antes desta
// correção, essa ação verificava a senha na mão, sem passar pelo mesmo atraso/bloqueio por
// tentativa errada que toda outra ação protegida do /api/kv já tinha
{
  const ip = '10.0.0.61';
  const t0 = Date.now();
  await kvHandler(mockReq({ action: 'get_recent_errors', auth: 'senha-errada' }, ip), mockRes());
  const d1 = Date.now() - t0;
  const t1 = Date.now();
  await kvHandler(mockReq({ action: 'get_recent_errors', auth: 'senha-errada' }, ip), mockRes());
  const d2 = Date.now() - t1;
  check('get_recent_errors: atraso cresce a cada tentativa errada seguida do mesmo IP', d2 > d1, `d1=${d1}ms d2=${d2}ms`);
}

// 4) mensagens muito longas são cortadas (não vira um jeito de mandar payload gigante)
{
  const req = mockReq({ action: 'log_error', message: 'x'.repeat(5000), stack: 'y'.repeat(5000), url: '/z'.repeat(500), role: 'teacher' });
  await kvHandler(req, mockRes());
  const readReq = mockReq({ action: 'get_recent_errors', auth: 'senha-de-teste-123' });
  const readRes = mockRes();
  await kvHandler(readReq, readRes);
  const last = readRes._body.errors[0]; // get_recent_errors devolve mais recente primeiro
  check('Mensagem muito longa é cortada em 500 caracteres', last.message.length === 500, `tamanho: ${last.message.length}`);
}

// 5) a lista nunca passa de 50 entradas (fica só com as mais recentes)
{
  for (let i = 0; i < 55; i++) {
    await kvHandler(mockReq({ action: 'log_error', message: `erro em massa #${i}`, url: '/x', role: 'student' }, `10.0.0.${100 + (i % 50)}`), mockRes());
  }
  const readReq = mockReq({ action: 'get_recent_errors', auth: 'senha-de-teste-123' });
  const readRes = mockRes();
  await kvHandler(readReq, readRes);
  check('A lista nunca passa de 50 entradas', readRes._body.errors.length <= 50, `tamanho: ${readRes._body.errors.length}`);
}

// 6) rate limit por IP: muitos registros seguidos do MESMO IP caem no limite
{
  const ip = '10.0.0.99';
  let sawRateLimited = false;
  for (let i = 0; i < 35; i++) {
    const res = mockRes();
    await kvHandler(mockReq({ action: 'log_error', message: `spam ${i}`, url: '/x', role: 'student' }, ip), res);
    if (res._body && res._body.reason === 'rate_limited') sawRateLimited = true;
  }
  check('Muitos registros seguidos do mesmo IP caem no limite', sawRateLimited);
}

console.log(`\n=== LOG DE ERROS EM PRODUÇÃO: ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
