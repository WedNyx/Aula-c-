// A senha do professor (TEACHER_PASSWORD) é verificada em 4 endpoints diferentes (auth.js, kv.js,
// backup.js, setup-db.js), cada um com o mesmo mecanismo de "atraso crescente a cada erro seguido".
// Antes desta correção, cada endpoint guardava seu PRÓPRIO contador de falhas, isolado dos outros
// — um atacante testando a senha contra os 4 endpoints em paralelo (ou revezando entre eles)
// diluía o atraso em ~4x, já que cada um só via 1/4 das tentativas de verdade. Agora todos
// compartilham a mesma chave (loginfail:teacher:<ip>), então o atraso reflete TODAS as tentativas
// erradas contra a senha do professor, não importa por qual endpoint elas passaram.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
delete process.env.CRON_SECRET;

const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env });
await new Promise(r => setTimeout(r, 500));

function mockRes() {
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return res;
}

const { default: authHandler } = await import(pathToFileURL(path.join(__dirname, '../../api/auth.js')).href);
const { default: setupDbHandler } = await import(pathToFileURL(path.join(__dirname, '../../api/setup-db.js')).href);

const IP = '6.6.6.6';

// 4 tentativas erradas seguidas em /api/auth, do mesmo IP
for (let i = 0; i < 4; i++) {
  const req = { method: 'POST', body: { password: 'senha-errada' }, headers: { 'x-forwarded-for': IP }, socket: {} };
  await authHandler(req, mockRes());
}

// primeira tentativa em /api/setup-db, NUNCA falhou antes NESSE endpoint especificamente — mas é o
// MESMO IP que acabou de errar 4x em /api/auth. Se os contadores fossem isolados (bug antigo), essa
// chamada não teria nenhum atraso (bucket próprio ainda zerado). Com o contador compartilhado, ela
// já nasce "carregando" as 4 falhas de /api/auth.
{
  const req = { method: 'POST', body: { auth: 'outra-senha-errada' }, headers: { 'x-forwarded-for': IP }, socket: {} };
  const res = mockRes();
  const t0 = Date.now();
  await setupDbHandler(req, res);
  const elapsed = Date.now() - t0;
  check('1ª tentativa em /api/setup-db já vem atrasada por causa das falhas em /api/auth (contador compartilhado)', elapsed > 1800, `${elapsed}ms`);
  check('E continua negada (senha errada de verdade)', res._status === 403, JSON.stringify(res._body));
}

// um IP DIFERENTE não é afetado pelas falhas do primeiro
{
  const req = { method: 'POST', body: { auth: 'senha-de-teste-123' }, headers: { 'x-forwarded-for': '1.1.1.1' }, socket: {} };
  const res = mockRes();
  const t0 = Date.now();
  await setupDbHandler(req, res);
  const elapsed = Date.now() - t0;
  check('IP diferente continua rápido (bloqueio é por IP, não global)', elapsed < 500, `${elapsed}ms`);
}

console.log(`\n=== SENHA DO PROFESSOR: CONTADOR DE FALHAS COMPARTILHADO ENTRE ENDPOINTS: ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
