import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Alguns modelos gratuitos (principalmente "de raciocínio") passaram a rejeitar o parâmetro
// temperature ("'temperature' is deprecated for this model") — um erro real visto em produção que
// derrubava TODA chamada pra esse modelo, sempre, sem chance de recuperação. Agora, quando esse é
// o erro específico devolvido pelo provedor, a chamada é refeita sozinha sem o campo temperature.
process.env.KV_REST_API_URL = '';
process.env.KV_REST_API_TOKEN = '';
process.env.NVIDIA_API_KEY = 'fake-nvidia-key';
process.env.NVIDIA_MODEL = 'meta/llama-3.1-8b-instruct';
process.env.ANTHROPIC_API_KEY = '';
process.env.OPENROUTER_API_KEY = 'fake-openrouter-key';

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

function mockReq(body) { return { method: 'POST', body, headers: { 'x-forwarded-for': '10.0.0.2' }, socket: {} }; }
function mockRes() {
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return res;
}

const { default: claudeHandler } = await import(pathToFileURL(path.join(__dirname, '../../api/claude.js')).href);

// 1) NVIDIA rejeita "temperature" na 1ª tentativa, mas aceita normalmente sem esse campo — a
// chamada não pode falhar pra sempre por causa disso, precisa se recuperar sozinha
{
  let calls = 0;
  global.fetch = async (url, opts) => {
    calls++;
    const body = JSON.parse(opts.body);
    if ('temperature' in body) {
      return { ok: false, status: 400, json: async () => ({ error: { message: "'temperature' is deprecated for this model." } }) };
    }
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Resposta da NVIDIA sem temperature' } }] }) };
  };

  const req = mockReq({ prompt: 'explica isso', system: 'sistema de teste', provider: 'nvidia' });
  const res = mockRes();
  await claudeHandler(req, res);

  check('Tentou 2x (1ª com temperature falhou, 2ª sem temperature funcionou)', calls === 2, String(calls));
  check('Recupera sozinho e devolve a resposta certa', res._body?.content?.[0]?.text === 'Resposta da NVIDIA sem temperature', JSON.stringify(res._body));
  check('Resposta não é erro (status não é 500/400)', res._status !== 500 && res._status !== 400, String(res._status));
}

// 2) mesmo comportamento pro Laguna (OpenRouter) — o mesmo tipo de erro pode acontecer nele também
{
  let calls = 0;
  global.fetch = async (url, opts) => {
    calls++;
    const body = JSON.parse(opts.body);
    if ('temperature' in body) {
      return { ok: false, status: 400, json: async () => ({ error: { message: "'temperature' is deprecated for this model." } }) };
    }
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Resposta do Laguna sem temperature' } }] }) };
  };

  const req = mockReq({ prompt: 'explica isso', system: 'sistema de teste', provider: 'laguna' });
  const res = mockRes();
  await claudeHandler(req, res);

  check('Laguna: tentou 2x e se recuperou sozinho', calls === 2 && res._body?.content?.[0]?.text === 'Resposta do Laguna sem temperature', JSON.stringify({ calls, body: res._body }));
}

// 3) um erro de temperature que PERSISTE mesmo sem o campo (bem incomum, mas não pode entrar em
// loop infinito) — só tenta 1x sem o campo e desiste, devolvendo o erro normalmente
{
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return { ok: false, status: 400, json: async () => ({ error: { message: "'temperature' is deprecated for this model." } }) };
  };

  const req = mockReq({ prompt: 'explica isso', system: 'sistema de teste', provider: 'nvidia' });
  const res = mockRes();
  await claudeHandler(req, res);

  check('Não entra em loop infinito: no máximo 2 tentativas', calls === 2, String(calls));
  check('Depois de esgotar a retentativa, devolve um erro JSON normal (não trava)', res._status !== 200 && typeof res._body?.error === 'string', JSON.stringify(res._body));
}

// 4) erro comum (chave inválida, sem relação com temperature) NÃO deve disparar a retentativa —
// só o caso específico de "temperature" é tratado, outros erros seguem o caminho normal
{
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return { ok: false, status: 401, json: async () => ({ error: { message: 'invalid api key' } }) };
  };

  const req = mockReq({ prompt: 'explica isso', system: 'sistema de teste', provider: 'nvidia' });
  const res = mockRes();
  await claudeHandler(req, res);

  check('Erro sem relação com temperature: só 1 tentativa (sem retentativa desnecessária)', calls === 1, String(calls));
  check('Devolve o erro de verdade (chave inválida)', res._body?.error?.includes('invalid api key'), JSON.stringify(res._body));
}

console.log(`\n=== NYX SE RECUPERA SOZINHO QUANDO UM MODELO REJEITA "temperature": ${pass}/${pass + fail} passed ===`);
process.exit(fail > 0 ? 1 : 0);
