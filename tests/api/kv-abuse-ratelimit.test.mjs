// "set"/"get"/"delete"/"list_with_values" nunca tiveram NENHUM limite de uso, mesmo sendo o
// coração de todo o app — um bug em loop (ou um script malicioso) conseguia martelar o banco sem
// nenhum freio. Confirma que cada ação agora tem seu próprio limite por IP (generoso, só pra barrar
// um loop descontrolado — bem acima do que uma sala de aula inteira gera por minuto).
// Em vez de disparar centenas/milhares de chamadas de verdade (lento), pré-carrega o contador do
// limitador direto na chave que ele mesmo usa (mesmo formato de rateLimitCheck em api/kv.js) e
// confirma que a chamada seguinte já cai no 429 — e que OUTRO IP não é afetado.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

const PORT = 8944;
process.env.KV_REST_API_URL = `http://localhost:${PORT}`;
process.env.KV_REST_API_TOKEN = 'fake-token';
process.env.TEACHER_PASSWORD = 'senha-de-teste-123';
process.env.FAKE_REDIS_PORT = String(PORT);

const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env });
await new Promise(r => setTimeout(r, 500));

function mockReq(body, ip) { return { method: 'POST', body, headers: { 'x-forwarded-for': ip }, socket: {} }; }
function mockRes() {
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return res;
}

const { default: kvHandler } = await import(pathToFileURL(path.join(__dirname, '../../api/kv.js')).href);

async function seedBucket(bucket, ip, count) {
  const key = `ratelimit:${bucket}:${ip}`;
  const value = JSON.stringify({ count, resetAt: Date.now() + 60000 });
  await kvHandler(mockReq({ action: 'set', key, value }, '0.0.0.1'), mockRes());
}

const CASES = [
  { bucket: 'kvset', max: 600, action: () => ({ action: 'set', key: 'duel:matutino:A__B', value: '1' }) },
  { bucket: 'kvget', max: 1200, action: () => ({ action: 'get', key: 'student:matutino:Ninguem' }) },
  { bucket: 'kvdelete', max: 300, action: () => ({ action: 'delete', key: 'duel:matutino:A__B' }) },
  { bucket: 'kvlist', max: 300, action: () => ({ action: 'list_with_values', prefix: 'duel:matutino:' }) },
];

for (const { bucket, max, action } of CASES) {
  const ip = `7.7.7.${Math.floor(Math.random() * 200) + 1}`;
  // já no limite: a PRÓXIMA chamada estoura
  await seedBucket(bucket, ip, max);
  const res = mockRes();
  await kvHandler(mockReq(action(), ip), res);
  check(`${bucket}: cai no limite (429) depois de ${max} chamadas do mesmo IP`, res._status === 429, JSON.stringify(res._body));

  // outro IP, do zero, continua liberado normalmente
  const otherIp = `8.8.8.${Math.floor(Math.random() * 200) + 1}`;
  const res2 = mockRes();
  await kvHandler(mockReq(action(), otherIp), res2);
  check(`${bucket}: um IP diferente não é afetado pelo limite do outro`, res2._status !== 429, JSON.stringify(res2._body));
}

console.log(`\n=== LIMITE DE USO DE set/get/delete/list_with_values POR IP: ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
