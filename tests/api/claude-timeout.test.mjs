import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Nenhuma das chamadas a provedores de IA (NVIDIA/OpenRouter/Anthropic) em api/claude.js tinha
// timeout próprio: se o provedor gratuito simplesmente NUNCA respondesse (sem erro, só travado),
// o fetch ficava pendurado até a Vercel matar a função inteira pelo maxDuration (vercel.json) — e
// quem chamou nunca recebia um JSON de erro de verdade, só a página de erro da própria plataforma
// (exatamente o "Reconectando Nyx" travado pra sempre que um professor reportou em produção).
// Agora cada tentativa tem um timeout próprio (AbortSignal), com orçamento dividido entre a
// tentativa principal e a reserva (Anthropic) quando as duas cabem na mesma chamada de função.
process.env.KV_REST_API_URL = '';
process.env.KV_REST_API_TOKEN = '';
process.env.NVIDIA_API_KEY = 'fake-nvidia-key';
process.env.NVIDIA_MODEL = 'meta/llama-3.1-8b-instruct';
process.env.ANTHROPIC_API_KEY = 'fake-anthropic-key';
process.env.OPENROUTER_API_KEY = '';

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

function mockReq(body) { return { method: 'POST', body, headers: { 'x-forwarded-for': '10.0.0.1' }, socket: {} }; }
function mockRes() {
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return res;
}

// simula um provedor que NUNCA responde por conta própria — só "desiste" quando o AbortSignal
// dispara (exatamente como o fetch de verdade se comporta com um provedor travado/sem resposta).
// O timer interno de AbortSignal.timeout() não é "ref'd" (não segura o processo sozinho) — um fetch
// de verdade mantém o event loop vivo através da conexão TCP aberta enquanto espera; aqui, como não
// existe conexão nenhuma, precisamos manter o processo vivo na mão com um intervalo até o abort disparar.
function hangingFetchRespectingAbort(signal) {
  return new Promise((resolve, reject) => {
    const keepAlive = setInterval(() => {}, 200);
    const cleanup = () => clearInterval(keepAlive);
    if (signal) {
      if (signal.aborted) { cleanup(); reject(Object.assign(new Error('The operation was aborted.'), { name: 'TimeoutError' })); return; }
      signal.addEventListener('abort', () => { cleanup(); reject(Object.assign(new Error('The operation was aborted.'), { name: 'TimeoutError' })); });
    }
    // nunca resolve sozinho — só o timeout do próprio código resolve isso
  });
}

const originalFetch = global.fetch;
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('integrate.api.nvidia.com')) {
    return hangingFetchRespectingAbort(opts.signal);
  }
  if (u.includes('api.anthropic.com')) {
    return { ok: true, json: async () => ({ content: [{ type: 'text', text: 'Resposta da Anthropic (reserva)' }] }) };
  }
  throw new Error('fetch inesperado no teste: ' + u);
};

const { default: claudeHandler } = await import(pathToFileURL(path.join(__dirname, '../../api/claude.js')).href);

// 1) NVIDIA travada (nunca responde) + Anthropic configurada como reserva: a função NÃO pode ficar
// pendurada pra sempre — precisa desistir da NVIDIA sozinha (dentro do orçamento da função) e cair
// pra Anthropic, devolvendo uma resposta de verdade em vez do "Reconectando" travado pra sempre.
{
  const t0 = Date.now();
  const req = mockReq({ prompt: 'explica isso', system: 'sistema de teste' });
  const res = mockRes();
  await claudeHandler(req, res);
  const elapsed = Date.now() - t0;

  check('NÃO fica pendurado pra sempre (responde em menos de 20s, não os 30s do maxDuration)', elapsed < 20000, `${elapsed}ms`);
  check('Espera pelo menos o timeout configurado da NVIDIA antes de cair pra reserva (não desiste cedo demais)', elapsed >= 13000, `${elapsed}ms`);
  check('Cai pra Anthropic como reserva e devolve uma resposta de verdade (JSON válido)', res._status !== 500 && Array.isArray(res._body?.content), JSON.stringify(res._body));
  check('O texto devolvido é mesmo o da reserva (Anthropic), confirmando o fallback', res._body?.content?.[0]?.text === 'Resposta da Anthropic (reserva)');
}

// 2) caminho normal (sem nenhum provedor travado) continua rápido — a correção não deixou tudo
// mais lento por padrão, só protege contra o caso de travamento
{
  global.fetch = async (url) => {
    const u = String(url);
    if (u.includes('integrate.api.nvidia.com')) {
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'Resposta rápida da NVIDIA' } }] }) };
    }
    throw new Error('fetch inesperado no teste: ' + u);
  };
  const t0 = Date.now();
  const req = mockReq({ prompt: 'explica isso', system: 'sistema de teste' });
  const res = mockRes();
  await claudeHandler(req, res);
  const elapsed = Date.now() - t0;
  check('Caminho normal (provedor respondendo rápido) continua rápido, sem esperar timeout nenhum', elapsed < 3000, `${elapsed}ms`);
  check('Resposta normal continua correta', res._body?.content?.[0]?.text === 'Resposta rápida da NVIDIA');
}

global.fetch = originalFetch;
console.log(`\n=== NYX NÃO FICA "RECONECTANDO" PRA SEMPRE QUANDO UM PROVEDOR TRAVA: ${pass}/${pass + fail} passed ===`);
process.exit(fail > 0 ? 1 : 0);
