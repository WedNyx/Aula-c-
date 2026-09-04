// Testa direto a lógica de api/auth.js (sem navegador): atraso crescente a cada senha errada
// seguida do mesmo IP, e reset do contador assim que a senha certa é digitada.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

const PORT = 8934;
process.env.KV_REST_API_URL = `http://localhost:${PORT}`;
process.env.KV_REST_API_TOKEN = 'fake-token';
process.env.TEACHER_PASSWORD = 'senha-de-teste-123';
process.env.FAKE_REDIS_PORT = String(PORT);
delete process.env.CRON_SECRET;

const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env });
await new Promise(r => setTimeout(r, 500));

function mockReqRes(password) {
  const req = { method: 'POST', body: { password }, headers: { 'x-forwarded-for': '10.0.0.5' }, socket: {} };
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return { req, res };
}

const { default: handler } = await import(pathToFileURL(path.join(__dirname, '../../api/auth.js')).href);
const { isValidTeacherPassword } = await import(pathToFileURL(path.join(__dirname, '../../api/_teacherAuth.js')).href);

// Sem configuração explícita, nenhuma senha padrão deve existir.
const configuredTeacherPassword = process.env.TEACHER_PASSWORD;
delete process.env.TEACHER_PASSWORD;
check('Sem TEACHER_PASSWORD, autenticação falha fechada', isValidTeacherPassword('M1n3cr@ft2006') === false);
process.env.TEACHER_PASSWORD = configuredTeacherPassword;

// 5 tentativas erradas seguidas — mede se o atraso cresce a cada uma
const delays = [];
for (let i = 0; i < 5; i++) {
  const { req, res } = mockReqRes('senha-errada');
  const t0 = Date.now();
  await handler(req, res);
  delays.push(Date.now() - t0);
  check(`Tentativa ${i + 1} errada: ok:false`, res._body.ok === false);
}
console.log('delays (ms):', delays.map(d => Math.round(d)));
check('Atraso da tentativa 5 é maior que da tentativa 1 (throttling crescente)', delays[4] > delays[0] + 1000, `d1=${delays[0]} d5=${delays[4]}`);
check('Atraso cresce de forma monotônica (cada erro atrasa mais que o anterior)', delays.every((d, i) => i === 0 || d >= delays[i - 1] - 50));

// senha certa reseta o contador — próxima tentativa errada volta a ter atraso baixo
const { req: reqOk, res: resOk } = mockReqRes('senha-de-teste-123');
await handler(reqOk, resOk);
check('Senha certa: ok:true', resOk._body.ok === true);

const { req: reqAfter, res: resAfter } = mockReqRes('senha-errada');
const t0 = Date.now();
await handler(reqAfter, resAfter);
const delayAfterReset = Date.now() - t0;
console.log('delay depois do reset (ms):', Math.round(delayAfterReset));
check('Depois de acertar, o atraso volta a ser baixo (contador resetou)', delayAfterReset < delays[2]);

console.log(`\n=== LOGIN THROTTLE TEST: ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
