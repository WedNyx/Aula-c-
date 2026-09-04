// A senha da turma de teste e da sala de linguagens deixou de ser comparada no cliente (ficava
// legível no próprio pacote JavaScript) — agora api/shift-auth.js verifica no servidor, com o
// mesmo atraso crescente por IP que api/auth.js já usa para a senha do professor.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

const PORT = 8949;
process.env.KV_REST_API_URL = `http://localhost:${PORT}`;
process.env.KV_REST_API_TOKEN = 'fake-token';
process.env.TEACHER_PASSWORD = 'senha-de-teste-123';
process.env.FAKE_REDIS_PORT = String(PORT);
process.env.TEST_SHIFT_PASSWORD = 'senha-teste-configurada';
process.env.LANG_SHIFT_PASSWORD = 'senha-linguagens-configurada';

const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env });
await new Promise(r => setTimeout(r, 500));

function mockReqRes(shiftId, password, ip = '10.0.0.7') {
  const req = { method: 'POST', body: { shiftId, password }, headers: { 'x-forwarded-for': ip }, socket: {} };
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return { req, res };
}

const { default: handler } = await import(new URL('../../api/shift-auth.js', import.meta.url));

const { req: reqBadShift, res: resBadShift } = mockReqRes('turma-que-nao-existe', 'qualquer-coisa');
await handler(reqBadShift, resBadShift);
check('shiftId inválido é rejeitado (400)', resBadShift._status === 400);

const { req: reqTestOk, res: resTestOk } = mockReqRes('teste', 'senha-teste-configurada');
await handler(reqTestOk, resTestOk);
check('Senha certa da turma de teste: ok:true', resTestOk._body.ok === true);

const { req: reqLangOk, res: resLangOk } = mockReqRes('linguagens', 'senha-linguagens-configurada');
await handler(reqLangOk, resLangOk);
check('Senha certa da sala de linguagens: ok:true', resLangOk._body.ok === true);

const { req: reqCross, res: resCross } = mockReqRes('teste', 'senha-linguagens-configurada');
await handler(reqCross, resCross);
check('Senha da sala de linguagens NÃO destrava a turma de teste', resCross._body.ok === false);

// atraso crescente a cada tentativa errada seguida do mesmo IP
const delays = [];
for (let i = 0; i < 5; i++) {
  const { req, res } = mockReqRes('teste', 'senha-errada', '10.0.0.8');
  const t0 = Date.now();
  await handler(req, res);
  delays.push(Date.now() - t0);
  check(`Tentativa ${i + 1} errada: ok:false`, res._body.ok === false);
}
check('Atraso cresce a cada tentativa errada seguida', delays[4] > delays[0] + 1000, `d1=${delays[0]} d5=${delays[4]}`);

// IP diferente não herda o atraso do outro IP
const { req: reqFreshIp, res: resFreshIp } = mockReqRes('teste', 'senha-errada', '10.0.0.9');
const t0 = Date.now();
await handler(reqFreshIp, resFreshIp);
const freshDelay = Date.now() - t0;
check('IP novo continua rápido (bloqueio é por IP, não global)', freshDelay < delays[2]);

console.log(`\n=== SHIFT-AUTH (senha da turma de teste/sala de linguagens verificada no servidor): ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
