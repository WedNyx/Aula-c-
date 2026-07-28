// Ação protegida do /api/kv (ex: "delete", "set" em prefixo do professor) com senha errada
// repetida do mesmo IP precisa atrasar cada vez mais — igual ao throttle do /api/auth — porque
// nada impedia alguém de pular a tela de login e chutar a senha direto no campo "auth" desse
// endpoint, sem cair em nenhum atraso.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

const PORT = 8937;
process.env.KV_REST_API_URL = `http://localhost:${PORT}`;
process.env.KV_REST_API_TOKEN = 'fake-token';
process.env.TEACHER_PASSWORD = 'senha-de-teste-123';
process.env.FAKE_REDIS_PORT = String(PORT);

const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env });
await new Promise(r => setTimeout(r, 500));

function mockReq(body) { return { method: 'POST', body, headers: { 'x-forwarded-for': '10.0.0.9' }, socket: {} }; }
function mockRes() {
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return res;
}

const { default: kvHandler } = await import('file:///home/user/Aula-c-/api/kv.js');

// primeira tentativa com senha errada numa ação protegida (delete_by_prefix é sempre protegida) —
// não tem falha anterior desse IP ainda, então não deve atrasar por muito tempo
{
  const req = mockReq({ action: 'delete_by_prefix', prefix: 'student:matutino:', auth: 'senha-errada' });
  const res = mockRes();
  const t0 = Date.now();
  await kvHandler(req, res);
  const d0 = Date.now() - t0;
  check('1ª tentativa errada: bloqueada (403)', res._status === 403);
  check('1ª tentativa errada: sem atraso longo (sem falha anterior ainda)', d0 < 1000, `${d0}ms`);
}

// mais 4 tentativas erradas seguidas — mede se o atraso cresce a cada uma
const delays = [];
for (let i = 0; i < 4; i++) {
  const req = mockReq({ action: 'delete_by_prefix', prefix: 'student:matutino:', auth: 'senha-errada' });
  const res = mockRes();
  const t0 = Date.now();
  await kvHandler(req, res);
  delays.push(Date.now() - t0);
  check(`Tentativa extra ${i + 1}: continua bloqueada (403)`, res._status === 403);
}
console.log('delays (ms):', delays.map(d => Math.round(d)));
check('Atraso cresce (throttling) entre a 1ª e a última tentativa errada', delays[3] > delays[0] + 500, `d1=${delays[0]} d4=${delays[3]}`);

// senha certa reseta o contador — e não deve sofrer nenhum atraso artificial fora do throttle
{
  const req = mockReq({ action: 'delete_by_prefix', prefix: 'student:matutino:', auth: 'senha-de-teste-123' });
  const res = mockRes();
  await kvHandler(req, res);
  check('Senha certa: ação passa (não é mais 403)', res._status !== 403, JSON.stringify(res._body));
}

// depois de acertar, o contador zerou — próxima tentativa errada volta a ter atraso baixo
{
  const req = mockReq({ action: 'delete_by_prefix', prefix: 'student:matutino:', auth: 'senha-errada' });
  const res = mockRes();
  const t0 = Date.now();
  await kvHandler(req, res);
  const delayAfterReset = Date.now() - t0;
  console.log('delay depois do reset (ms):', Math.round(delayAfterReset));
  check('Depois de acertar, o atraso volta a ser baixo (contador resetou)', delayAfterReset < delays[2]);
}

// uma ação NÃO protegida (ex: "get") nunca é afetada pelo throttle, mesmo sem "auth" nenhum
{
  const req = mockReq({ action: 'get', key: 'student:matutino:Ninguem' });
  const res = mockRes();
  const t0 = Date.now();
  await kvHandler(req, res);
  const d = Date.now() - t0;
  check('Ação não-protegida ("get") nunca é atrasada pelo throttle', d < 1000, `${d}ms`);
}

console.log(`\n=== THROTTLE DE AÇÃO PROTEGIDA EM /api/kv TEST: ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
