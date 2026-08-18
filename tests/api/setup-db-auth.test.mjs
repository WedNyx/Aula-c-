// /api/setup-db abre uma conexão pg de verdade e roda CREATE TABLE/escreve no banco — não tinha
// NENHUMA autenticação antes desta correção, então qualquer um que soubesse a URL podia disparar
// isso à vontade. Confirma que agora exige a senha do professor, com o mesmo atraso crescente por
// tentativa errada usado no resto do painel.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

process.env.KV_REST_API_URL = 'http://localhost:8943';
process.env.KV_REST_API_TOKEN = 'fake-token';
process.env.TEACHER_PASSWORD = 'senha-de-teste-123';
process.env.FAKE_REDIS_PORT = '8943';
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_KEY;

const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env });
await new Promise(r => setTimeout(r, 500));

function mockReq(body, ip = '5.5.5.5') { return { method: 'POST', body, headers: { 'x-forwarded-for': ip }, socket: {} }; }
function mockRes() {
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return res;
}

const { default: setupDbHandler } = await import(pathToFileURL(path.join(__dirname, '../../api/setup-db.js')).href);

// 1) sem "auth" nenhum → bloqueado
{
  const res = mockRes();
  await setupDbHandler(mockReq({}), res);
  check('POST sem auth é bloqueado (403)', res._status === 403, JSON.stringify(res._body));
}

// 2) senha errada → bloqueado
{
  const res = mockRes();
  await setupDbHandler(mockReq({ auth: 'senha-errada' }), res);
  check('POST com senha errada é bloqueado (403)', res._status === 403);
}

// 3) tentativas erradas seguidas do mesmo IP atrasam cada vez mais
{
  const t0 = Date.now();
  await setupDbHandler(mockReq({ auth: 'senha-errada' }), mockRes());
  const d1 = Date.now() - t0;
  const t1 = Date.now();
  await setupDbHandler(mockReq({ auth: 'senha-errada' }), mockRes());
  const d2 = Date.now() - t1;
  check('Atraso cresce a cada tentativa errada seguida', d2 > d1, `d1=${d1}ms d2=${d2}ms`);
}

// 4) senha certa passa da checagem de auth (chega no erro de "Supabase não configurado", não no 403)
{
  const res = mockRes();
  await setupDbHandler(mockReq({ auth: 'senha-de-teste-123' }), res);
  check('POST com a senha certa passa da autenticação (não é mais 403)', res._status !== 403, JSON.stringify(res._body));
  check('POST com a senha certa chega no aviso de Supabase não configurado', res._body?.ok === false && /SUPABASE_URL/.test(res._body?.error || ''), JSON.stringify(res._body));
}

// 5) IP diferente não herda o atraso acumulado pelo IP anterior
{
  const t0 = Date.now();
  await setupDbHandler(mockReq({ auth: 'senha-errada' }, '6.6.6.6'), mockRes());
  const d = Date.now() - t0;
  check('IP novo continua rápido (bloqueio é por IP, não global)', d < 1000, `${d}ms`);
}

console.log(`\n=== AUTENTICAÇÃO DE /api/setup-db: ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
