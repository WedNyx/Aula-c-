import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// callNvidiaRaw pode se rechamar sozinha até duas vezes seguidas (retry sem modo de raciocínio,
// depois retry sem "temperature") quando o provedor rejeita esses parâmetros — antes desta correção,
// CADA retentativa abria um AbortSignal.timeout(timeoutMs) do ZERO, com o mesmo orçamento cheio da
// tentativa original. Se o provedor demorasse (não travasse, só fosse LENTO) pra rejeitar cada
// parâmetro, "N tentativas × orçamento cheio" podia estourar o maxDuration da função. Agora as
// retentativas dividem um prazo-limite ÚNICO (deadlineAt) — o tempo total de todas juntas fica
// sempre dentro do orçamento original, com um piso mínimo pra retentativa não nascer fadada a
// estourar na hora. Este teste exercita a NVIDIA principal com orçamento de 14s,
// reservando tempo para a Anthropic se necessário.
process.env.KV_REST_API_URL = '';
process.env.KV_REST_API_TOKEN = '';
process.env.NVIDIA_API_KEY = 'fake-nvidia-key';
process.env.NVIDIA_MODEL = 'nemotron-3-reasoning-8b'; // bate no regex NVIDIA_REASONING
process.env.ANTHROPIC_API_KEY = 'fake-anthropic-key'; // reserva configurada: NVIDIA recebe 14s
process.env.OPENROUTER_API_KEY = '';

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${extra ? ' | ' + extra : ''}`); }
};

function mockReq(body) { return { method: 'POST', body, headers: { 'x-forwarded-for': '10.0.0.5' }, socket: {} }; }
function mockRes() {
  let statusCode = 200;
  const res = { status(c) { statusCode = c; return res; }, json(obj) { res._body = obj; res._status = statusCode; return res; } };
  return res;
}

// espera "delayMs" (simula um provedor LENTO, mas que eventualmente responde) — se o AbortSignal
// disparar antes disso (porque o orçamento que sobrou é menor que o delay), rejeita como um fetch
// de verdade faria, em vez de ignorar o abort e responder do mesmo jeito
function slowRejectingFetch(delayMs, errorBody) {
  return (url, opts = {}) => new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve({ ok: false, status: 400, json: async () => errorBody }), delayMs);
    if (opts.signal) {
      opts.signal.addEventListener('abort', () => {
        clearTimeout(t);
        reject(Object.assign(new Error('The operation was aborted.'), { name: 'TimeoutError' }));
      });
    }
  });
}

const originalFetch = global.fetch;
const { default: claudeHandler } = await import(pathToFileURL(path.join(__dirname, '../../api/claude.js')).href);

// NVIDIA principal com orçamento fixo de 14s.
// 1ª tentativa da NVIDIA (com reasoning) rejeitada em ~4s (erro de reasoning) → retry sem
// reasoning, ainda COM temperature, rejeitado em ~4s (erro de temperature) → retry final sem
// nenhum dos dois, que finalmente teria tempo de sobra pra responder — mas o orçamento da reserva
// (14s) já foi quase todo gasto pelas duas rejeições de 4s cada (~8s), então o que sobra pro
// retry final ainda precisa ser suficiente, e o tempo TOTAL não pode nem chegar perto do dobro/
// triplo de 14s
{
  let nvidiaCalls = 0;
  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('api.anthropic.com')) {
      return { ok: false, status: 500, json: async () => ({ error: { message: 'Anthropic instável no teste' } }) };
    }
    if (u.includes('integrate.api.nvidia.com')) {
      nvidiaCalls++;
      const body = JSON.parse(opts.body);
      if (body.chat_template_kwargs) {
        return slowRejectingFetch(4000, { error: { message: 'reasoning params not supported' } })(url, opts);
      }
      if ('temperature' in body) {
        return slowRejectingFetch(4000, { error: { message: "'temperature' is deprecated for this model." } })(url, opts);
      }
      // 3ª tentativa (sem reasoning, sem temperature): só chega aqui se ainda sobrou orçamento
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'Resposta da NVIDIA na 3ª tentativa' } }] }) };
    }
    throw new Error('fetch inesperado no teste: ' + u);
  };

  const t0 = Date.now();
  const req = mockReq({ prompt: 'explica isso', system: 'sistema de teste' });
  const res = mockRes();
  await claudeHandler(req, res);
  const elapsed = Date.now() - t0;

  check('Chegou a resposta final (não travou nem devolveu erro cru)', res._status !== 500 && Array.isArray(res._body?.content), JSON.stringify(res._body));
  // com o orçamento COMPARTILHADO entre as retentativas da reserva, o tempo total fica bem abaixo
  // do que seria "3 tentativas × 14s (reserva)" (~42s) — o piso mínimo garante que ainda dá pra
  // tentar, mas sem deixar o total se aproximar do maxDuration de 30s da função
  check('Tempo total fica bem dentro do orçamento (não soma um timeout cheio por tentativa)', elapsed < 20000, `${elapsed}ms`);
  check('Fez pelo menos 2 tentativas na NVIDIA (reasoning rejeitado, depois temperature rejeitado)', nvidiaCalls >= 2, String(nvidiaCalls));
}

global.fetch = originalFetch;
console.log(`\n=== RETENTATIVAS ANINHADAS DIVIDEM UM PRAZO ÚNICO (NÃO SOMAM TIMEOUT POR TENTATIVA): ${pass}/${pass + fail} passed ===`);
process.exit(fail > 0 ? 1 : 0);
