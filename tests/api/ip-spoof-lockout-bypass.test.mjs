// "x-forwarded-for" pode ter vários IPs (cada proxy no caminho acrescenta o seu) — o PRIMEIRO da
// lista é o que o cliente mandou, ou seja, qualquer um podia escrever esse cabeçalho com o valor
// que quisesse antes de chegar na borda da Vercel. Usar sempre o primeiro entry deixava o
// bloqueio por tentativa errada de senha (loginfail:*) inútil: bastava mandar um IP "novo" a cada
// chute pra nunca acumular falha nenhuma. A Vercel sempre ACRESCENTA a conexão real no FINAL da
// lista — este teste confirma que o bloqueio agora usa o ÚLTIMO valor (ou "x-real-ip", quando
// presente), então forjar o início da lista não escapa mais do atraso crescente.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

const PORT = 8945;
process.env.KV_REST_API_URL = `http://localhost:${PORT}`;
process.env.KV_REST_API_TOKEN = 'fake-token';
process.env.TEACHER_PASSWORD = 'senha-de-teste-123';
process.env.FAKE_REDIS_PORT = String(PORT);

const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env });
await new Promise(r => setTimeout(r, 500));

const { clientIp } = await import('file:///home/user/Aula-c-/api/_ip.js');
const { default: kvHandler } = await import('file:///home/user/Aula-c-/api/kv.js');

function mockRes() {
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return res;
}

// 1) clientIp() usa o ÚLTIMO IP da lista de x-forwarded-for (o que a Vercel acrescentou), não o
// primeiro (que o próprio cliente pode forjar)
{
  const ip = clientIp({ headers: { 'x-forwarded-for': '9.9.9.9, 203.0.113.5' }, socket: {} });
  check('clientIp usa o ÚLTIMO IP da lista, não o primeiro forjável', ip === '203.0.113.5', ip);
}

// 2) "x-real-ip", quando presente, tem prioridade (a Vercel também expõe esse header direto)
{
  const ip = clientIp({ headers: { 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '9.9.9.9, 203.0.113.5' }, socket: {} });
  check('clientIp prioriza x-real-ip quando presente', ip === '203.0.113.9', ip);
}

// 3) forjar um IP DIFERENTE no início da lista, a cada chute de senha, não escapa mais do
// bloqueio: como o ÚLTIMO valor (a "borda" de verdade) é sempre o mesmo, o contador acumula
{
  const guessReq = (fakeFirstIp) => ({
    method: 'POST',
    body: { action: 'delete_by_prefix', prefix: 'student:matutino:', auth: 'senha-errada' },
    headers: { 'x-forwarded-for': `${fakeFirstIp}, 198.51.100.7` }, // 198.51.100.7 é a "borda" real, fixa
    socket: {},
  });

  const t0 = Date.now();
  await kvHandler(guessReq('1.1.1.1'), mockRes());
  const d1 = Date.now() - t0;

  const t1 = Date.now();
  await kvHandler(guessReq('2.2.2.2'), mockRes()); // finge ser outro IP no início — não adianta mais
  const d2 = Date.now() - t1;

  check('Forjar o início do X-Forwarded-For a cada tentativa NÃO escapa do atraso crescente', d2 > d1, `d1=${d1}ms d2=${d2}ms`);
}

console.log(`\n=== IP REAL (NÃO FORJÁVEL) USADO NO BLOQUEIO DE SENHA: ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
