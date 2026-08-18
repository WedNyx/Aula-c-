// Testa direto a lógica de api/backup.js (sem navegador): autorização (Cron + senha do
// professor), exclusão de chaves técnicas, listagem e rotação dos backups mais antigos.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

process.env.KV_REST_API_URL = 'http://localhost:8935';
process.env.KV_REST_API_TOKEN = 'fake-token';
process.env.TEACHER_PASSWORD = 'senha-de-teste-123';
process.env.FAKE_REDIS_PORT = '8935';
delete process.env.CRON_SECRET;

const server = spawn('node', [path.join(__dirname, 'fake-redis-server.mjs')], { stdio: 'inherit', env: process.env });
await new Promise(r => setTimeout(r, 500));

function mockReq({ method = 'POST', body = {}, headers = {}, query = {} } = {}) {
  return { method, body, headers, query };
}
function mockRes() {
  let statusCode = 200;
  const res = {
    status(c) { statusCode = c; return res; },
    json(obj) { res._body = obj; res._status = statusCode; return res; },
  };
  return res;
}

const backupHandler = (await import(pathToFileURL(path.join(__dirname, '../../api/backup.js')).href)).default;
const kvHandler = (await import(pathToFileURL(path.join(__dirname, '../../api/kv.js')).href)).default;

// pré-popula o "banco" com algumas chaves via /api/kv, como a app faria de verdade
// (teachermeta: é uma chave protegida — precisa da senha do professor pra gravar, igual na app real)
async function seed(key, value) {
  const req = mockReq({ body: { action: 'set', key, value, auth: 'senha-de-teste-123' } });
  const res = mockRes();
  await kvHandler(req, res);
}
await seed('student:matutino:Fulano', JSON.stringify({ name: 'Fulano', score: 80 }));
await seed('teachermeta:main', JSON.stringify({ city: 'Teste' }));
await seed('ratelimit:claude:1.2.3.4', JSON.stringify({ count: 5 }));
await seed('loginfail:teacher:1.2.3.4', JSON.stringify({ count: 2 }));

// 1) sem autorização nenhuma (nem CRON_SECRET nem senha) → nega, já que é POST (não GET)
{
  const req = mockReq({ body: {} });
  const res = mockRes();
  await backupHandler(req, res);
  check('POST sem autorização nenhuma é negado', res._status === 401, JSON.stringify(res._body));
}

// 2) com a senha do professor no corpo → autoriza e cria o backup
{
  const req = mockReq({ body: { auth: 'senha-de-teste-123' } });
  const res = mockRes();
  await backupHandler(req, res);
  check('POST com senha do professor cria o backup', res._body.ok === true, JSON.stringify(res._body));
  check('Backup NÃO inclui chaves técnicas (ratelimit/loginfail)', res._body.keys === 2, `keys=${res._body.keys}`);
}

// 3) lista os backups (rota de leitura, sem senha)
{
  const req = mockReq({ method: 'GET', query: { list: '1' } });
  const res = mockRes();
  await backupHandler(req, res);
  check('Listagem de backups funciona e mostra o que acabou de ser criado', Array.isArray(res._body.backups) && res._body.backups.length === 1, JSON.stringify(res._body));
}

// 4) com senha errada → nega
{
  const req = mockReq({ body: { auth: 'senha-errada' } });
  const res = mockRes();
  await backupHandler(req, res);
  check('POST com senha errada é negado', res._status === 401);
}

// 4b) tentativas erradas seguidas atrasam cada vez mais (antes disso, este endpoint verificava a
// senha sem NENHUM atraso/bloqueio — só /api/auth e /api/kv tinham essa proteção)
{
  const req1 = mockReq({ headers: { 'x-forwarded-for': '9.9.9.9' }, body: { auth: 'senha-errada' } });
  const t0 = Date.now();
  await backupHandler(req1, mockRes());
  const d1 = Date.now() - t0;
  const req2 = mockReq({ headers: { 'x-forwarded-for': '9.9.9.9' }, body: { auth: 'senha-errada' } });
  const t1 = Date.now();
  await backupHandler(req2, mockRes());
  const d2 = Date.now() - t1;
  check('Tentativa errada seguida do mesmo IP demora mais que a anterior', d2 > d1, `d1=${d1}ms d2=${d2}ms`);
}

// 5) simula um segundo dia: CRON_SECRET configurado, chamada do Cron de verdade (com o header certo)
{
  process.env.CRON_SECRET = 'segredo-do-cron-123';
  const req = mockReq({ body: {}, headers: { authorization: 'Bearer segredo-do-cron-123' } });
  const res = mockRes();
  await backupHandler(req, res);
  check('Chamada do Cron (Authorization: Bearer CRON_SECRET) cria o backup', res._body.ok === true);
}
// e sem o header certo, agora que CRON_SECRET existe, nega mesmo sem senha nenhuma
{
  const req = mockReq({ body: {} });
  const res = mockRes();
  await backupHandler(req, res);
  check('Com CRON_SECRET configurado, chamada sem credencial nenhuma é negada', res._status === 401);
}
// listar os backups (não só criar) também exige credencial — antes disso, o "?list=1" sempre
// devolvia a listagem pra qualquer um, mesmo com CRON_SECRET configurado, sem senha nenhuma
{
  const req = mockReq({ method: 'GET', query: { list: '1' } });
  const res = mockRes();
  await backupHandler(req, res);
  check('Listar backups SEM credencial (com CRON_SECRET configurado) é negado', res._status === 401, JSON.stringify(res._body));
}
{
  const req = mockReq({ method: 'GET', query: { list: '1', auth: 'senha-de-teste-123' } });
  const res = mockRes();
  await backupHandler(req, res);
  check('Listar backups COM a senha do professor continua funcionando', Array.isArray(res._body.backups), JSON.stringify(res._body));
}

// 6) rotação: cria mais backups além do limite (keep=14) e confere que os mais antigos somem
{
  for (let i = 0; i < 15; i++) {
    // muda o "relógio" artificialmente escrevendo direto uma chave backup: com timestamp único
    const req = mockReq({ body: { auth: 'senha-de-teste-123' } });
    const res = mockRes();
    await backupHandler(req, res);
    await new Promise(r => setTimeout(r, 5)); // garante timestamps (chave) diferentes
  }
  // CRON_SECRET já está configurado (desde o passo 5) — listar agora exige credencial, igual criar
  const req = mockReq({ method: 'GET', query: { list: '1', auth: 'senha-de-teste-123' } });
  const res = mockRes();
  await backupHandler(req, res);
  check('Rotação mantém no máximo 14 backups guardados', res._body.backups.length <= 14, `total=${res._body.backups.length}`);
}

console.log(`\n=== BACKUP AUTOMÁTICO TEST: ${pass}/${pass + fail} passed ===`);
server.kill();
process.exit(fail > 0 ? 1 : 0);
